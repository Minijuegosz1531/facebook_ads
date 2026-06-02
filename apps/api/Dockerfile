FROM python:3.13-slim

WORKDIR /app

# System deps for the Meta Ads CLI / asyncpg builds.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Listens on $PORT (default 8000). Compose overrides PORT to keep the host port
# consistent across the three API implementations.
ENV PORT=8000
EXPOSE 8000

# Shell form so the $PORT expansion happens at container start.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
