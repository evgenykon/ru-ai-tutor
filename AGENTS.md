# AGENTS.md — Project Rules for AI Agents

## Project Context

- **Name:** ru-ai-tutor
- **Stack:** Nuxt 4 + Fastify 5 + Prisma 7 + PostgreSQL + Redis + nginx
- **Package managers:** pnpm (frontend), bun (api)
- **Node version:** 24
- **Styling:** Tailwind CSS + SCSS design tokens
- **State management:** Pinia (frontend)
- **Validation:** Joi (api)

## Code Style

- TypeScript strict mode everywhere
- No commented-out code — delete instead of comment
- No console.log in source files — use the Pino logger (api) or Nuxt's built-in logger
- Async/await for all async operations
- Prefer functional patterns over classes (except Prisma models)

## Frontend Conventions

- Use `<script setup lang="ts">` for all Vue components
- Use Pinia stores for shared state
- Access the API via `useNuxtApp().$api` (Axios instance)
- Runtime config via `useRuntimeConfig()` (public keys via `runtimeConfig.public`)
- Component names: multi-word (kebab-case in file names, PascalCase in usage)
- Place page components in `pages/`, reusable components in `components/`

## API Conventions

- Fastify plugin pattern for route registration
- Controllers handle request/response, services contain business logic
- Repositories contain Prisma queries
- Validation via Joi schemas
- Auth via HttpOnly JWT cookies (require-auth middleware)
- Service-to-service auth via HMAC-signed JWTs (API_KEY env var)
- Prometheus metrics for observability (prom-client)

## Docker Conventions

- Dev: `docker-compose.yml` with `Dockerfile.dev`, volume mounts, hot-reload
- Prod: `docker-compose.prod.yml` with production `Dockerfile`, healthchecks, resource limits
- No Postgres in prod compose — use managed/external PostgreSQL
- All services have healthchecks
- Named volumes for persistent data (postgres, redis)

## Development Workflow

- Always use `make` targets — never call npm, bun, pnpm, npx, or bunx directly
- `make dev` to start all services
- `make dev-down` to stop
- Prisma migrations via `make dev-migrate` / `make dev-migrate-create`
- Prisma client generation via `make dev-prisma-generate`
- Frontend is at `http://localhost:8089`
- API is at `http://localhost:8089/api`

## Security Rules

- API_KEY must be 32+ characters (validated at startup)
- No secrets in code — always use environment variables
- Internal endpoints use HMAC-signed JWTs
- Admin routes behind nginx basic auth (htpasswd)
- Rate limiting on auth endpoints via Redis-backed fastify-rate-limit

## Naming Conventions

- **Files:** kebab-case (`user-profile.vue`, `auth.routes.ts`)
- **Classes/interfaces:** PascalCase (`UserProfile`, `AuthPayload`)
- **Variables/functions:** camelCase (`getUserById`, `userService`)
- **Environment variables:** UPPER_SNAKE_CASE (`DATABASE_URL`, `API_KEY`)

## Before Committing

1. Run lint: `make tools-lint`
2. Run type-check: `make tools-typecheck`
3. Check `git diff` — no secrets, no debug code, no commented code
4. Verify migrations are up to date
