FROM python:3.12-slim

WORKDIR /app

# Copiar shared primero para cache de capas
COPY shared/ /shared/
RUN pip install --no-cache-dir /shared/

# Dependencias del servicio
COPY services/question-bank/pyproject.toml ./
RUN pip install --no-cache-dir .

COPY services/question-bank/app/ ./app/

EXPOSE 3001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"]
