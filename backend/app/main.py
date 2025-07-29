from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.session import engine
from .db import models
from .api.endpoints import auth, users, sourcing, products, reports

# This line creates all the database tables based on your models.py file
models.Base.metadata.create_all(bind=engine)

# Create the FastAPI application instance
app = FastAPI(title="SourceHub API")

# Set up CORS (Cross-Origin Resource Sharing)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# A simple test endpoint to make sure the server is running
@app.get("/")
def read_root():
    return {"message": "Welcome to the Retro Ventures API"}

# Include the API routers
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(sourcing.router, prefix="/api/v1/sourcing", tags=["Sourcing"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Master Products"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])