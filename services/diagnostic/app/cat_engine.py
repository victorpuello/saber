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
ENGLISH_MAX_QUESTIONS = 20
THETA_MIN = -4.0
THETA_MAX = 4.0

# Clasificación de niveles según theta estimado
LEVEL_THRESHOLDS: list[tuple[float, int, str]] = [
    (-1.0, 1, "CRITICAL"),
    (0.0, 2, "WEAKNESS"),
    (1.0, 3, "ADEQUATE"),
    (math.inf, 4, "STRENGTH"),
]

ENGLISH_SECTION_LABELS: dict[int, str] = {
    1: "Avisos y letreros",
    2: "Lexico",
    3: "Conversaciones",
    4: "Textos incompletos",
    5: "Comprension literal",
    6: "Comprension inferencial",
    7: "Cloze gramatical",
}

ENGLISH_MCER_THRESHOLDS: list[tuple[float, str, str]] = [
    (-1.5, "A-", "Pre-A1"),
    (-0.5, "A1", "A1"),
    (0.7, "A2", "A2"),
    (1.6, "B1", "B1"),
    (math.inf, "B+", "B1+"),
]

ENGLISH_THETA_TARGETS: dict[str, float] = {
    "A-": -2.0,
    "A1": -1.0,
    "A2": 0.0,
    "B1": 1.0,
    "B+": 1.8,
}

ENGLISH_ROUTE_BY_MCER: dict[str, list[tuple[int, str]]] = {
    "A-": [(1, "A-"), (1, "A1"), (2, "A1")],
    "A1": [(1, "A1"), (2, "A1"), (3, "A2")],
    "A2": [(3, "A2"), (4, "A2"), (5, "A2")],
    "B1": [(5, "B1"), (6, "B1"), (7, "B1")],
    "B+": [(6, "B+"), (7, "B+"), (5, "B1")],
}


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


def english_mcer_from_theta(theta: float) -> tuple[str, str]:
    """Mapea theta a codigo MCER de banco y etiqueta para reportes."""
    for threshold, code, label in ENGLISH_MCER_THRESHOLDS:
        if theta < threshold:
            return code, label
    return "B+", "B1+"


def _item_mcer(item: dict) -> str:
    value = item.get("mcer_level") or ""
    return str(value).upper()


def _item_section(item: dict) -> int | None:
    value = item.get("english_section")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _english_pool(
    available_items: list[dict],
    used_question_ids: set,
) -> list[dict]:
    return [
        item for item in available_items
        if str(item.get("id")) not in used_question_ids and _item_section(item)
    ]


def _best_by_information(theta: float, candidates: list[dict]) -> dict | None:
    if not candidates:
        return None
    return max(
        candidates,
        key=lambda item: fisher_information(
            theta,
            float(item.get("irt_difficulty") or 0.0),
            float(item.get("irt_discrimination") or 1.0),
            float(item.get("irt_guessing") or 0.25),
        ),
    )


def select_english_item(
    theta: float,
    available_items: list[dict],
    used_question_ids: set,
    answer_history: list[dict],
) -> dict | None:
    """Selecciona pregunta de Ingles con ruta MCER y cobertura por seccion."""
    candidates = _english_pool(available_items, used_question_ids)
    if not candidates:
        return None

    position = len(answer_history) + 1
    if position == 1:
        exact = [
            item for item in candidates
            if _item_section(item) == 3 and _item_mcer(item) == "A2"
        ]
        return _best_by_information(theta, exact or candidates)

    if position == 2 and answer_history:
        first_correct = bool(answer_history[0].get("is_correct"))
        target_section, target_mcer = (5, "B1") if first_correct else (1, "A1")
        exact = [
            item for item in candidates
            if _item_section(item) == target_section and _item_mcer(item) == target_mcer
        ]
        same_section = [
            item for item in candidates if _item_section(item) == target_section
        ]
        return _best_by_information(theta, exact or same_section or candidates)

    mcer_code, _ = english_mcer_from_theta(theta)
    route = ENGLISH_ROUTE_BY_MCER.get(mcer_code, ENGLISH_ROUTE_BY_MCER["A2"])
    section_stats = summarize_english_sections(answer_history)
    weak_sections = [
        int(item["section"])
        for item in section_stats
        if item["attempted"] and item["accuracy"] < 0.6
    ]

    pools: list[list[dict]] = []
    for section in weak_sections:
        pools.append([item for item in candidates if _item_section(item) == section])
    for section, mcer in route:
        pools.append([
            item for item in candidates
            if _item_section(item) == section and _item_mcer(item) == mcer
        ])
        pools.append([item for item in candidates if _item_section(item) == section])

    for pool in pools:
        selected = _best_by_information(theta, pool)
        if selected:
            return selected

    return _best_by_information(theta, candidates)


