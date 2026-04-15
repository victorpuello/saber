"""Motor CAT/TRI — Computerized Adaptive Testing con modelo 3PL.

Implementa:
  - Probabilidad 3PL (dificultad, discriminación, adivinación)
  - Estimación de theta por máxima verosimilitud (Newton-Raphson)
  - Información de Fisher para cálculo de error estándar
  - Selección óptima de ítem (máxima información + cobertura)
  - Clasificación de nivel basada en theta
"""

import math

# ── Constantes ──────────────────────────────────────────────────

THETA_INIT = 0.0        # Habilidad inicial (media poblacional)
SE_INIT = 1.0            # Error estándar inicial
SE_THRESHOLD = 0.3       # Umbral de parada por precisión
MAX_QUESTIONS = 15       # Máximo de preguntas por área
THETA_MIN = -4.0
THETA_MAX = 4.0

# Clasificación de niveles según theta estimado
LEVEL_THRESHOLDS: list[tuple[float, int, str]] = [
    (-1.0, 1, "CRITICAL"),
    (0.0, 2, "WEAKNESS"),
    (1.0, 3, "ADEQUATE"),
    (math.inf, 4, "STRENGTH"),
]


# ── Modelo 3PL ──────────────────────────────────────────────────


def probability_3pl(
    theta: float,
    difficulty: float,
    discrimination: float = 1.0,
    guessing: float = 0.25,
) -> float:
    """Probabilidad de respuesta correcta bajo modelo TRI 3PL.

    P(θ) = c + (1-c) / (1 + exp(-a(θ - b)))

    donde a=discriminación, b=dificultad, c=adivinación.
    """
    exponent = -discrimination * (theta - difficulty)
    # Limitar exponente para evitar overflow
    exponent = max(-30.0, min(30.0, exponent))
    return guessing + (1.0 - guessing) / (1.0 + math.exp(exponent))


def fisher_information(
    theta: float,
    difficulty: float,
    discrimination: float = 1.0,
    guessing: float = 0.25,
) -> float:
    """Información de Fisher del ítem en el punto theta.

    I(θ) = a² * [(P(θ) - c)² / ((1-c)² * P(θ) * (1-P(θ)))]

    Mayor información = mejor capacidad de discriminación en ese nivel.
    """
    p = probability_3pl(theta, difficulty, discrimination, guessing)
    # Evitar división por cero
    if p <= guessing or p >= 1.0:
        return 0.0
    q = 1.0 - p
    numerator = (p - guessing) ** 2
    denominator = (1.0 - guessing) ** 2 * p * q
    if denominator == 0:
        return 0.0
    return discrimination**2 * (numerator / denominator)


# ── Estimación de theta ────────────────────────────────────────


def update_theta(
    theta: float,
    responses: list[dict],
    max_iter: int = 20,
    tol: float = 1e-4,
) -> tuple[float, float]:
    """Estima theta por máxima verosimilitud (Newton-Raphson).

    Args:
        theta: estimación actual.
        responses: lista de dicts con keys: is_correct, difficulty,
                   discrimination, guessing.
        max_iter: iteraciones máximas.
        tol: tolerancia de convergencia.

    Returns:
        (theta_new, standard_error)
    """
    if not responses:
        return theta, SE_INIT

    current = theta

    for _ in range(max_iter):
        first_deriv = 0.0
        second_deriv = 0.0

        for r in responses:
            a = r.get("discrimination", 1.0)
            b = r["difficulty"]
            c = r.get("guessing", 0.25)
            u = 1.0 if r["is_correct"] else 0.0

            p = probability_3pl(current, b, a, c)
            q = 1.0 - p

            if p <= c or p >= 1.0 or q <= 0.0:
                continue

            w = (p - c) / (1.0 - c)
            # Primera derivada de log-verosimilitud
            first_deriv += a * w * (u - p) / (p * q) * q
            # Simplificación: dL/dθ = a*(p-c)/(1-c) * (u-p)/(p)
            # Aproximación con Fisher information para segunda derivada
            info = fisher_information(current, b, a, c)
            second_deriv -= info

        if second_deriv == 0:
            break

        delta = first_deriv / (-second_deriv)
        current += delta

        # Restringir theta al rango válido
        current = max(THETA_MIN, min(THETA_MAX, current))

        if abs(delta) < tol:
            break

    # Error estándar = 1/sqrt(información total)
    total_info = sum(
        fisher_information(
            current,
            r["difficulty"],
            r.get("discrimination", 1.0),
            r.get("guessing", 0.25),
        )
        for r in responses
    )
    se = 1.0 / math.sqrt(total_info) if total_info > 0 else SE_INIT

    return current, se


