from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://georisk:georisk@localhost:5432/georisk"
    DATABASE_URL_SYNC: str = "postgresql://georisk:georisk@localhost:5432/georisk"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    NEWSDATA_API_KEY: str = ""
    GUARDIAN_API_KEY: str = ""
    CURRENTS_API_KEY: str = ""
    GNEWS_API_KEY: str = ""
    GUARDIAN_INTERVAL: int = 1800
    CURRENTS_INTERVAL: int = 900
    GNEWS_INTERVAL: int = 3600
    GDELT_INTERVAL: int = 900
    NEWSDATA_INTERVAL: int = 600
    RSS_INTERVAL: int = 300
    RECOMPUTE_INTERVAL: int = 600
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    SLACK_WEBHOOK_URL: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_TO: str = ""
    ADMIN_API_KEY: str = ""
    CORS_ORIGINS: str = "*"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
