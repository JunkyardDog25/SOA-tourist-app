# KT4 Observability dokumentacija

Ovo je dokumentacija za observability deo projekta. Pisao sam je kao podsetnik za pokretanje i za odbranu KT4 zadatka. Ideja je da imamo tracing, agregaciju logova i monitoring metrika za mikroservisnu aplikaciju. Instrumentacija je uradjena na `tour-service` (Python/FastAPI) i `auth-service` (Spring Boot).

## Sta je implementirano

U projektu je dodat Grafana observability stack:

- `Prometheus` skuplja metrike.
- `Grafana` prikazuje metrike, logove i trace-ove.
- `Tempo` cuva trace-ove iz `tour-service` i `auth-service`.
- `Loki` cuva agregirane logove iz Docker kontejnera.
- `Promtail` cita Docker logove i salje ih u Loki.
- `cAdvisor` daje metrike Docker kontejnera.
- `node-exporter` daje metrike Docker/WSL Linux sloja.
- `windows_exporter` daje metrike prave Windows host masine.

Glavni tok je:

```text
tour-service -> OpenTelemetry -> Tempo -> Grafana
auth-service -> OpenTelemetry -> Tempo -> Grafana
Docker logs -> Promtail -> Loki -> Grafana
tour-service /metrics -> Prometheus -> Grafana
auth-service /api/auth/actuator/prometheus -> Prometheus -> Grafana
cAdvisor/node-exporter/windows_exporter -> Prometheus -> Grafana
```

## Fajlovi koji su bitni

Najbitniji fajlovi za observability su:

- `docker-compose.yml` - dodati su servisi za Prometheus, Grafana, Loki, Promtail, Tempo, cAdvisor i node-exporter.
- `observability/prometheus/prometheus.yml` - Prometheus scrape konfiguracija.
- `observability/loki/loki-config.yml` - Loki konfiguracija.
- `observability/promtail/promtail-config.yml` - Promtail konfiguracija za Docker service discovery.
- `observability/tempo/tempo.yml` - Tempo konfiguracija za trace storage.
- `observability/grafana/provisioning/datasources/datasources.yml` - automatsko dodavanje Prometheus, Loki i Tempo datasource-ova.
- `observability/grafana/provisioning/dashboards/dashboards.yml` - automatsko ucitavanje dashboard-a.
- `observability/grafana/dashboards/kt4-observability-overview.json` - glavni dashboard za KT4.
- `tour_service/app/observability.py` - OpenTelemetry, logging i Prometheus setup za Tour servis.
- `tour_service/app/main.py` - FastAPI aplikacija, `/metrics`, request logging i shutdown tracing-a.
- `tour_service/requirements.txt` - dodate i pinovane observability biblioteke.
- `auth_service/pom.xml` - `spring-boot-starter-opentelemetry` i `micrometer-registry-prometheus`.
- `auth_service/src/main/resources/application.properties` - tracing, Prometheus actuator i log korelacija.
- `auth_service/src/main/java/com/soa/authService/configuration/HttpRequestLoggingFilter.java` - HTTP request logovi.

## Portovi

Kada se sve pokrene, koriste se ovi portovi:

- `http://localhost:3001` - Grafana
- `http://localhost:9090` - Prometheus
- `http://localhost:3100` - Loki
- `http://localhost:3200` - Tempo
- `http://localhost:8089` - cAdvisor
- `http://localhost:9100` - node-exporter
- `http://localhost:8084` - tour-service
- `http://localhost:9182` - windows_exporter na Windows hostu

Grafana je na portu `3001`, a ne na `3000`, zato sto frontend vec koristi `3000`.

## Pokretanje celog sistema

Iz root foldera projekta pokrece se:

```bash
docker compose up -d --build
```

Ako hocu da vidim logove:

```bash
docker compose logs -f
```

Ako hocu samo logove Tour servisa:

```bash
docker compose logs -f tour-service
```

Ako hocu samo observability servise:

```bash
docker compose logs -f prometheus grafana loki promtail tempo
```

Ako treba da se ugasi sistem:

```bash
docker compose down
```

Ako treba da se obrisu i observability volume-i, to se radi samo ako stvarno hocemo cist start:

```bash
docker compose down -v
```

## Windows exporter

Za KT4 je bitno da se prate metrike host masine: CPU, RAM, fajl sistem i mreza. Posto se projekat pokrece na Windows masini preko Docker Desktop-a, `node-exporter` ne meri pravi Windows host, nego Docker/WSL Linux sloj.

Zato je dodat `windows_exporter`, koji mora da se instalira direktno na Windows host.

Koraci:

1. Skinuti `windows_exporter` MSI sa GitHub release stranice projekta `prometheus-community/windows_exporter`.
2. Instalirati ga na Windows.
3. Ukljuciti collector-e:

```text
cpu,memory,logical_disk,net,os
```

4. Proveriti u browseru:

```text
http://localhost:9182/metrics
```

Ako radi, treba da se vidi veliki tekstualni output sa metrikama. Bitne metrike za dashboard su npr:

