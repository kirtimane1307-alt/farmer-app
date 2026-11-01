"""Core application configuration using Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application runtime settings loaded from environment or .env file."""

    PROJECT_NAME: str = "Farm Management System API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database Settings (Configured for Phase 2 integration)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/farm_db"

    # Security & Auth Settings (To be expanded in Phase 4)
    SECRET_KEY: str = "farm-management-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS Allowed Origins
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert comma-separated CORS origins into a Python list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
