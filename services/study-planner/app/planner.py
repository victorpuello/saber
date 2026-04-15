"""Motor de generación y reajuste de planes de estudio.

Lógica de generación:
  1. Priorizar competencias CRITICAL y WEAKNESS del perfil diagnóstico.
  2. Distribuir en 8-12 semanas con intercalación de áreas.
  3. Crear unidades semanales (3-5 por semana) con ~10 preguntas cada una.
  4. Tras avance: recalcular prioridades y reajustar plan.
"""

import logging
import uuid

import httpx

logger = logging.getLogger(__name__)

# ── Constantes ──────────────────────────────────────────────────

DEFAULT_TOTAL_WEEKS = 10
MIN_WEEKS = 8
MAX_WEEKS = 12
UNITS_PER_WEEK = 3  # Mínimo por semana
MAX_UNITS_PER_WEEK = 5
QUESTIONS_PER_UNIT = 10

# Peso por clasificación para priorización
PRIORITY_WEIGHTS: dict[str, tuple[str, int]] = {
    "CRITICAL": ("HIGH", 4),
    "WEAKNESS": ("HIGH", 3),
    "ADEQUATE": ("MEDIUM", 2),
    "STRENGTH": ("LOW", 1),
}


# ── Generación de plan ─────────────────────────────────────────


def generate_plan_from_scores(
    profile_id: uuid.UUID,
    student_user_id: int,
    competency_scores: list[dict],
    total_weeks: int = DEFAULT_TOTAL_WEEKS,
) -> dict:
    """Genera la estructura de un plan de estudio a partir de scores.

    Args:
        profile_id: UUID del perfil del estudiante.
        student_user_id: ID del estudiante en Kampus.
        competency_scores: lista de dicts con keys:
            competency_id, classification, area_code,
            competency_name (opcional), theta_estimate.
        total_weeks: duración del plan en semanas.

    Returns:
        dict con plan metadata + lista de units.
    """
    total_weeks = max(MIN_WEEKS, min(MAX_WEEKS, total_weeks))

    # Ordenar competencias por prioridad (CRITICAL primero)
    sorted_scores = sorted(
        competency_scores,
        key=lambda s: PRIORITY_WEIGHTS.get(
            s.get("classification", "ADEQUATE"), ("MEDIUM", 2)
        )[1],
        reverse=True,
    )

    # Separar por prioridad
    high_priority = [
        s for s in sorted_scores
        if s.get("classification") in ("CRITICAL", "WEAKNESS")
    ]
    medium_priority = [
        s for s in sorted_scores
        if s.get("classification") == "ADEQUATE"
    ]
    low_priority = [
        s for s in sorted_scores
        if s.get("classification") == "STRENGTH"
    ]

    units = []
    week = 1

    while week <= total_weeks:
        week_units = []

        # Asignar unidades de alta prioridad (2-3 por semana)
        for score in high_priority:
            if len(week_units) >= MAX_UNITS_PER_WEEK:
                break
            week_units.append(_build_unit(score, week, len(week_units), "HIGH"))

        # Completar con media prioridad (intercalación de áreas)
        for score in medium_priority:
            if len(week_units) >= MAX_UNITS_PER_WEEK:
                break
            # Evitar repetir área si ya hay 2 unidades de la misma
            area_counts = _count_areas(week_units)
            if area_counts.get(score.get("area_code", ""), 0) >= 2:
                continue
            week_units.append(_build_unit(score, week, len(week_units), "MEDIUM"))

        # Si quedan slots, agregar de baja prioridad
        for score in low_priority:
            if len(week_units) >= UNITS_PER_WEEK:
                break
            week_units.append(_build_unit(score, week, len(week_units), "LOW"))

        # Asegurar mínimo de unidades
        if not week_units and high_priority:
            score = high_priority[0]
            week_units.append(_build_unit(score, week, 0, "HIGH"))

        units.extend(week_units)

        # Rotar prioridades para intercalación entre semanas
        if high_priority:
            high_priority = high_priority[1:] + high_priority[:1]
        if medium_priority:
            medium_priority = medium_priority[1:] + medium_priority[:1]

        week += 1

    return {
        "profile_id": str(profile_id),
        "student_user_id": student_user_id,
        "total_weeks": total_weeks,
        "units": units,
    }