- `windows_cpu_time_total`
- `windows_memory_available_bytes`
- `windows_os_visible_memory_bytes`
- `windows_logical_disk_free_bytes`
- `windows_logical_disk_size_bytes`
- `windows_net_bytes_received_total`
- `windows_net_bytes_sent_total`

Prometheus iz Docker-a ne gadja `localhost:9182`, nego:

```text
host.docker.internal:9182
```

Ako `windows_exporter` nije instaliran ili nije pokrenut, Prometheus target `windows-exporter` ce biti `DOWN`. To nije greska u Docker stack-u, nego znaci da Windows agent nije dostupan.

## Provera Prometheus targeta

Prometheus targeti se proveravaju ovde:

```text
http://localhost:9090/targets
```

Ocekivano je da budu `UP`:

- `prometheus`
- `tour-service`
- `auth-service`
- `cadvisor`
- `node-exporter`

I jos treba da bude `UP`:

- `windows-exporter`

ali tek kada je instaliran i pokrenut Windows exporter na host masini.

Moze i preko komande:

```bash
curl http://localhost:9090/api/v1/targets
```

## Metrike aplikacije

Tour servis izbacuje Prometheus metrike na:

```text
http://localhost:8084/metrics
```

Tu se vide metrike koje pravi `prometheus-fastapi-instrumentator`, npr. broj request-ova i trajanje request-ova.

Za test moze da se pozove:

```bash
curl http://localhost:8084/health
```

Posle nekoliko poziva, u Grafani treba da se vidi porast request rate-a za `tour-service`.

Auth servis izbacuje Prometheus metrike na:

```text
http://auth-service:8080/api/auth/actuator/prometheus
```

Spring Boot koristi `http_server_requests_seconds_*` metrike. Za test kroz gateway:

```bash
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test\"}"
```

## Tracing

### Tour service

Tracing je implementiran u `tour-service` pomocu OpenTelemetry biblioteka.

Ukratko:

- FastAPI request pravi span.
- HTTPX pozivi se instrumentisu automatski.
- gRPC je instrumentisan.
- PyMongo/Motor tracing je dodat kao bonus.
- Trace-ovi se salju u Tempo preko OTLP gRPC endpoint-a `tempo:4317`.

Env promenljive u `docker-compose.yml` za Tour servis:

```yaml
OTEL_SERVICE_NAME: tour-service
OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4317
OTEL_EXPORTER_OTLP_PROTOCOL: grpc
OTEL_PYTHON_LOG_CORRELATION: "true"
```

Tempo UI se ne koristi direktno kao poseban UI, nego se trace-ovi gledaju kroz Grafanu.

Provera iz browsera:

```text
http://localhost:3200/ready
```

Treba da vrati:

```text
ready
```

U Grafani se trace-ovi gledaju kroz datasource `Tempo`, ili preko dashboard panela `Tour Service Traces`.

### Auth service

Tracing je implementiran u `auth-service` pomocu `spring-boot-starter-opentelemetry`.

Ukratko:

- HTTP request-ovi prave span-ove preko Micrometer Observation API-ja.
- Trace-ovi se salju u Tempo preko OTLP HTTP endpoint-a `http://tempo:4318/v1/traces`.
- Logovi sadrze `otelTraceID` i `otelSpanID` iz MDC-a (`traceId` / `spanId`).

Env promenljive u `docker-compose.yml` za Auth servis:

```yaml
OTEL_SERVICE_NAME: auth-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: http://tempo:4318/v1/traces
```

U Grafani se trace-ovi gledaju kroz panel `Auth Service Traces`, a logovi kroz `Auth Service Logs`.

Loki upit za auth logove:

```logql
{service="auth-service"}
```

## Logovi

Logovi se ne salju direktno iz Python koda u Loki. Umesto toga:

1. Aplikacije pisu logove na stdout/stderr.
2. Docker cuva te logove.
3. Promtail preko Docker socket-a automatski pronalazi kontejnere.
4. Promtail salje logove u Loki.
5. Grafana cita logove iz Loki-ja.

Promtail koristi `docker_sd_configs`, sto znaci da automatski vidi Docker kontejnere i dobija njihove label-e.

Bitne label-e u Loki-ju su:

- `service`
- `container`
- `compose_project`
- `stream`

Za Tour servis query u Grafani je:

```logql
{service="tour-service"}
```

Za logove koji imaju trace ID:

```logql
{service="tour-service"} |= "otelTraceID"
```

## Korelacija logova i trace-ova

Ovo je bitan deo za demo.

Tour servis u logovima ispisuje:

```text
otelTraceID=<trace_id>
otelSpanID=<span_id>
```

Primer log linije:

```text
level=INFO service=tour-service logger=app.main otelTraceID=f34a45cc997ce0e27f215c57d7ec91d3 otelSpanID=8f02cb897a68d288 message=HTTP request method=GET path=/health status_code=200
```

U Grafana Loki datasource-u je dodat `derivedFields`, koji iz log linije izvlaci `otelTraceID` i linkuje ga na Tempo.

To znaci da na odbrani mogu da pokazem:

