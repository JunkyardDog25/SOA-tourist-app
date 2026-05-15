from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://mongo-tour:27017"
    MONGO_DB: str = "tour_db"
    JWT_SECRET: str = "d5c488849dc70c5c9dc6ba874fed868730cc963f5d26c7b2c3c68af10fbbe2dd"
    JWT_ALGORITHM: str = "HS256"


settings = Settings()
