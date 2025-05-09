import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.services.db import Base

# Schema for test isolation
SCHEMA_NAME = "test_schema"

# Detect test environment based on environment variable or cwd
IS_REMOTE = os.getenv("REMOTE", "false").lower() == "true"

# Choose database URL and connection options
if not IS_REMOTE:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:yourpassword@127.0.0.1:5432/test_db")
    CONNECT_ARGS = {}
else:
    DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://spontaniius:ushappymany@spontaniius-db.c7a55mps14qc.us-west-2.rds.amazonaws.com:5432/spontaniius")
    CONNECT_ARGS = {"options": f"-csearch_path={SCHEMA_NAME},public"}

# Import models after configuring schema
from app.models import user, card, card_collection

# Create engine and session factory
engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    with engine.connect() as conn:
        if IS_REMOTE:
            for cls in Base.__subclasses__():
                cls.__table__.schema = SCHEMA_NAME
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA_NAME}"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        Base.metadata.create_all(bind=conn)

def cleanup_db():
    with engine.connect() as conn:
        Base.metadata.drop_all(bind=conn)
    engine.dispose()