# ── Selección de ítem ───────────────────────────────────────────


def select_optimal_item(
    theta: float,
    available_items: list[dict],
    used_question_ids: set,
    competency_counts: dict[str, int],
) -> dict | None:
    """Selecciona el ítem óptimo usando información de Fisher + cobertura.

    Prioriza:
      1. Competencias con menos preguntas respondidas (cobertura)
      2. Máxima información de Fisher en theta actual

    Args:
        theta: habilidad estimada actual.
        available_items: lista de ítems con keys: id, competency_id,
            irt_difficulty, irt_discrimination, irt_guessing.
        used_question_ids: IDs de preguntas ya usadas.
        competency_counts: {competency_id: cantidad de preguntas respondidas}.

    Returns:
        El ítem óptimo o None si no hay disponibles.
    """
    candidates = [
        item for item in available_items
        if str(item["id"]) not in used_question_ids
    ]

    if not candidates:
        return None

    # Encontrar la competencia menos cubierta
    min_count = min(competency_counts.values()) if competency_counts else 0

    # Separar candidatos por prioridad de cobertura
    underrepresented = [
        item for item in candidates
        if competency_counts.get(str(item["competency_id"]), 0) <= min_count
    ]

    # Si hay candidatos de competencias poco cubiertas, preferirlos
    pool = underrepresented if underrepresented else candidates

    # Seleccionar el de máxima información de Fisher
    best_item = None
    best_info = -1.0

    for item in pool:
        info = fisher_information(
            theta,
            item.get("irt_difficulty", 0.0),
            item.get("irt_discrimination", 1.0),
            item.get("irt_guessing", 0.25),
        )
        if info > best_info:
            best_info = info
            best_item = item

    return best_item


# ── Clasificación ───────────────────────────────────────────────


def classify_level(theta: float) -> tuple[int, str]:
    """Clasifica theta en nivel de desempeño (1-4).

    | Theta      | Nivel | Clasificación |
    |------------|-------|---------------|
    | θ < -1.0   | 1     | CRITICAL      |
    | -1.0 ≤ θ < 0.0 | 2 | WEAKNESS      |
    | 0.0 ≤ θ < 1.0  | 3 | ADEQUATE      |
    | θ ≥ 1.0    | 4     | STRENGTH      |
    """
    for threshold, level, classification in LEVEL_THRESHOLDS:
        if theta < threshold:
            return level, classification
    return 4, "STRENGTH"


def theta_to_score(theta: float) -> float:
    """Convierte theta (escala logit) a puntaje 0-100 estilo Saber 11.

    Usa transformación lineal: score = 50 + 15*theta, limitado a [0, 100].
    """
    score = 50.0 + 15.0 * theta
    return max(0.0, min(100.0, round(score, 2)))


def should_stop(se: float, questions_answered: int, max_questions: int) -> bool:
    """Determina si la sesión CAT debe detenerse.

    Criterios:
      - Error estándar por debajo del umbral (precisión suficiente).
      - Se alcanzó el máximo de preguntas.
    """
    return se < SE_THRESHOLD or questions_answered >= max_questions
