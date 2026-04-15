"""Configuración y fixtures para pruebas E2E.

Estas pruebas requieren el stack completo levantado (docker compose up).
Ejecutar: pytest tests/e2e/ -v --tb=short
"""

import os

import httpx
import pytest
import pytest_asyncio

# URL base del gateway (ajustar si corre en otro puerto)
BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
KAMPUS_USERNAME = os.getenv("E2E_USERNAME", "admin")
KAMPUS_PASSWORD = os.getenv("E2E_PASSWORD", "admin")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest_asyncio.fixture
async def client():
    """Cliente HTTP sin autenticación."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30) as c:
        yield c


@pytest_asyncio.fixture
async def auth_tokens(client: httpx.AsyncClient) -> dict:
    """Autentica contra el gateway y devuelve tokens."""
    resp = await client.post(
        "/api/auth/login",
        json={"username": KAMPUS_USERNAME, "password": KAMPUS_PASSWORD},
    )
    assert resp.status_code == 200, f"Login falló: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    return data


@pytest_asyncio.fixture
async def auth_client(auth_tokens: dict):
    """Cliente HTTP autenticado con Bearer token."""
    headers = {"Authorization": f"Bearer {auth_tokens['access_token']}"}
    async with httpx.AsyncClient(
        base_url=BASE_URL, headers=headers, timeout=30
    ) as c:
        yield c
