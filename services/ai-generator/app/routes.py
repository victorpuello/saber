"""Rutas API del AI Generator — generación individual, batch, stats, proveedores."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from saber11_shared.auth import CurrentUser, require_role
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db
from .generator import generate_question, invalidate_taxonomy_cache
from .key_store import (
    encrypt_api_key,
    get_all_providers,
    get_enabled_providers,
    get_provider_config,
    upsert_provider,
)
from .schemas import (
    AIProvider,
    BatchResponse,
    GenerateBatchRequest,
    GenerateRequest,
    GenerateResponse,
    GenerationStats,
    ProviderInfo,
    ProviderSetupRequest,
    ProviderUpdateRequest,
    QueueStatus,
)
from .validator import validate_question

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai-generator"])


def _provider_to_info(p) -> ProviderInfo:
    return ProviderInfo(
        provider=p.provider,
        display_name=p.display_name,
        default_model=p.default_model,
        is_enabled=p.is_enabled,
        max_tokens=p.max_tokens,
        temperature=p.temperature,
        has_api_key=p.api_key_encrypted is not None,
    )


# Contadores en memoria (en producción: Redis o base de datos)
_stats = {
    "generated": 0,
    "valid": 0,
    "invalid": 0,
    "by_area": {},
    "by_model": {},
}


# ── Proveedores ───────────────────────────────────────────────────────


@router.get("/providers", response_model=list[ProviderInfo])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Lista todos los proveedores configurados (sin exponer API keys)."""
    providers = await get_all_providers(db)
    return [_provider_to_info(p) for p in providers]


