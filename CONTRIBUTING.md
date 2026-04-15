# Contribuir a Simulador Saber 11

## Flujo de ramas

- Rama principal: main
- Rama de integración: develop
- Trabajo diario: feature/<nombre>, fix/<nombre>, chore/<nombre>

Flujo recomendado:

1. Actualiza main y develop.
2. Crea tu rama desde develop.
3. Abre Pull Request hacia develop.
4. Usa main solo para releases o hotfixes críticos.

## Convención de commits

Formato sugerido:

type(scope): descripcion corta

Tipos más usados:

- feat
- fix
- docs
- refactor
- test
- chore
- ci

Ejemplos:

- feat(gateway): agregar validacion de rol para rutas admin
- fix(frontend): corregir redireccion en login de docente
- docs(todo): actualizar avance de sprint 4

## Validaciones antes de abrir PR

Gateway:

1. pnpm --dir gateway install
2. pnpm --dir gateway lint
3. pnpm --dir gateway test

Frontend:

1. pnpm --dir frontend install
2. pnpm --dir frontend lint
3. pnpm --dir frontend build

Python:

1. pip install ruff
2. ruff check shared/
3. ruff check services/

Infra local:

1. docker compose config --quiet

## Pull Requests

- Mantén PRs pequeños y con alcance claro.
- Incluye evidencia de pruebas ejecutadas.
- Si hay cambios visuales, agrega capturas.
- Actualiza documentación cuando cambie comportamiento o API.