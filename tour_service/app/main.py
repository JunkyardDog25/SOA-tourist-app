from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routes.tour_routes import router as tour_router
from app.routes.review_routes import router as review_router
from app.routes.simulator_routes import router as simulator_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
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

# Registracija ruta
app.include_router(tour_router,prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(simulator_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tour-service"}
