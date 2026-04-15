"""E2E: Flujo de autenticación completo (login → me → refresh → logout)."""

import pytest


@pytest.mark.asyncio
async def test_login_success(client, auth_tokens):
    """Login exitoso devuelve tokens y datos de usuario."""
    assert "access_token" in auth_tokens
    assert "refresh_token" in auth_tokens
    assert auth_tokens["token_type"] == "Bearer"  # noqa: S105
    assert auth_tokens["expires_in"] > 0
    assert "user" in auth_tokens
    assert auth_tokens["user"]["id"] is not None
    assert auth_tokens["user"]["role"] in ("STUDENT", "TEACHER", "ADMIN")


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """Login con credenciales incorrectas retorna 401."""
    resp = await client.post(
        "/api/auth/login",
        json={"username": "noexiste", "password": "incorrecto"},
    )
    assert resp.status_code in (401, 502)


@pytest.mark.asyncio
async def test_login_missing_fields(client):
    """Login sin campos obligatorios retorna 400."""
    resp = await client.post("/api/auth/login", json={})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_me_endpoint(auth_client):
    """GET /api/auth/me devuelve datos del usuario autenticado."""
    resp = await auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert "role" in data
    assert "name" in data


@pytest.mark.asyncio
async def test_refresh_token(client, auth_tokens):
    """Refresh token genera nuevos tokens válidos."""
    resp = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": auth_tokens["refresh_token"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    # El refresh token anterior ya no debería servir
    resp2 = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": auth_tokens["refresh_token"]},
    )
    assert resp2.status_code == 401


@pytest.mark.asyncio
async def test_logout(auth_client, auth_tokens):
    """Logout invalida el refresh token."""
    resp = await auth_client.post(
        "/api/auth/logout",
        json={"refresh_token": auth_tokens["refresh_token"]},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_expired_token_rejected(client):
    """Un token expirado es rechazado con 401."""
    fake_token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjF9.x"  # noqa: S105
    headers = {"Authorization": f"Bearer {fake_token}"}
    resp = await client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 401
