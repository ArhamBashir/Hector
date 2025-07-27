from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..core.config import settings

# Create the database engine using the URL from our settings
engine = create_engine(settings.DATABASE_URL)

# Create a session maker that will be used to create individual database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