1. Otvorim Grafanu.
2. Otvorim logove za `tour-service`.
3. Nadjem log koji ima `otelTraceID`.
4. Kliknem na `TraceID`.
5. Grafana otvara odgovarajuci trace u Tempo datasource-u.

Dodatno je podesen i smer trace -> logs preko Tempo datasource-a:

```logql
{service="tour-service"} |= "$${__span.traceId}"
```

Tako je pokriveno i ako se prvo udje u trace, pa se odatle traze logovi.

## Grafana

Grafana se otvara na:

```text
http://localhost:3001
```

Login:

```text
username: admin
password: admin
```

Datasource-ovi se automatski dodaju:

- `Prometheus`
- `Loki`
- `Tempo`

Dashboard se automatski ucitava:

```text
KT4 Observability Overview
```

Na tom dashboard-u postoje paneli za:

- Prometheus target dostupnost
- Tour HTTP request rate
- Tour HTTP p95 latency
- Host CPU
- Host RAM
- Host filesystem
- Host network
- Container CPU
- Container RAM
- Container network
- Container filesystem
- Tour service logs
- Tour service traces

## Sta prikazati na odbrani

Moj predlog za demo redosled:

1. Pokazati da je Docker stack pokrenut:

```bash
docker compose ps
```

2. Pokazati Prometheus targete:

```text
http://localhost:9090/targets
```

3. Pokazati da `tour-service` radi:

```text
http://localhost:8084/health
```

4. Pokazati da `tour-service` ima Prometheus metrike:

```text
http://localhost:8084/metrics
```

5. Otvoriti Grafanu:

```text
http://localhost:3001
```

6. Otvoriti dashboard:

```text
KT4 Observability Overview
```

7. Poslati nekoliko zahteva:

```bash
curl http://localhost:8084/health
curl http://localhost:8084/health
curl http://localhost:8084/health
```

8. Pokazati u dashboard-u:

- request rate za Tour servis;
- p95 latency;
- container CPU/RAM/network/filesystem;
- host CPU/RAM/network/filesystem;
- logove iz Loki-ja;
- trace-ove iz Tempo-a.

9. Pokazati korelaciju:

- u Loki panelu otvoriti log za `tour-service`;
- kliknuti na `TraceID`;
- pokazati trace u Tempo-u.

## Kratka provera komandama

Provera Tour health-a:

```bash
curl http://localhost:8084/health
```

Provera Tour metrika:

```bash
curl http://localhost:8084/metrics
```

Provera Loki-ja:

```bash
curl http://localhost:3100/ready
```

Provera Tempo-a:

```bash
curl http://localhost:3200/ready
```

Provera Prometheus targeta:

```bash
curl http://localhost:9090/api/v1/targets
```

Provera Docker servisa:

```bash
docker compose ps
```

## Ako nesto ne radi

Ako Grafana ne radi:

- proveriti da li je port `3001` slobodan;
- proveriti `docker compose logs grafana`;
- proveriti da li su provisioning fajlovi mountovani.

Ako Prometheus target `windows-exporter` stoji `DOWN`:

- proveriti da li je instaliran `windows_exporter`;
- proveriti `http://localhost:9182/metrics`;
- proveriti da Windows firewall ne blokira port `9182`;
- proveriti da Prometheus koristi `host.docker.internal:9182`.

Ako nema logova u Loki-ju:

- proveriti `docker compose logs promtail`;
- proveriti da Promtail ima mountovan Docker socket;
- proveriti query `{service="tour-service"}`;
- proveriti da aplikacija stvarno pise logove.

Ako nema trace-ova:

- proveriti da je Tempo `ready`;
- proveriti `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317`;
- poslati par request-ova na `tour-service`;
- sacekati nekoliko sekundi jer se spanovi salju u batch-evima.

Ako nema metrika za Tour servis:

- otvoriti `http://localhost:8084/metrics`;
- proveriti Prometheus target `tour-service`;
- proveriti da `tour-service` kontejner radi.

## Napomena za resurse

Ovaj stack moze da trosi dosta RAM memorije jer pored aplikacije rade jos Prometheus, Grafana, Loki, Tempo, cAdvisor, Promtail i exporteri.

Zato su u Compose fajlu dodati `mem_limit` limiti za observability servise i kratko cuvanje podataka:

- Prometheus retention: `48h`
- Loki retention: `48h`
- Tempo local storage: lokalni demo storage

To je dovoljno za odbranu i lokalni rad.

## Zakljucak

Ovim je za KT4 pokriveno:

- tracing u mikroservisnoj aplikaciji preko `tour-service` i `auth-service`, OpenTelemetry-ja i Tempo-a;
- agregacija logova preko Promtail-a, Loki-ja i Grafane;
- aplikacione metrike preko Prometheus endpoint-a (`/metrics` i `/actuator/prometheus`);
- metrike kontejnera preko cAdvisor-a;
- metrike Docker/WSL sloja preko node-exporter-a;
- metrike prave Windows host masine preko windows_exporter-a.

Najbitniji deo za demonstraciju je Grafana dashboard `KT4 Observability Overview`, jer se tu na jednom mestu vide metrike, logovi i trace-ovi.
