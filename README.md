# ProperT

Real estate marketplace monorepo: **NestJS** API, **Next.js** App Router client, **PostgreSQL + PostGIS**, **Redis**, and **S3-compatible** storage (MinIO locally).

## Documentation

| Document | Purpose |
|----------|---------|
| [**`ARCHITECTURE.md`**](ARCHITECTURE.md) | **Canonical spec** — system design, data model, API patterns, flows, infra targets. **Overrides any other doc when there is a conflict.** |
| [**`ROADMAP.md`**](ROADMAP.md) | **Living delivery status** — what is done vs in flight vs backlog vs spec (update after meaningful merges). |
| **`README.md`** (this file) | Clone, run, env templates, repo layout, and contributor conventions. |

## Overview

ProperT connects property seekers with listings: map/search, listing creation, viewing **bookings**, and **real-time chat** in listing context. **Identity and authorization** are defined in `ARCHITECTURE.md` (Auth0-centered, data-driven access — not role-enum RBAC).

## Monorepo layout

| Path | Role |
|------|------|
| `frontend/` | Next.js UI |
| `backend/` | NestJS REST + Socket.IO |
| `docker-compose.yml` | Postgres + PostGIS, Redis, MinIO |

There is **no root `package.json`**; install and run commands are per package.

**Secrets:** Never commit real credentials. Keep secrets in **`backend/.env`** and **`frontend/.env.local`** (ignored by git — see `.gitignore`). Use the tracked **`.env.example`** files as templates only.

## Tech stack (versions from `package.json`)

| Layer | Stack |
|-------|--------|
| Frontend | Next.js **16**, React **19**, Tailwind **4**, TypeScript **5**, axios, react-hook-form + zod, Leaflet / react-leaflet, socket.io-client, framer-motion |
| Backend | NestJS **11**, Prisma **5**, PostgreSQL **16** (PostGIS image in Compose), JWT + Passport, Socket.IO, AWS SDK v3 (S3 presigner), class-validator, Joi config |
| Data | Prisma ORM; table **`Listing`** maps to model **`Property`** (`@@map`) |

**API base URL (frontend):** `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). On macOS, avoid port **5000** for the API (often used by **AirPlay**).

Optional frontend env: **`NEXT_PUBLIC_DEBUG_BOOKING_ERRORS=1`** — in non-production, logs structured booking failures to `console.debug`.

## Repository structure

```
ProperT/
├── ARCHITECTURE.md
├── ROADMAP.md
├── README.md
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── auth/
│       ├── users/
│       ├── properties/
│       ├── bookings/
│       ├── availability/
│       ├── chat/
│       ├── media/
│       ├── geo/
│       └── prisma/
└── frontend/
    └── src/
        ├── app/           # App Router routes
        ├── components/
        ├── context/
        └── lib/           # api client, utils
```

## Prerequisites

- Node.js (LTS) and npm  
- Docker (Postgres + PostGIS, Redis, MinIO)

## Local setup

### 1. Infrastructure

```bash
cd /path/to/ProperT
docker compose up -d
```

Postgres (default): **`localhost:5433`** → container `5432` (see `docker-compose.yml`).

### 2. Backend environment

1. Copy **`backend/.env.example`** to **`backend/.env`** (you can also merge hints from the repo root **`.env.example`**).
2. Fill in **your own** values. Database URL and MinIO keys must match **your** Docker Compose credentials (or cloud S3 in deployment). Generate a **unique** `JWT_SECRET` (minimum **16** characters); do not reuse example strings.

Variable names and comments live only in **`.env.example`** — not duplicated here so this README stays safe to publish.

**Auth0:** When you enable it, set domain, client ID, and client secret from your Auth0 Application in **`backend/.env`**. Client secrets must **never** be committed. For the frontend, create **`frontend/.env.local`** with `NEXT_PUBLIC_API_URL` and any public Auth0 keys your build requires (see commented lines in root **`.env.example`**).

**Auth behavior** (HttpOnly cookies, flows) is specified in **`ARCHITECTURE.md`**.

### 3. Migrations and Prisma client

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

For active development you may use `npx prisma migrate dev` instead of `deploy`.

### 4. Run API

```bash
cd backend
npm run start:dev
```

- API: `http://localhost:4000`  
- Swagger: `http://localhost:4000/api`

### 5. Run frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

### Build, lint, tests

```bash
cd backend && npm run build && npm run start:prod
cd frontend && npm run build && npm run start
```

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

```bash
cd backend && npm test
cd backend && npm run test:e2e
```

**Note:** Some Nest controller unit tests may fail until providers are fully mocked; prefer **`npm run build`** on both packages before claiming a change is done, and extend tests when touching controllers.

---

## Contributing and conventions

Principles: **minimal diffs**, match neighboring style, do not add unsolicited markdown docs unless asked.

### Backend (NestJS)

- Feature modules: `XxxModule`, `XxxService`, `XxxController`.
- Use **`JwtAuthGuard`** (or equivalent) on routes that rely on `req.user`; never assume the user is populated without a guard.
- Listing mutations: enforce **owner** (e.g. `PropertiesService.assertOwner`-style checks).
- DTOs + global **`ValidationPipe`** (whitelist, transform). Prefer Nest HTTP exceptions for API errors.
- **Prisma:** respect `@@map` — SQL against **`"Listing"`** where raw queries target the property table.
- **Logging:** never log `DATABASE_URL` or secrets.

### Frontend (Next.js)

- Use **Server Components** unless browser APIs or interactivity require **`use client`**.
- **`useSearchParams()`** (and similar) must sit under **`<Suspense>`** where required by Next.js.
- Authenticated HTTP: **`frontend/src/lib/api.ts`** (align cookie/Bearer behavior with backend as per `ARCHITECTURE.md`).
- Styling: Tailwind + existing `cn()` / `components/ui/*`.

### Idiosyncrasies

1. **Two different `ChatWindow` components** — `components/ChatWindow.tsx` (property modal flow) vs `components/chat/ChatWindow.tsx` (conversation thread). Do not merge blindly.
2. **PostGIS** — local DB must be the PostGIS image from Compose.
3. **MinIO** — S3 client often uses path-style / `forcePathStyle: true` (see `MediaService`).
4. **Availability** — rules can be weekly (`dayOfWeek`) or date-specific (`date`); slot APIs should use **date-only** `yyyy-MM-dd` where applicable to reduce timezone drift.

---

## Agent prompt skeleton (optional)

Use when opening a task with an AI assistant. Replace bracketed sections.

```markdown
**Role:** Senior full-stack for **ProperT** (`backend/` NestJS, `frontend/` Next.js App Router). No root `package.json` — commands per package.

**Context:** **`ARCHITECTURE.md`** (spec) → **`ROADMAP.md`** (what exists today) → **`README.md`** (run/env/layout).

**Task:** [Goal + files/routes if known.]

**Acceptance criteria:**
- [ ] …

**Constraints:** Minimal diffs; match repo style. API **4000**, frontend **`NEXT_PUBLIC_API_URL`**. Prisma model **`Property`** → table **`Listing`**; after `schema.prisma` edits: **`migrate dev`** or **`migrate deploy`**, then **`generate`**. **`JwtAuthGuard`** + **owner** checks on protected listing routes. Do not conflate **`components/ChatWindow.tsx`** vs **`components/chat/ChatWindow.tsx`**. **`npm run build`** in both **`backend/`** and **`frontend/`** before done.

**Verify:** Both builds green. If you changed API or UI, quick smoke (`start:dev` / `dev`, Swagger at `/api` if relevant). If Prisma changed, DB up via Compose + migrate, then boot API.
```
