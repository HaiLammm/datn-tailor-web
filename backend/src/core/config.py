"""Application configuration loaded from environment variables."""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration for the Tailor Project Backend."""

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tailor_project"
    )
    OWNER_EMAIL: str = os.getenv("OWNER_EMAIL", "admin@tailor.local")

    # JWT Settings - NO DEFAULT for security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    def __post_init__(self) -> None:
        """Validate critical settings after initialization."""
        if not self.JWT_SECRET_KEY:
            raise ValueError(
                "JWT_SECRET_KEY must be set in environment variables. "
                "NEVER use a hardcoded default in production!"
            )

settings = Settings()
settings.__post_init__()
