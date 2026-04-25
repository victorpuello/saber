"""Validador automático de calidad para preguntas generadas por IA.

Verifica estructura, coherencia pedagógica y requisitos ICFES antes de
enviar la pregunta al flujo de revisión.
"""

import json

from .schemas import GeneratedQuestion

# Contextos válidos por área
VALID_CONTEXT_TYPES: dict[str, set[str]] = {
    "LC": {
        "continuous_text",
        "discontinuous_text",
        "philosophical_text",
        "dialogue",
    },
    "MAT": {
        "math_problem",
        "scientific_scenario",
        "discontinuous_text",
    },
    "SC": {
        "social_dilemma",
        "continuous_text",
        "discontinuous_text",
    },
    "CN": {
        "scientific_scenario",
        "continuous_text",
        "discontinuous_text",
    },
    "ING": {
        "continuous_text",
        "dialogue",
        "discontinuous_text",
        "cloze_text",
        "react_component",   # Secciones 1 (NoticeSign) y 3 (ChatUI), 5 (EmailWrapper)
    },
}

# Secciones de inglés que REQUIEREN context_type = react_component
_ING_REACT_SECTIONS: set[int] = {1, 3}

# Secciones de inglés que REQUIEREN context_type = cloze_text
_ING_CLOZE_SECTIONS: set[int] = {4, 7}

# Longitudes mínimas de contexto por área
MIN_CONTEXT_LENGTH: dict[str, int] = {
    "LC": 150,
    "MAT": 50,
    "SC": 80,
    "CN": 80,
    "ING": 40,
}


