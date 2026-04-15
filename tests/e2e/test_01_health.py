"""E2E: Pruebas de health check para todos los servicios."""

import pytest

HEALTH_ENDPOINTS = [
    "/health",  # Gateway
]

# Los microservicios se acceden vía proxy del gateway
SERVICE_PREFIXES = [
    "/api/questions",
    "/api/exams",
    "/api/diagnostic",
    "/api/plans",
    "/api/analytics",
    "/api/notifications",
]


@pytest.mark.asyncio
async def test_gateway_health(client):
    """El gateway responde en /health."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"


@pytest.mark.asyncio
async def test_gateway_rejects_unauthenticated(client):
    """Las rutas protegidas rechazan sin token."""
    for prefix in SERVICE_PREFIXES:
        resp = await client.get(prefix)
        assert resp.status_code == 401, f"{prefix} debería requerir auth"
