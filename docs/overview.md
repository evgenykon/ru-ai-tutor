# ru-ai-tutor — Codebase Overview

**AI-powered Russian-language tutor platform.** Users navigate structured courses (modules, lessons, steps) assisted by an AI avatar with TTS, speech recognition, and LLM chat.

---

## Stack

| Layer | Technology | Package Manager |
|-------|-----------|-----------------|
| Frontend | Nuxt 4 (SPA) + Vue 3 + Pinia + Tailwind CSS + SCSS | pnpm |
| API | Fastify 5 + Prisma 7 + PostgreSQL + Redis | bun |
| WebSocket | Bun native WebSocket server | bun |
| Proxy | nginx (single entry point on port 8089) | — |
| Runtime | Node 24, TypeScript strict mode everywhere | — |

---

## Architecture

```
nginx :8089
 ├── / → frontend (Nuxt SPA :3000)
 ├── /api → api (Fastify :3001)
 └── /socket → socket (Bun WebSocket :3002)
```

All services run in Docker via docker-compose. Dev compose includes PostgreSQL and Redis. Prod compose expects external managed PostgreSQL.

**Makefile** is the single entry point: `make dev`, `make build`, `make dev-migrate`, etc.

---

## Database (Prisma 7 — PostgreSQL)

16 models across 13 tables:

- **Auth & RBAC:** `Permission`, `Role`, `RolePermission`, `User`, `UserRole`
- **Content:** `Course`, `Module`, `Lesson`, `LessonStep`
- **Learning:** `Session` (with JSON progress blob)
- **AI:** `Assistant` (model, prompt, TTS settings, avatars, videos)
- **Credentials & Keys:** `ServiceCredential`, `ApiKey`
- **Billing:** `UsageLog` (service, model, tokens, cost)
- **Relations:** `UserCourse`, `UserAssistant`

25 migrations, seed file at `api/prisma/seed.ts`.

---

## API (Fastify 5 — 17 route modules, ~40 endpoints)

### Route Groups

| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| Auth | `/auth` | login, logout, me, Yandex OAuth |
| Users | `/users` | list, getById, delete |
| API Keys | `/api-keys` | CRUD with SHA-256 hashing |
| Assistants | `/assistants` | Full CRUD (LLM config, TTS, avatar, videos) |
| Courses | `/courses` | CRUD, pagination, search, slug validation |
| Modules | `/courses/:courseId/modules` | CRUD within course |
| Lessons | `/modules/:moduleId/lessons` | CRUD within module |
| Lesson Steps | `/lessons/:lessonId/steps` | CRUD with reorder, slide types |
| Sessions | `/sessions` | create, list, progress |
| LLM | `/internal/llm/chat` | Chat + streaming SSE (OpenRouter / Yandex AI) |
| TTS | `/internal/tts/synthesize` | Yandex SpeechKit synthesis |
| Credentials | `/credentials` | upsert/get/delete service keys |
| Upload | `/upload` | File upload (images, PDFs, videos) |
| Usage | `/usage` | Paginated logs with service filter |
| Yandex | `/yandex-models`, `/yandex-oauth` | Model list, OAuth2 flow |
| Avatars | `/avatars` | Hardcoded list of 4 avatars |

**Auth:** JWT in HttpOnly cookies. `require-auth` middleware attaches `request.user`.

**Pattern:** Controllers contain all business logic (no separate service layer despite AGENTS.md convention). Prisma queries are written directly in controllers.

---

## Frontend (Nuxt 4 SPA — 17 pages)

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Placeholder |
| `/login` | Login | Email/password form + Yandex OAuth |
| `/users` | Users | Table with search |
| `/api-keys` | Credentials | Yandex TTS/LLM key management |
| `/usage` | Usage | Logs with filters, stats, pagination |
| `/assistants` | Assistants | List + create modal |
| `/assistants/:id` | Assistant Editor | Prompt, model, TTS, avatar, videos |
| `/courses` | Courses | Search, filters, pagination, create |
| `/courses/:id` | Course Layout | Sidebar (modules tree) + AI Generator |
| `/courses/:id/modules/:moduleId` | Module Editor | Name, description, lessons |
| `/courses/:id/modules/:moduleId/lessons/:lessonId` | Lesson Editor | Timeline steps (text/image/pdf) |
| `/sessions` | Sessions | List with continue button |
| `/session/:id` | **Learning Interface** | Main 3-column UI (1220 lines) |

### Key Components

- **SessionControls.vue** — Draggable floating toolbar: push-to-talk, chat toggle, play/pause, prev/next step
- **CourseAIAgent.vue** — Floating AI course generator: "Plan" (discuss) and "Build" (auto-generate modules/lessons/steps via LLM with JSON command parsing)

### Composables

- **useSpeechRecognition.ts** — Wraps Web Speech API

### Store

- **auth.ts** (Pinia) — user state, login, logout, fetchUser

### Real-Time Flow (Session page)

```
Frontend ←[WebSocket]→ Socket Server (:3002)
                            ├── /internal/tts/synthesize (API)
                            └── /internal/llm/chat (API)
```

- `tts-request` → API synthesizes OGG audio → broadcast to session clients
- `user-message` → API generates LLM response → broadcast text → if voice enabled, auto-TTS → broadcast audio

---

## Socket Server (Bun — 1 file)

- Port 3002, WebSocket at `/socket?sessionId=xxx`
- Per-session client pool (Map of Sets)
- Forwards TTS and LLM requests to API via HTTP, broadcasts results

---

## nginx

- Single entry point on port 8089
- Routes: `/` → frontend, `/api/*` → API, `/socket` → WebSocket
- `client_max_body_size: 50M`
- Prod: gzip, caching (nuxt_cache 1 year), extended logging

---

## Environment

Key variables (see `.env.example`):

- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `API_KEY` — Service-to-service auth (32+ chars)
- `APP_JWT_SECRET` — JWT signing (32+ chars)
- `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` — Yandex OAuth
- `NUXT_PUBLIC_BASE_URL` — Public frontend URL

---

## Project Structure

```
ru-ai-tutor/
├── api/                  # Fastify 5 backend
│   ├── prisma/           # Schema, migrations, seed
│   └── src/
│       ├── controllers/  # 17 controllers
│       ├── routes/       # 17 route plugins
│       ├── middleware/   # require-auth
│       ├── helpers/      # JWT tokens
│       └── index.ts      # Fastify app entry
├── frontend/             # Nuxt 4 SPA
│   ├── pages/            # 17 page files
│   ├── components/       # 2 components
│   ├── stores/           # Pinia auth store
│   ├── composables/      # useSpeechRecognition
│   ├── middleware/       # auth, guest guards
│   ├── layouts/          # default layout
│   ├── plugins/          # Axios $api
│   └── public/           # Avatar images
├── socket/               # Bun WebSocket server
│   └── src/index.ts
├── nginx/                # dev + prod config templates
├── docker-compose.yml    # Dev compose
├── docker-compose.prod.yml
├── Makefile              # Single entry point
└── AGENTS.md             # AI agent rules
```
