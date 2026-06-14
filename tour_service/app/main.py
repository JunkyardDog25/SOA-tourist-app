from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.grpc.tour_server import start_grpc_server
from app.observability import (
    expose_prometheus_metrics,
    instrument_fastapi_app,
    shutdown_observability,
    setup_observability,
)
from app.routes.tour_routes import router as tour_router
from app.routes.review_routes import router as review_router
from app.routes.simulator_routes import router as simulator_router
from app.routes.execution_routes import router as execution_router
from app.routes.saga_routes import router as saga_router


setup_observability()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    grpc_server = await start_grpc_server(settings.GRPC_SERVER_PORT)
    try:
        yield
    finally:
        await grpc_server.stop(grace=5)
        shutdown_observability()
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="Tour Service",
    description="Mikroservis za upravljanje turama, kljucnim tackama i recenzijama",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - dozvoli komunikaciju sa ostalim servisima i gateway-em
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_http_request(request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000

    if request.url.path != "/metrics":
        logger.info(
            "HTTP request method=%s path=%s status_code=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

    return response


# Registracija ruta
app.include_router(tour_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")
app.include_router(execution_router, prefix="/api")
app.include_router(saga_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tour-service"}


instrument_fastapi_app(app)
expose_prometheus_metrics(app)