def _build_unit(score: dict, week: int, position: int, priority: str) -> dict:
    """Construye un dict de unidad semanal."""
    classification = score.get("classification", "ADEQUATE")
    comp_name = score.get("competency_name", f"Competencia {score['competency_id'][:8]}")
    area_code = score.get("area_code", "???")

    title = _generate_title(comp_name, classification)
    description = _generate_description(comp_name, classification, area_code)

    return {
        "week_number": week,
        "position": position,
        "competency_id": score["competency_id"],
        "area_code": area_code,
        "title": title,
        "description": description,
        "priority": priority,
        "recommended_questions": QUESTIONS_PER_UNIT,
    }


def _generate_title(comp_name: str, classification: str) -> str:
    """Genera título descriptivo para la unidad."""
    prefixes = {
        "CRITICAL": "Refuerzo urgente",
        "WEAKNESS": "Fortalecimiento",
        "ADEQUATE": "Consolidación",
        "STRENGTH": "Profundización",
    }
    prefix = prefixes.get(classification, "Práctica")
    return f"{prefix}: {comp_name}"[:200]


def _generate_description(comp_name: str, classification: str, area_code: str) -> str:
    """Genera descripción orientadora para la unidad."""
    area_names = {
        "LC": "Lectura Crítica",
        "MAT": "Matemáticas",
        "SC": "Sociales y Ciudadanas",
        "CN": "Ciencias Naturales",
        "ING": "Inglés",
    }
    area_name = area_names.get(area_code, area_code)

    templates = {
        "CRITICAL": (
            f"Práctica intensiva en {comp_name} ({area_name}). "
            "Enfócate en comprender los conceptos fundamentales y resolver "
            "ejercicios paso a paso."
        ),
        "WEAKNESS": (
            f"Ejercicios de fortalecimiento en {comp_name} ({area_name}). "
            "Repasa los conceptos clave y practica con diferentes tipos de preguntas."
        ),
        "ADEQUATE": (
            f"Consolidación de {comp_name} ({area_name}). "
            "Mantén tu nivel resolviendo preguntas de dificultad media-alta."
        ),
        "STRENGTH": (
            f"Profundización en {comp_name} ({area_name}). "
            "Desafíate con preguntas de alta complejidad para maximizar tu puntaje."
        ),
    }
    return templates.get(classification, f"Práctica de {comp_name} en {area_name}.")


def _count_areas(units: list[dict]) -> dict[str, int]:
    """Cuenta cuántas unidades hay por área en una semana."""
    counts: dict[str, int] = {}
    for u in units:
        area = u.get("area_code", "")
        counts[area] = counts.get(area, 0) + 1
    return counts


# ── Reajuste de plan ────────────────────────────────────────────


def recalculate_priorities(
    current_units: list[dict],
    updated_scores: list[dict],
) -> list[dict]:
    """Reajusta prioridades de unidades no completadas según scores actualizados.

    Args:
        current_units: unidades actuales del plan (no completadas).
        updated_scores: scores actualizados del perfil.

    Returns:
        Lista de unidades con prioridades recalculadas.
    """
    score_map = {s["competency_id"]: s for s in updated_scores}

    adjusted = []
    for unit in current_units:
        comp_id = unit.get("competency_id", "")
        score = score_map.get(comp_id)

        if score:
            classification = score.get("classification", "ADEQUATE")
            new_priority = PRIORITY_WEIGHTS.get(classification, ("MEDIUM", 2))[0]
            unit["priority"] = new_priority
        adjusted.append(unit)

    # Re-ordenar: HIGH primero dentro de cada semana
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    adjusted.sort(key=lambda u: (
        u.get("week_number", 0),
        priority_order.get(u.get("priority", "MEDIUM"), 1),
    ))

    return adjusted


# ── Fetch de preguntas para práctica ────────────────────────────


async def fetch_practice_questions(
    question_bank_url: str,
    competency_id: str,
    count: int = QUESTIONS_PER_UNIT,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """Obtiene preguntas aprobadas para una competencia desde Question Bank."""
    params: dict = {
        "competency_id": competency_id,
        "status": "APPROVED",
        "limit": count,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{question_bank_url}/api/questions",
            params=params,
        )
        if resp.status_code != 200:
            logger.warning("No se pudieron obtener preguntas para %s", competency_id)
            return []
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data

    # Filtrar excluidas
    if exclude_ids:
        exclude_set = set(exclude_ids)
        items = [q for q in items if str(q.get("id", "")) not in exclude_set]

    return items[:count]
