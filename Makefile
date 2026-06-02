# Switch between the three API implementations + the two frontends.
#
# APIs share host port 8000 and network alias `api`, so only ONE is active at
# a time — `make python`, `make go`, `make nest` each stop the other APIs
# before starting. Webs are independent: `make web` and `make web-angular`
# do NOT stop the running API, so you can run an API + a web together.
#
#   make python      → FastAPI       (stub)     · localhost:8000
#   make go          → Go API        (stub)     · localhost:8000
#   make nest        → NestJS        (stub)     · localhost:8000
#   make python-full → FastAPI + Postgres + Redis + arq worker
#   make go-full     → Go API + Redis + asynq worker
#
#   make web         → Next.js       (prod)     · localhost:3000  (needs an API running)
#   make web-angular → Angular       (nginx)    · localhost:4200  (needs an API running)
#
#   make down        → stop everything
#   make logs        → tail logs of running containers
#   make status      → list running services
#   make help        → list targets

API_SERVICES = api-python api-python-full api-go api-go-full api-nest worker-python worker-go postgres redis
WEB_SERVICES = web web-angular

.PHONY: python go nest python-full go-full web web-angular \
        down logs status help _stop-apis _stop-webs

# Internal: stop & remove all API containers (keeps webs).
_stop-apis:
	@docker compose rm -fsv $(API_SERVICES) 2>/dev/null || true

# Internal: stop & remove all web containers (keeps APIs).
_stop-webs:
	@docker compose rm -fsv $(WEB_SERVICES) 2>/dev/null || true

python: _stop-apis
	docker compose --profile python up --build -d
	@echo "✓ FastAPI on http://localhost:8000  ·  curl localhost:8000/health"

go: _stop-apis
	docker compose --profile go up --build -d
	@echo "✓ Go API on http://localhost:8000  ·  curl localhost:8000/health"

nest: _stop-apis
	docker compose --profile nest up --build -d
	@echo "✓ NestJS on http://localhost:8000  ·  curl localhost:8000/health"

python-full: _stop-apis
	docker compose --profile python-full up --build -d
	@echo "✓ FastAPI + Postgres + Redis + arq worker on http://localhost:8000"

go-full: _stop-apis
	docker compose --profile go-full up --build -d
	@echo "✓ Go API + Redis + asynq worker on http://localhost:8000"

web: _stop-webs
	docker compose --profile web up --build -d
	@echo "✓ Next.js on http://localhost:3000  (proxies to whichever API is up)"

web-angular: _stop-webs
	docker compose --profile web-angular up --build -d
	@echo "✓ Angular on http://localhost:4200  (proxies to whichever API is up)"

down:
	@docker compose --profile python --profile go --profile nest \
	                --profile python-full --profile go-full \
	                --profile web --profile web-angular down --remove-orphans 2>/dev/null || true

logs:
	docker compose logs -f

status:
	docker compose ps

help:
	@grep -E '^[a-zA-Z][a-zA-Z_-]+:' Makefile | grep -v '^\.PHONY' | grep -v '^_' | sed 's/:.*$$//' | sort | uniq | sed 's/^/  /'
