import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Auto-detect local or remote DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:yourpassword@127.0.0.1:5432/test_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for getting a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_models():
    """Create all tables in the database"""
    from app.models import user, card, promotion, event, report, card_collection
    Base.metadata.create_all(bind=engine)
