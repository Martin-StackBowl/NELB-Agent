"""NELB Backend — FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import agent, health
from app.config import settings

app = FastAPI(
    title="NELB API",
    description="No Employee Left Behind — AI reasoning agent for fair job distribution",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
