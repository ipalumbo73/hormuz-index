"""Seed initial source catalog and default tuning config."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base
from app.db.models import Source, TuningConfig

INITIAL_SOURCES = [
    {"name": "Reuters", "base_url": "https://www.reuters.com", "source_type": "newswire", "country": "UK", "tier": 1, "reliability_score": 0.96, "official_flag": False},
    {"name": "Associated Press", "base_url": "https://apnews.com", "source_type": "newswire", "country": "USA", "tier": 1, "reliability_score": 0.95, "official_flag": False},
    {"name": "AFP", "base_url": "https://www.afp.com", "source_type": "newswire", "country": "France", "tier": 1, "reliability_score": 0.94, "official_flag": False},
    {"name": "BBC", "base_url": "https://www.bbc.com", "source_type": "newswire", "country": "UK", "tier": 1, "reliability_score": 0.93, "official_flag": False},
    {"name": "Al Jazeera", "base_url": "https://www.aljazeera.com", "source_type": "newswire", "country": "Qatar", "tier": 1, "reliability_score": 0.88, "official_flag": False},
    {"name": "Financial Times", "base_url": "https://www.ft.com", "source_type": "newswire", "country": "UK", "tier": 1, "reliability_score": 0.92, "official_flag": False},
    {"name": "CNN", "base_url": "https://www.cnn.com", "source_type": "newswire", "country": "USA", "tier": 1, "reliability_score": 0.88, "official_flag": False},
    {"name": "IAEA", "base_url": "https://www.iaea.org", "source_type": "government", "country": "International", "tier": 1, "reliability_score": 0.90, "official_flag": True},
    {"name": "CENTCOM", "base_url": "https://www.centcom.mil", "source_type": "government", "country": "USA", "tier": 1, "reliability_score": 0.90, "official_flag": True},
    {"name": "GDELT", "base_url": "https://www.gdeltproject.org", "source_type": "structured", "country": "USA", "tier": 1, "reliability_score": 0.85, "official_flag": False},
    {"name": "NewsData.io", "base_url": "https://newsdata.io", "source_type": "aggregator", "country": "USA", "tier": 2, "reliability_score": 0.75, "official_flag": False},
]

DEFAULT_TUNING = {
    "version": "1.0.0",
    "priors": {"contained": 40, "regional": 25, "threshold": 20, "coercive": 10, "actual": 5},
    "weights": {
        "NOI": {"contained": -0.20, "regional": 0.08, "threshold": 0.30, "coercive": 0.18, "actual": 0.05},
        "GAI": {"contained": -0.10, "regional": 0.35, "threshold": 0.05, "coercive": 0.04, "actual": 0.02},
        "HDI": {"contained": -0.12, "regional": 0.30, "threshold": 0.08, "coercive": 0.05, "actual": 0.03},
        "PAI": {"contained": -0.08, "regional": 0.25, "threshold": 0.03, "coercive": 0.02, "actual": 0.01},
        "SRI": {"contained": -0.10, "regional": 0.10, "threshold": 0.18, "coercive": 0.30, "actual": 0.10},
        "BSI": {"contained": -0.15, "regional": 0.05, "threshold": 0.35, "coercive": 0.25, "actual": 0.12},
        "DCI": {"contained": 0.30, "regional": -0.20, "threshold": -0.25, "coercive": -0.20, "actual": -0.10},
    },
    "thresholds": {
        "NOI": {"green": 25, "yellow": 50, "orange": 70, "red": 85},
        "alert_rules": {
            "NOI_warning": 50, "NOI_high": 70, "NOI_critical": 85,
            "GAI_high": 70, "HDI_critical": 75,
            "threshold_high": 35, "coercive_high": 20, "actual_critical": 10,
        },
    },
}


def seed_database():
    """Seed the database with initial sources and default tuning config."""
    engine = create_engine(settings.DATABASE_URL_SYNC)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Seed sources
        for src_data in INITIAL_SOURCES:
            existing = session.execute(
                select(Source).where(Source.name == src_data["name"])
            ).scalar_one_or_none()
            if not existing:
                source = Source(id=uuid.uuid4(), **src_data)
                session.add(source)

        # Seed default tuning config
        existing_config = session.execute(
            select(TuningConfig).where(TuningConfig.active == True)
        ).scalar_one_or_none()
        if not existing_config:
            config = TuningConfig(
                id=uuid.uuid4(),
                version=DEFAULT_TUNING["version"],
                active=True,
                priors=DEFAULT_TUNING["priors"],
                weights=DEFAULT_TUNING["weights"],
                thresholds=DEFAULT_TUNING["thresholds"],
            )
            session.add(config)

        session.commit()
        print("Database seeded successfully.")
    except Exception as e:
        session.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
