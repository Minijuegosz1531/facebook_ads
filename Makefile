# Switch between the three API implementations on the same host port (8000).
#
# All targets first stop anything running, then start the chosen profile in
# background. The frontends (apps/web, apps/web-angular) keep pointing to
# http://localhost:8000 regardless of which backend is active.
#
#   make python      → FastAPI (Python, stub mode)
#   make go          → Go API  (stub mode, in-process queue)
#   make nest        → NestJS  (stub mode)
#   make python-full → FastAPI + Postgres + Redis + arq worker
#   make go-full     → Go API  + Redis + asynq worker
#   make down        → stop everything
#   make logs        → tail logs of running containers
#   make status      → show running services
#   make help        → list all targets

.PHONY: python go nest python-full go-full down logs status help

python: down
	docker compose --profile python up --build -d
	@echo "✓ FastAPI on http://localhost:8000  ·  curl localhost:8000/health"

go: down
	docker compose --profile go up --build -d
	@echo "✓ Go API on http://localhost:8000  ·  curl localhost:8000/health"

nest: down
	docker compose --profile nest up --build -d
	@echo "✓ NestJS on http://localhost:8000  ·  curl localhost:8000/health"

python-full: down
	docker compose --profile python-full up --build -d
	@echo "✓ FastAPI + Postgres + Redis + arq worker on http://localhost:8000"

go-full: down
	docker compose --profile go-full up --build -d
	@echo "✓ Go API + Redis + asynq worker on http://localhost:8000"

down:
	@docker compose --profile python --profile go --profile nest \
	                --profile python-full --profile go-full down 2>/dev/null || true

logs:
	docker compose logs -f

status:
	docker compose ps

help:
	@grep -E '^[a-zA-Z][a-zA-Z_-]+:' Makefile | grep -v '^\.PHONY' | sed 's/:.*$$//' | sort | uniq | sed 's/^/  /'
