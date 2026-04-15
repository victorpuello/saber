# Simulador Saber 11

Plataforma satelital de microservicios para preparación del examen Saber 11, integrada con [Kampus](https://kampus.ieplayasdelviento.edu.co).

## Arquitectura

| Servicio | Stack | Puerto |
|---|---|---|
| API Gateway | Node.js / Express | 3000 |
| Question Bank | Python / FastAPI | 3001 |
| AI Generator | Python / FastAPI | 3002 |
| Exam Engine | Python / FastAPI | 3003 |
| Diagnostic Engine | Python / FastAPI | 3004 |
| Study Planner | Python / FastAPI | 3005 |
| Analytics | Python / FastAPI | 3006 |
| Notifications | Python / Celery | 3007 |
| Frontend | React / Vite | 5174 |

## Requisitos

- Docker y Docker Compose
- Node.js 20+ y pnpm
- Python 3.12+

## Inicio rápido

```bash
cp .env.example .env
docker compose up -d
```

El frontend estará disponible en `http://localhost:5174` y el API Gateway en `http://localhost:3000`.

## Documentación

- [Arquitectura](docs/arquitectura_simulador_saber11.md)
- [Estrategia visual](docs/estrategia_imagenes_saber11.md)
- [Integración Kampus](docs/integracion_kampus_produccion.md)
- [Plan de trabajo](docs/TODO.md)

## Publicación en GitHub

La rama principal del repositorio es `main` y se recomienda usar `develop` para integración.

Primer push a un repositorio remoto nuevo:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

Flujo recomendado para trabajo diario:

```bash
git checkout -b develop
git push -u origin develop
git checkout -b feature/mi-cambio develop
```

Guía de colaboración completa en [CONTRIBUTING.md](CONTRIBUTING.md).
