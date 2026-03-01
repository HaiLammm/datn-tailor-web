"""Tailor Project Backend - FastAPI Application Entry Point."""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.auth import router as auth_router
from src.core.seed import seed_owner_account


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: run startup tasks."""
    await seed_owner_account()
    yield


app = FastAPI(
    title="Tailor Project API",
    description="Backend API for the Tailor Project - AI-powered tailoring platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration — allow frontend to call backend across ports
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "healthy"}
