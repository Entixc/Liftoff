import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


database_url = os.environ["DATABASE_URL"]

engine = create_engine(database_url)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)