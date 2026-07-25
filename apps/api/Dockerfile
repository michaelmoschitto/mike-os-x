FROM python:3.11-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

ENV PATH="/opt/venv/bin:/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT="/opt/venv"

COPY pyproject.toml uv.lock ./
COPY . .

RUN uv sync --frozen --no-dev

RUN groupadd --gid 10001 app && \
    useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app

USER app

EXPOSE 8000

CMD ["/opt/venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--ws", "websockets"]

