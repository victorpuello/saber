FROM python:3.12-slim
WORKDIR /app
COPY shared/ /shared/
RUN pip install --no-cache-dir /shared/
COPY services/notifications/ ./
RUN pip install --no-cache-dir .
EXPOSE 3007
CMD ["python", "-m", "app.main"]
