import logging
import os

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.grpc import (
    GrpcAioInstrumentorClient,
    GrpcAioInstrumentorServer,
)
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_fastapi_instrumentator import Instrumentator


_observability_configured = False
_fastapi_instrumented = False
_prometheus_instrumented = False
_tracer_provider: TracerProvider | None = None


def setup_observability() -> None:
    """Configure logging and OpenTelemetry exporters before the app is created."""
    global _observability_configured, _tracer_provider
    if _observability_configured:
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "tour-service")
    LoggingInstrumentor().instrument(set_logging_format=False)
    otel_record_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = otel_record_factory(*args, **kwargs)
        span_context = trace.get_current_span().get_span_context()

        record.otelServiceName = getattr(record, "otelServiceName", service_name)
        if span_context.is_valid:
            record.otelTraceID = f"{span_context.trace_id:032x}"
            record.otelSpanID = f"{span_context.span_id:016x}"
        else:
            record.otelTraceID = getattr(record, "otelTraceID", "0" * 32)
            record.otelSpanID = getattr(record, "otelSpanID", "0" * 16)

        return record

    logging.setLogRecordFactory(record_factory)
    logging_format = (
        "%(asctime)s level=%(levelname)s service=%(otelServiceName)s "
        "logger=%(name)s otelTraceID=%(otelTraceID)s "
        "otelSpanID=%(otelSpanID)s message=%(message)s"
    )

    logging.basicConfig(level=logging.INFO, format=logging_format, force=True)

    resource = Resource.create({"service.name": service_name})
    tracer_provider = TracerProvider(resource=resource)
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://tempo:4317")
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True))
    )
    trace.set_tracer_provider(tracer_provider)
    _tracer_provider = tracer_provider

    HTTPXClientInstrumentor().instrument()
    GrpcAioInstrumentorClient().instrument()
    GrpcAioInstrumentorServer().instrument()
    PymongoInstrumentor().instrument()

    _observability_configured = True


def shutdown_observability() -> None:
    """Flush and stop span processors during application shutdown."""
    if _tracer_provider is not None:
        _tracer_provider.shutdown()


def instrument_fastapi_app(app: FastAPI) -> None:
    """Attach OpenTelemetry middleware after the FastAPI app exists."""
    global _fastapi_instrumented
    if _fastapi_instrumented:
        return

    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=trace.get_tracer_provider(),
        excluded_urls="/metrics",
    )
    _fastapi_instrumented = True


def expose_prometheus_metrics(app: FastAPI) -> None:
    """Expose Prometheus metrics on /metrics."""
    global _prometheus_instrumented
    if _prometheus_instrumented:
        return

    Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=False,
        excluded_handlers=["/metrics"],
    ).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    _prometheus_instrumented = True
