from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://mongo-tour:27017"
    MONGO_DB: str = "tour_db"
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    GRPC_SERVER_PORT: int = 9092
    PURCHASE_SERVICE_URL: str = "http://purchase-service:8080"


settings = Settings()