@router.post("/providers", response_model=ProviderInfo)
async def setup_provider(
    req: ProviderSetupRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Configura un proveedor IA con su API key (se cifra en BD)."""
    defaults = {
        "anthropic": ("Anthropic (Claude)", "claude-sonnet-4-20250514"),
        "gemini": ("Google Gemini", "gemini-2.5-flash"),
    }
    display, model = defaults.get(req.provider.value, (req.provider.value, ""))
    config = await upsert_provider(
        db,
        provider=req.provider.value,
        display_name=req.display_name or display,
        default_model=req.default_model or model,
        api_key=req.api_key,
        is_enabled=req.is_enabled,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
    )
    await db.commit()
    return _provider_to_info(config)


@router.patch("/providers/{provider}", response_model=ProviderInfo)
async def update_provider(
    provider: AIProvider,
    req: ProviderUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Actualiza configuración de un proveedor existente."""
    config = await get_provider_config(db, provider.value)
    if not config:
        raise HTTPException(404, f"Proveedor no encontrado: {provider.value}")
    if req.display_name is not None:
        config.display_name = req.display_name
    if req.default_model is not None:
        config.default_model = req.default_model
    if req.is_enabled is not None:
        config.is_enabled = req.is_enabled
    if req.max_tokens is not None:
        config.max_tokens = req.max_tokens
    if req.temperature is not None:
        config.temperature = req.temperature
    if req.api_key is not None:
        config.api_key_encrypted = encrypt_api_key(req.api_key)
    await db.commit()
    return _provider_to_info(config)


@router.post("/providers/{provider}/test")
async def test_provider(
    provider: AIProvider,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Prueba la conexión con un proveedor enviando una solicitud mínima."""
    import anthropic as anthropic_sdk
    import google.generativeai as genai_sdk

    from .key_store import decrypt_api_key

    config = await get_provider_config(db, provider.value)
    if not config or not config.api_key_encrypted:
        raise HTTPException(400, "Proveedor sin API key configurada.")

    try:
        api_key = decrypt_api_key(config.api_key_encrypted)
    except Exception:
        raise HTTPException(500, "Error descifrando la API key almacenada.")

    try:
        if provider.value == "anthropic":
            client = anthropic_sdk.AsyncAnthropic(api_key=api_key)
            resp = await client.messages.create(
                model=config.default_model,
                max_tokens=10,
                messages=[{"role": "user", "content": "Di solo 'ok'."}],
            )
            model_used = resp.model
        elif provider.value == "gemini":
            genai_sdk.configure(api_key=api_key)
            model = genai_sdk.GenerativeModel(model_name=config.default_model)
            resp = await model.generate_content_async("Di solo 'ok'.")
            model_used = config.default_model
        else:
            raise HTTPException(400, f"Proveedor no soportado: {provider.value}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Test de proveedor %s falló: %s", provider.value, exc)
        return {"status": "error", "message": str(exc)[:200]}

    return {"status": "ok", "model": model_used}


# ── Generar una pregunta ──────────────────────────────────────────────


@router.post("/generate", response_model=GenerateResponse)
async def generate_single(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera una pregunta IA con validación automática y la envía al Question Bank."""
    try:
        question, token_usage, provider_name, model_name = await generate_question(
            db=db,
            area_code=req.area_code,
            provider=req.provider.value if req.provider else None,
            model_override=req.model,
            competency_code=req.competency_code,
            cognitive_level=req.cognitive_level,
            include_visual=req.include_visual,
            visual_type=req.visual_type.value if req.visual_type else None,
            english_section=req.english_section,
        )
    except ValueError as e:
        raise HTTPException(422, str(e)) from e
    except Exception as e:
        logger.exception("Error generando pregunta")
        raise HTTPException(502, f"Error del servicio de IA: {e!s}") from e

    # Validar calidad
    validation = validate_question(question, req.area_code)

    # Actualizar stats
    full_model = f"{provider_name}/{model_name}"
    _stats["generated"] += 1
    _stats["by_area"][req.area_code] = _stats["by_area"].get(req.area_code, 0) + 1
    _stats["by_model"][full_model] = _stats["by_model"].get(full_model, 0) + 1

    if validation["is_valid"]:
        _stats["valid"] += 1
        try:
            await _send_to_question_bank(question)
        except Exception:
            logger.exception("Error enviando pregunta al Question Bank")
            validation["warnings"].append(
                "Pregunta válida pero no se pudo enviar al Question Bank"
            )
    else:
        _stats["invalid"] += 1

    return GenerateResponse(
        question=question,
        validation=validation,
        ai_model=full_model,
        token_usage=token_usage,
    )


# ── Generación en lote ────────────────────────────────────────────────


@router.post("/generate/batch", response_model=BatchResponse)
async def generate_batch(
    req: GenerateBatchRequest,
    db: AsyncSession = Depends(get_db),
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Genera un lote de preguntas IA."""
    questions: list[GenerateResponse] = []
    errors: list[str] = []
    total_valid = 0

    for i in range(req.count):
        try:
            question, token_usage, provider_name, model_name = await generate_question(
                db=db,
                area_code=req.area_code,
                provider=req.provider.value if req.provider else None,
                model_override=req.model,
                competency_code=req.competency_code,
                cognitive_level=req.cognitive_level,
                include_visual=req.include_visual,
                visual_type=req.visual_type.value if req.visual_type else None,
            )
            validation = validate_question(question, req.area_code)

            full_model = f"{provider_name}/{model_name}"
            _stats["generated"] += 1
            _stats["by_area"][req.area_code] = _stats["by_area"].get(req.area_code, 0) + 1
            _stats["by_model"][full_model] = _stats["by_model"].get(full_model, 0) + 1

            if validation["is_valid"]:
                _stats["valid"] += 1
                total_valid += 1
                try:
                    await _send_to_question_bank(question)
                except Exception:
                    logger.exception("Error enviando pregunta %d al QB", i + 1)
            else:
                _stats["invalid"] += 1

            questions.append(
                GenerateResponse(
                    question=question,
                    validation=validation,
                    ai_model=full_model,
                    token_usage=token_usage,
                )
            )
        except Exception as e:
            logger.exception("Error generando pregunta %d/%d", i + 1, req.count)
            errors.append(f"Pregunta {i + 1}: {e!s}")

    return BatchResponse(
        total_requested=req.count,
        total_generated=len(questions),
        total_valid=total_valid,
        questions=questions,
        errors=errors,
    )


# ── Estado de cola ────────────────────────────────────────────────────


@router.get("/queue", response_model=QueueStatus)
async def get_queue_status(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estado de la cola de generación (simplificado: contadores en memoria)."""
    return QueueStatus(
        completed_today=_stats["generated"],
        failed_today=_stats["invalid"],
    )


# ── Estadísticas de generación ────────────────────────────────────────


@router.get("/stats", response_model=GenerationStats)
async def get_generation_stats(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Estadísticas de generación IA con tasa de aprobación/rechazo."""
    total = _stats["generated"]
    valid = _stats["valid"]
    return GenerationStats(
        total_generated=total,
        total_approved=valid,
        total_rejected=_stats["invalid"],
        approval_rate=round(valid / total, 2) if total > 0 else 0.0,
        by_area=_stats["by_area"],
        by_model=_stats["by_model"],
    )


# ── Cache ─────────────────────────────────────────────────────────────


@router.post("/cache/invalidate")
async def invalidate_cache(
    _user: CurrentUser = Depends(require_role("ADMIN")),
):
    """Invalida el cache de taxonomía DCE."""
    invalidate_taxonomy_cache()
    return {"status": "ok", "message": "Cache de taxonomía invalidado"}


# =============================================================================
# Helper: enviar pregunta al Question Bank
# =============================================================================


async def _send_to_question_bank(question) -> None:
    """Envía una pregunta generada al Question Bank como PENDING_REVIEW."""
    internal_headers = {
        "X-User-Id": "0",
        "X-User-Role": "ADMIN",
        "X-Service": "ai-generator",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{settings.question_bank_url}/api/taxonomy/areas/by-code/{question.area_code}",
            headers=internal_headers,
        )
        resp.raise_for_status()
        area = resp.json()

        competencies = area.get("competencies", [])
        competency = next(
            (c for c in competencies if c.get("code") == question.competency_code),
            None,
        )
        if not competency:
            msg = f"Competencia no encontrada en QB: {question.competency_code}"
            raise ValueError(msg)

        assertions = competency.get("assertions", [])
        assertion = next(
            (a for a in assertions if a.get("code") == question.assertion_code),
            None,
        )
        if not assertion:
            msg = f"Afirmación no encontrada en QB: {question.assertion_code}"
            raise ValueError(msg)

        evidence_id = None
        if question.evidence_code:
            evidence = next(
                (
                    e
                    for e in assertion.get("evidences", [])
                    if e.get("code") == question.evidence_code
                ),
                None,
            )
            if not evidence:
                msg = f"Evidencia no encontrada en QB: {question.evidence_code}"
                raise ValueError(msg)
            evidence_id = evidence.get("id")

        content_component_id = None
        if question.content_component_code:
            content_component = next(
                (
                    cc
                    for cc in area.get("content_components", [])
                    if cc.get("code") == question.content_component_code
                ),
                None,
            )
            if not content_component:
                msg = (
                    "Componente de contenido no encontrado en QB: "
                    f"{question.content_component_code}"
                )
                raise ValueError(msg)
            content_component_id = content_component.get("id")

        payload = {
            "area_id": area["id"],
            "competency_id": competency["id"],
            "assertion_id": assertion["id"],
            "evidence_id": evidence_id,
            "content_component_id": content_component_id,
            "context": question.context,
            "context_type": question.context_type,
            "stem": question.stem,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "correct_answer": question.correct_answer,
            "explanation_correct": question.explanation_correct,
            "explanation_a": question.explanation_a,
            "explanation_b": question.explanation_b,
            "explanation_c": question.explanation_c,
            "explanation_d": question.explanation_d,
            "cognitive_process": question.cognitive_process,
            "difficulty_estimated": question.difficulty_estimated,
            "source": "AI",
            "english_section": question.english_section,
            "mcer_level": question.mcer_level,
        }

        resp = await client.post(
            f"{settings.question_bank_url}/api/questions",
            headers=internal_headers,
            json=payload,
        )
        resp.raise_for_status()

        if question.media:
            q_data = resp.json()
            media_payload = {
                "media_type": question.media.media_type,
                "source": "PROGRAMMATIC",
                "visual_data": question.media.visual_data,
                "render_engine": question.media.render_engine,
                "alt_text": question.media.alt_text,
                "alt_text_detailed": question.media.alt_text_detailed,
                "display_mode": question.media.display_mode,
                "is_essential": True,
                "position": 0,
            }
            await client.post(
                f"{settings.question_bank_url}/api/questions/{q_data['id']}/media/programmatic",
                headers=internal_headers,
                json=media_payload,
            )
