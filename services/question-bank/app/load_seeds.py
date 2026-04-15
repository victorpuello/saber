"""Comando para cargar la taxonomía DCE en la base de datos."""

import asyncio
import logging

from saber11_shared.database import create_db_engine, create_session_factory
from sqlalchemy import select

from .config import settings
from .models import Area, Assertion, Competency, ContentComponent, Evidence
from .seed import TAXONOMY_SEED

logger = logging.getLogger(__name__)


async def load_taxonomy() -> dict:
    """Carga la taxonomía DCE. Omite registros que ya existen (idempotente)."""
    engine = create_db_engine(settings.database_url)
    session_factory = create_session_factory(engine)

    stats = {"areas": 0, "competencies": 0, "assertions": 0, "evidences": 0, "components": 0}

    async with session_factory() as session:
        for area_data in TAXONOMY_SEED:
            # Verificar si el área ya existe
            existing = await session.execute(
                select(Area).where(Area.code == area_data["code"])
            )
            if existing.scalar_one_or_none():
                logger.info("Área %s ya existe, omitiendo", area_data["code"])
                continue

            area = Area(
                name=area_data["name"],
                code=area_data["code"],
                total_questions=area_data["total_questions"],
                description=area_data.get("description"),
            )
            session.add(area)
            await session.flush()
            stats["areas"] += 1

            for comp_data in area_data.get("competencies", []):
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
                stats["competencies"] += 1

                for asr_data in comp_data.get("assertions", []):
                    asr = Assertion(
                        competency_id=comp.id,
                        code=asr_data["code"],
                        statement=asr_data["statement"],
                        description=asr_data.get("description"),
                    )
                    session.add(asr)
                    await session.flush()
                    stats["assertions"] += 1

                    for ev_data in asr_data.get("evidences", []):
                        ev = Evidence(
                            assertion_id=asr.id,
                            code=ev_data["code"],
                            observable_behavior=ev_data["observable_behavior"],
                            description=ev_data.get("description"),
                        )
                        session.add(ev)
                        stats["evidences"] += 1

            for cc_data in area_data.get("content_components", []):
                cc = ContentComponent(
                    area_id=area.id,
                    name=cc_data["name"],
                    code=cc_data["code"],
                )
                session.add(cc)
                stats["components"] += 1

        await session.commit()

    await engine.dispose()
    return stats


async def main():
    logging.basicConfig(level=logging.INFO)
    logger.info("Cargando taxonomía DCE...")
    stats = await load_taxonomy()
    logger.info("Taxonomía cargada: %s", stats)


if __name__ == "__main__":
    asyncio.run(main())
