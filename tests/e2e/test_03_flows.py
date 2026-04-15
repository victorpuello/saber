"""E2E: Flujo completo login → diagnóstico → plan → simulacro."""

import pytest


@pytest.mark.asyncio
async def test_full_student_flow(auth_client):
    """Flujo E2E: perfil → diagnóstico → plan → simulacro.

    Este test requiere:
    - Stack completo levantado
    - Banco de preguntas con al menos un área poblada (seed)
    - Usuario autenticado con rol STUDENT
    """
    # 1. Verificar que el usuario está autenticado
    me = await auth_client.get("/api/auth/me")
    assert me.status_code == 200
    me.json()  # Verificar que es JSON válido

    # 2. Consultar taxonomía (áreas disponibles)
    areas_resp = await auth_client.get("/api/taxonomy/areas")
    if areas_resp.status_code == 200:
        areas = areas_resp.json()
        if isinstance(areas, dict):
            areas = areas.get("items", [])
    else:
        pytest.skip("No hay áreas en el banco de preguntas")

    if not areas:
        pytest.skip("No hay áreas en el banco de preguntas")

    area = areas[0]
    area_code = area.get("code") or area.get("area_code")

    # 3. Iniciar diagnóstico adaptativo
    diag_resp = await auth_client.post(
        "/api/diagnostic/start",
        json={"area_code": area_code},
    )
    # Puede fallar si no hay preguntas aprobadas
    if diag_resp.status_code == 400:
        pytest.skip("No hay preguntas suficientes para diagnóstico")
    assert diag_resp.status_code == 201, f"Error al iniciar diagnóstico: {diag_resp.text}"
    diag_session = diag_resp.json()
    session_id = diag_session["id"]

    # 4. Obtener primera pregunta del diagnóstico
    next_resp = await auth_client.get(f"/api/diagnostic/sessions/{session_id}/next")
    if next_resp.status_code == 200:
        question = next_resp.json()
        assert "question_id" in question
        assert "stem" in question

        # 5. Responder la pregunta
        answer_resp = await auth_client.post(
            f"/api/diagnostic/sessions/{session_id}/answer",
            json={
                "question_id": question["question_id"],
                "selected_answer": "A",
            },
        )
        assert answer_resp.status_code == 200
        result = answer_resp.json()
        assert "is_correct" in result
        assert "theta_after" in result

    # 6. Consultar perfil del estudiante
    profile_resp = await auth_client.get("/api/diagnostic/profile")
    assert profile_resp.status_code == 200

    # 7. Consultar planes de estudio
    plans_resp = await auth_client.get("/api/plans")
    assert plans_resp.status_code in (200, 404)

    # 8. Consultar notificaciones
    notif_resp = await auth_client.get("/api/notifications")
    assert notif_resp.status_code == 200
    notif_data = notif_resp.json()
    assert "items" in notif_data
    assert "unread" in notif_data


@pytest.mark.asyncio
async def test_question_bank_crud(auth_client):
    """Flujo de banco de preguntas (requiere rol TEACHER o ADMIN)."""
    # Listar preguntas
    resp = await auth_client.get("/api/questions", params={"limit": 5})
    assert resp.status_code == 200

    # Listar taxonomía
    areas = await auth_client.get("/api/taxonomy/areas")
    assert areas.status_code == 200


@pytest.mark.asyncio
async def test_analytics_endpoints(auth_client):
    """Los endpoints de analytics responden correctamente."""
    me = await auth_client.get("/api/auth/me")
    user = me.json()

    # Progreso del estudiante
    resp = await auth_client.get(f"/api/analytics/student/{user['id']}/progress")
    assert resp.status_code in (200, 404)


@pytest.mark.asyncio
async def test_notification_read_flow(auth_client):
    """Flujo de lectura de notificaciones."""
    # Obtener conteo de no leídas
    count_resp = await auth_client.get("/api/notifications/unread-count")
    assert count_resp.status_code == 200
    assert "unread" in count_resp.json()

    # Listar notificaciones
    list_resp = await auth_client.get("/api/notifications")
    assert list_resp.status_code == 200
    data = list_resp.json()

    # Si hay notificaciones, marcar como leídas
    if data["items"]:
        ids = [item["id"] for item in data["items"][:2]]
        mark_resp = await auth_client.post(
            "/api/notifications/read",
            json={"notification_ids": ids},
        )
        assert mark_resp.status_code == 200


@pytest.mark.asyncio
async def test_security_authorization(client, auth_client):
    """Verificar que las restricciones de rol funcionan."""
    # Endpoints de admin deben rechazar a estudiantes (si el user es student)
    me = await auth_client.get("/api/auth/me")
    user = me.json()

    if user["role"] == "STUDENT":
        # Audit logs solo para admin
        audit_resp = await auth_client.get("/api/notifications/audit")
        assert audit_resp.status_code == 403

        # Sync logs solo para admin
        sync_resp = await auth_client.get("/api/notifications/sync-logs")
        assert sync_resp.status_code == 403
