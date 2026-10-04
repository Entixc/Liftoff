import os

from collections.abc import Generator

from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


database_url = os.environ["DATABASE_URL"]

engine = create_engine(database_url)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        