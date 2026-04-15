FROM python:3.12-slim
WORKDIR /app
COPY shared/ /shared/
RUN pip install --no-cache-dir /shared/
COPY services/analytics/ ./
RUN pip install --no-cache-dir .
EXPOSE 3006
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3006"]