def validate_question(
    question: GeneratedQuestion,
    area_code: str,
) -> dict:
    """Valida una pregunta generada y retorna resultado con errores/warnings.

    Returns:
        {
            "is_valid": bool,
            "errors": list[str],    # Bloquean envío
            "warnings": list[str],  # No bloquean pero se registran
            "score": float,         # 0.0 - 1.0 calidad estimada
        }
    """
    errors: list[str] = []
    warnings: list[str] = []
    score = 1.0

    # ── 1. Estructura básica ──────────────────────────────────────────

    if not question.context or len(question.context.strip()) < 10:
        errors.append("Contexto vacío o demasiado corto")
    if not question.stem or len(question.stem.strip()) < 10:
        errors.append("Enunciado (stem) vacío o demasiado corto")

    # Opciones no vacías
    for opt_name in ("option_a", "option_b", "option_c"):
        val = getattr(question, opt_name, "")
        if not val or len(val.strip()) < 2:
            errors.append(f"{opt_name} vacía o demasiado corta")

    # Para inglés secciones 1-3 solo 3 opciones (A, B, C); resto 4
    if area_code != "ING" and (
        not question.option_d or len(question.option_d.strip()) < 2
    ):
        errors.append("option_d requerida para esta área")

    # Respuesta correcta válida
    if question.correct_answer not in ("A", "B", "C", "D"):
        errors.append(f"correct_answer inválida: {question.correct_answer}")

    # ── 2. Explicaciones pedagógicas ──────────────────────────────────

    if not question.explanation_correct or len(question.explanation_correct.strip()) < 20:
        errors.append("explanation_correct insuficiente (mín 20 chars)")
    for exp_name in ("explanation_a", "explanation_b", "explanation_c"):
        val = getattr(question, exp_name, "")
        if not val or len(val.strip()) < 15:
            warnings.append(f"{exp_name} podría ser más detallada")
            score -= 0.05

    # ── 3. Context type válido para el área ───────────────────────────

    valid_types = VALID_CONTEXT_TYPES.get(area_code, set())
    if question.context_type not in valid_types:
        errors.append(
            f"context_type '{question.context_type}' no válido para {area_code}. "
            f"Válidos: {valid_types}"
        )

    # ── 4. Longitud mínima de contexto ────────────────────────────────

    min_len = MIN_CONTEXT_LENGTH.get(area_code, 50)
    word_count = len(question.context.split()) if question.context else 0
    if word_count < min_len:
        warnings.append(
            f"Contexto corto ({word_count} palabras, mínimo recomendado {min_len})"
        )
        score -= 0.1

    # ── 5. Opciones no duplicadas ─────────────────────────────────────

    options = [
        question.option_a,
        question.option_b,
        question.option_c,
    ]
    if question.option_d:
        options.append(question.option_d)

    normalized = [o.strip().lower() for o in options if o]
    if len(normalized) != len(set(normalized)):
        errors.append("Hay opciones duplicadas")

    # ── 6. Respuesta correcta apunta a opción existente ───────────────

    answer_map = {"A": question.option_a, "B": question.option_b,
                  "C": question.option_c, "D": question.option_d}
    correct_opt = answer_map.get(question.correct_answer)
    if not correct_opt or len((correct_opt or "").strip()) < 2:
        errors.append("La respuesta correcta apunta a una opción vacía")

    # ── 7. Validaciones de inglés ─────────────────────────────────────

    if area_code == "ING":
        if not question.english_section:
            warnings.append("Falta english_section para pregunta de inglés")
        if not question.mcer_level:
            warnings.append("Falta mcer_level para pregunta de inglés")

        section = question.english_section or 0

        # Secciones 1 y 3 DEBEN usar react_component
        if section in _ING_REACT_SECTIONS and question.context_type != "react_component":
            errors.append(
                f"Sección {section} de inglés debe usar context_type 'react_component' "
                f"(recibido: '{question.context_type}')"
            )

        # Secciones 4 y 7 DEBEN usar cloze_text
        if section in _ING_CLOZE_SECTIONS and question.context_type != "cloze_text":
            warnings.append(
                f"Sección {section} de inglés debería usar context_type 'cloze_text' "
                f"(recibido: '{question.context_type}')"
            )

        # Secciones 1 y 3 DEBEN tener component_name
        if section in _ING_REACT_SECTIONS:
            cn = getattr(question, "component_name", None)
            if not cn:
                errors.append(
                    f"Sección {section} de inglés requiere component_name "
                    "(NoticeSign o ChatUI)"
                )

        # Secciones 5-7 (comprensión lectora): contexto suficientemente largo
        if section in (5, 6) and question.context:
            word_count = len(question.context.split())
            if word_count < 120:
                warnings.append(
                    f"Sección {section}: contexto corto para comprensión lectora "
                    f"({word_count} palabras, recomendado ≥ 150)"
                )
                score -= 0.1

        # Verificar que dce_metadata existe para inglés
        dm = getattr(question, "dce_metadata", None)
        if dm is None:
            warnings.append("dce_metadata ausente en pregunta de inglés")
        elif isinstance(dm, dict) and not dm.get("grammar_tags"):
            warnings.append("dce_metadata.grammar_tags vacío — revisor no podrá filtrar por etiqueta")

    # ── 8. Dificultad estimada ────────────────────────────────────────

    if (
        question.difficulty_estimated is not None
        and not (0.1 <= question.difficulty_estimated <= 0.95)
    ):
        warnings.append("difficulty_estimated fuera de rango típico (0.1-0.95)")

    # ── 9. Visual programático ────────────────────────────────────────

    if question.media:
        media = question.media
        if not media.alt_text or len(media.alt_text.strip()) < 5:
            errors.append("alt_text del visual obligatorio (mín 5 chars)")
        if not media.visual_data:
            errors.append("visual_data vacío para media programática")
        else:
            # Verificar que visual_data es JSON válido
            try:
                json.loads(media.visual_data)
            except (json.JSONDecodeError, TypeError):
                errors.append("visual_data no es JSON válido")
        if not media.render_engine:
            errors.append("render_engine requerido para media programática")

    # ── Score final ───────────────────────────────────────────────────

    score = 0.0 if errors else max(0.0, min(1.0, score))

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "score": round(score, 2),
    }
