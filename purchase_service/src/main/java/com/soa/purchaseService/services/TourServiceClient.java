package com.soa.purchaseService.services;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.soa.purchaseService.configuration.AuthForwardingInterceptor;
import com.soa.purchaseService.dtos.RecordPurchasesRequest;
import com.soa.purchaseService.dtos.RecordPurchasesResponse;
import com.soa.purchaseService.dtos.TourValidationRequest;
import com.soa.purchaseService.dtos.TourValidationResponse;
import com.soa.purchaseService.exceptions.TourServiceException;

@Component
public class TourServiceClient {

    private static final Logger log = LoggerFactory.getLogger(TourServiceClient.class);

    private final RestClient restClient;

    public TourServiceClient(
            @Value("${tour.service.url}") String tourServiceUrl,
            @Value("${tour.service.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${tour.service.read-timeout-ms:5000}") int readTimeoutMs,
            AuthForwardingInterceptor authForwardingInterceptor) {

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        this.restClient = RestClient.builder()
                .baseUrl(tourServiceUrl)
                .requestFactory(factory)
                .requestInterceptor(authForwardingInterceptor)
                .build();
    }

    /**
     * Calls POST /api/tours/validate-batch on tour-service.
     *
     * @throws TourServiceException on non-2xx or network failure
     */
    public TourValidationResponse validateBatch(TourValidationRequest request) {
        try {
            return restClient.post()
                    .uri("/api/tours/validate-batch")
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        throw new TourServiceException(
                                "tour-service validate-batch returned HTTP " + resp.getStatusCode().value());
                    })
                    .body(TourValidationResponse.class);
        } catch (TourServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Network error calling tour-service validate-batch: {}", e.getMessage());
            throw new TourServiceException("tour-service unreachable: " + e.getMessage(), e);
        }
    }

    /**
     * Calls POST /api/tours/purchases/record on tour-service (SAGA step 1).
     *
     * @throws TourServiceException on non-2xx or network failure
     */
    public RecordPurchasesResponse recordPurchases(RecordPurchasesRequest request) {
        try {
            return restClient.post()
                    .uri("/api/tours/purchases/record")
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        throw new TourServiceException(
                                "tour-service record-purchases returned HTTP " + resp.getStatusCode().value());
                    })
                    .body(RecordPurchasesResponse.class);
        } catch (TourServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("Network error calling tour-service record-purchases: {}", e.getMessage());
            throw new TourServiceException("tour-service unreachable: " + e.getMessage(), e);
        }
    }

    /**
     * Calls DELETE /api/tours/purchases/record/{sagaId} on tour-service (compensation for step 1).
     * Best-effort: does not throw so the compensation chain can continue.
     */
    public void deletePurchaseRecords(String sagaId) {
        try {
            restClient.delete()
                    .uri("/api/tours/purchases/record/{sagaId}", sagaId)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        log.warn("tour-service delete-purchase-records for sagaId={} returned HTTP {}",
                                sagaId, resp.getStatusCode().value());
                    })
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to compensate step1 (deletePurchaseRecords) for sagaId={}: {}", sagaId, e.getMessage());
        }
    }
}
