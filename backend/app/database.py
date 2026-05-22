from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# Supabase requires SSL for external connections
connect_args = {}
if "supabase" in DATABASE_URL:
    connect_args["sslmode"] = "require"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
