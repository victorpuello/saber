"""Comando para cargar la taxonomía DCE en la base de datos.

Comportamiento: upsert por código en todos los niveles (Area → Competency →
Assertion → Evidence → ContentComponent). Ejecutar en cualquier momento es
seguro y no produce duplicados. Útil para aplicar cambios de taxonomía
(ej. corrección de competencias de inglés) en entornos ya inicializados.
"""

import asyncio
import logging

from saber11_shared.database import create_db_engine, create_session_factory
from sqlalchemy import select

from .config import settings
from .models import Area, Assertion, Competency, ContentComponent, Evidence
from .seed import TAXONOMY_SEED

logger = logging.getLogger(__name__)


async def load_taxonomy() -> dict:
    """Carga la taxonomía DCE con upsert por código (completamente idempotente)."""
    engine = create_db_engine(settings.database_url)
    session_factory = create_session_factory(engine)

    stats = {
        "areas_created": 0,
        "areas_updated": 0,
        "competencies_created": 0,
        "competencies_updated": 0,
        "assertions_created": 0,
        "assertions_updated": 0,
        "evidences_created": 0,
        "evidences_updated": 0,
        "components_created": 0,
        "components_updated": 0,
    }

    async with session_factory() as session:
        for area_data in TAXONOMY_SEED:
            # ── Upsert Area ──────────────────────────────────────────────────
            result = await session.execute(
                select(Area).where(Area.code == area_data["code"])
            )
            area = result.scalar_one_or_none()

            if area is None:
                area = Area(
                    name=area_data["name"],
                    code=area_data["code"],
                    total_questions=area_data["total_questions"],
                    description=area_data.get("description"),
                )
                session.add(area)
                await session.flush()
                stats["areas_created"] += 1
                logger.info("Área creada: %s", area_data["code"])
            else:
                area.name = area_data["name"]
                area.total_questions = area_data["total_questions"]
                area.description = area_data.get("description")
                stats["areas_updated"] += 1
                logger.info("Área actualizada: %s", area_data["code"])

            # ── Upsert Competencies ──────────────────────────────────────────
            for comp_data in area_data.get("competencies", []):
                result = await session.execute(
                    select(Competency).where(Competency.code == comp_data["code"])
                )
                comp = result.scalar_one_or_none()

                if comp is None:
                    comp = Competency(
                        area_id=area.id,
                        name=comp_data["name"],
                        code=comp_data["code"],
                        description=comp_data["description"],
                        weight_percentage=comp_data.get("weight_percentage"),
                        cognitive_level=comp_data.get("cognitive_level"),
                    )
                    session.add(comp)
                    await session.flush()
                    stats["competencies_created"] += 1
                    logger.info("  Competencia creada: %s", comp_data["code"])
                else:
                    comp.name = comp_data["name"]
                    comp.description = comp_data["description"]
                    comp.weight_percentage = comp_data.get("weight_percentage")
                    comp.cognitive_level = comp_data.get("cognitive_level")
                    comp.area_id = area.id
                    stats["competencies_updated"] += 1
                    logger.info("  Competencia actualizada: %s", comp_data["code"])

                # ── Upsert Assertions ────────────────────────────────────────
                for asr_data in comp_data.get("assertions", []):
                    result = await session.execute(
                        select(Assertion).where(Assertion.code == asr_data["code"])
                    )
                    asr = result.scalar_one_or_none()

                    if asr is None:
                        asr = Assertion(
                            competency_id=comp.id,
                            code=asr_data["code"],
                            statement=asr_data["statement"],
                            description=asr_data.get("description"),
                        )
                        session.add(asr)
                        await session.flush()
                        stats["assertions_created"] += 1
                    else:
                        asr.statement = asr_data["statement"]
                        asr.description = asr_data.get("description")
                        asr.competency_id = comp.id
                        stats["assertions_updated"] += 1

                    # ── Upsert Evidences ─────────────────────────────────────
                    for ev_data in asr_data.get("evidences", []):
                        result = await session.execute(
                            select(Evidence).where(Evidence.code == ev_data["code"])
                        )
                        ev = result.scalar_one_or_none()

                        if ev is None:
                            ev = Evidence(
                                assertion_id=asr.id,
                                code=ev_data["code"],
                                observable_behavior=ev_data["observable_behavior"],
                                description=ev_data.get("description"),
                            )
                            session.add(ev)
                            stats["evidences_created"] += 1
                        else:
                            ev.observable_behavior = ev_data["observable_behavior"]
                            ev.description = ev_data.get("description")
                            ev.assertion_id = asr.id
                            stats["evidences_updated"] += 1

            # ── Upsert ContentComponents ─────────────────────────────────────
            for cc_data in area_data.get("content_components", []):
                result = await session.execute(
                    select(ContentComponent).where(
                        ContentComponent.code == cc_data["code"]
                    )
                )
                cc = result.scalar_one_or_none()

                if cc is None:
                    cc = ContentComponent(
                        area_id=area.id,
                        name=cc_data["name"],
                        code=cc_data["code"],
                    )
                    session.add(cc)
                    stats["components_created"] += 1
                else:
                    cc.name = cc_data["name"]
                    cc.area_id = area.id
                    stats["components_updated"] += 1

        await session.commit()

    await engine.dispose()
    return stats


async def main():
    logging.basicConfig(level=logging.INFO)
    logger.info("Cargando taxonomía DCE (upsert idempotente)...")
    stats = await load_taxonomy()
    logger.info("Taxonomía cargada: %s", stats)


if __name__ == "__main__":
    asyncio.run(main())