def summarize_english_sections(answer_history: list[dict]) -> list[dict]:
    """Agrupa intentos, aciertos y errores por seccion de Ingles."""
    summary: dict[int, dict] = {
        section: {
            "section": section,
            "label": label,
            "attempted": 0,
            "correct": 0,
            "errors": 0,
            "accuracy": 0.0,
        }
        for section, label in ENGLISH_SECTION_LABELS.items()
    }

    for answer in answer_history:
        section = answer.get("english_section")
        if section is None:
            continue
        try:
            section_int = int(section)
        except (TypeError, ValueError):
            continue
        if section_int not in summary:
            continue
        item = summary[section_int]
        item["attempted"] += 1
        if answer.get("is_correct"):
            item["correct"] += 1
        else:
            item["errors"] += 1

    for item in summary.values():
        attempted = item["attempted"]
        item["accuracy"] = round(item["correct"] / attempted, 3) if attempted else 0.0

    return sorted(summary.values(), key=lambda item: (-item["errors"], item["section"]))


def build_english_recommendations(answer_history: list[dict]) -> list[dict]:
    """Crea recomendaciones accionables por seccion con mayor error."""
    templates = {
        1: "Practica senales, avisos y proposito comunicativo en textos breves.",
        2: "Refuerza vocabulario funcional, sinonimos y uso de palabras por contexto.",
        3: "Trabaja turnos de conversacion y respuestas apropiadas en dialogos.",
        4: "Completa textos cortos con conectores, referencias y coherencia local.",
        5: "Entrena lectura literal: localizar datos, ideas y detalles explicitos.",
        6: "Entrena inferencias: intencion, tono y conclusiones no literales.",
        7: "Refuerza gramatica en contexto: tiempos, preposiciones y cohesion.",
    }
    stats = summarize_english_sections(answer_history)
    recommendations = []
    for item in stats:
        if item["attempted"] == 0 or item["errors"] == 0:
            continue
        recommendations.append({
            "section": item["section"],
            "label": item["label"],
            "priority": "HIGH" if item["accuracy"] < 0.5 else "MEDIUM",
            "message": templates[item["section"]],
            "attempted": item["attempted"],
            "errors": item["errors"],
            "accuracy": item["accuracy"],
        })
    return recommendations[:3]


def estimate_item_parameters_from_responses(
    responses: list[dict],
    min_responses: int = 5,
) -> list[dict]:
    """Estima parametros IRT aproximados desde respuestas observadas."""
    grouped: dict[str, list[dict]] = {}
    for row in responses:
        qid = str(row.get("question_id"))
        grouped.setdefault(qid, []).append(row)

    estimates = []
    for question_id, rows in grouped.items():
        n = len(rows)
        correct_values = [1.0 if row.get("is_correct") else 0.0 for row in rows]
        p_value = sum(correct_values) / n if n else 0.0
        p_clamped = max(0.05, min(0.95, p_value))
        guessing = 0.2 if p_value < 0.35 else 0.25
        difficulty = math.log((1.0 - p_clamped) / p_clamped)

        thetas = [float(row.get("theta_after") or 0.0) for row in rows]
        mean_theta = sum(thetas) / n if n else 0.0
        mean_correct = p_value
        cov = sum(
            (theta_value - mean_theta) * (correct - mean_correct)
            for theta_value, correct in zip(thetas, correct_values, strict=False)
        )
        var_theta = sum((theta_value - mean_theta) ** 2 for theta_value in thetas)
        var_correct = sum((correct - mean_correct) ** 2 for correct in correct_values)
        point_biserial = (
            cov / math.sqrt(var_theta * var_correct)
            if var_theta > 0 and var_correct > 0
            else 0.0
        )
        discrimination = max(0.35, min(2.5, 0.8 + 1.4 * point_biserial))
        archive_candidate = n >= min_responses and (
            discrimination < 0.45 or p_value <= 0.08 or p_value >= 0.97
        )

        estimates.append({
            "question_id": question_id,
            "responses": n,
            "p_value": round(p_value, 4),
            "irt_difficulty": round(max(-3.0, min(3.0, difficulty)), 3),
            "irt_discrimination": round(discrimination, 3),
            "irt_guessing": guessing,
            "point_biserial": round(point_biserial, 4),
            "ready": n >= min_responses,
            "archive_candidate": archive_candidate,
        })

    return sorted(estimates, key=lambda item: (not item["ready"], item["question_id"]))


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
