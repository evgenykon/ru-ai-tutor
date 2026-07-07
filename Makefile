.PHONY: build build-dev up down dev dev-down logs-prod logs-dev run-dev-frontend run-dev-api dev-migrate dev-migrate-create dev-prisma-generate clear-space

default: dev

# Production
build:
	docker compose -f docker-compose.prod.yml build

up:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.prod.yml down

logs-prod:
	docker compose -f docker-compose.prod.yml logs -f

# Development
build-dev:
	docker compose -f docker-compose.yml build

dev:
	docker compose -f docker-compose.yml up

dev-up:
	docker compose -f docker-compose.yml up -d

dev-down:
	docker compose -f docker-compose.yml down

logs-dev:
	docker compose -f docker-compose.yml logs -f

run-dev-frontend:
	docker compose -f docker-compose.yml run --rm frontend sh

run-dev-api:
	docker compose -f docker-compose.yml run --rm api sh

dev-migrate:
	docker compose -f docker-compose.yml exec api sh -c "bun run migrate:deploy"

dev-migrate-create:
	docker compose -f docker-compose.yml exec api sh -c "bun run migrate:create --name $(name)"

dev-prisma-generate:
	docker compose -f docker-compose.yml exec api sh -c "bun run prisma:generate"

clear-space:
	docker system prune -af && docker image prune -af && docker volume prune -af && docker builder prune -f

tools-lint:
	docker compose -f docker-compose.yml exec api npx eslint . && docker compose -f docker-compose.yml exec frontend npx eslint .

tools-typecheck-api:
	docker compose -f docker-compose.yml exec api npx tsc --noEmit
