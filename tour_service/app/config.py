from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://mongo-tour:27017"
    MONGO_DB: str = "tour_db"
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    GRPC_SERVER_PORT: int = 9092
    PURCHASE_SERVICE_URL: str = "http://purchase-service:8080"
    PURCHASE_SERVICE_GRPC_HOST: str = "purchase-service"
    PURCHASE_SERVICE_GRPC_PORT: int = 9093
    KEYPOINT_PROXIMITY_RADIUS_KM: float = 0.05


settings = Settings()
