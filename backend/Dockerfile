FROM nikolaik/python-nodejs:python3.13-nodejs24-slim

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /workdir

RUN echo "WORKDIR: ${WORKDIR}"

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY uv.lock pyproject.toml ./
RUN uv sync --frozen --no-cache

COPY app ./app
COPY admin-frontend ./admin-frontend

RUN cd admin-frontend && npm install && npm run build
RUN cd app && uv sync --frozen --no-cache

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 