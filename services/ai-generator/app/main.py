"""Punto de entrada del AI Generator Service."""

from fastapi import FastAPI
from saber11_shared.health import create_health_router

from .config import settings
from .routes import router as ai_router

app = FastAPI(title="Saber 11 — AI Generator", version="0.1.0")
app.include_router(create_health_router(settings.service_name))
app.include_router(ai_router)
