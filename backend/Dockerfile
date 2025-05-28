FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY admin-frontend/package*.json ./admin-frontend/
COPY admin-frontend/.env ./admin-frontend/
RUN cd admin-frontend && npm install

COPY admin-frontend/ ./admin-frontend/
RUN cd admin-frontend && npm run build

COPY uv.lock pyproject.toml ./
RUN uv sync --frozen --no-cache

COPY . .

RUN useradd -m -u 1000 appuser
RUN mkdir -p /app/data && chown -R appuser:appuser /app
RUN chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 