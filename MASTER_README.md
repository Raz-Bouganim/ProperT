# ProperT — Master Context Document

This file is the **canonical orientation** for the ProperT monorepo: product intent, architecture, how to run it, known gaps, and **rules for AI-assisted development**. Keep it updated when architecture or conventions change.

---

## 1. Project Overview

**ProperT** is a full-stack **real estate platform** that connects property seekers with listings. It supports:

- Browsing and searching listings (including map-based discovery)
- Rich **listing creation** (multi-step form: basics, details, media, pricing, availability)
- **Bookings** (viewing / appointment windows) with status workflow
- **Real-time chat** between users in the context of properties (Socket.IO)
- **JWT-based authentication** (ProperT-issued JWT) with role-aware users (`SEEKER`, `OWNER`, `AGENT`, `ADMIN` in schema)
- **Media uploads** via S3-compatible storage (MinIO locally, AWS S3 in production patterns)

**Primary users:** property seekers, owners/agents listing properties, and (by schema) admins.

**Core business problem:** reduce friction in discovering properties, scheduling visits, and messaging around a listing—backed by a single API and a modern web client.

---

## 2. Architecture & Tech Stack

### Repository layout

| Area | Path | Role |
|------|------|------|
| Frontend | `frontend/` | Next.js App Router UI |
| Backend | `backend/` | NestJS REST + WebSockets |
| Infrastructure | `docker-compose.yml` | Postgres + PostGIS, Redis, MinIO |

There is **no root `package.json`**; install and run commands are per package.

### Frontend (`frontend/`)

| Technology | Version (from `package.json`) | Notes |
|------------|-------------------------------|--------|
| **Next.js** | `16.1.6` | App Router, Turbopack in dev |
| **React** | `19.2.3` | Client components for interactive pages |
| **TypeScript** | `^5` | Strict project settings in `tsconfig.json` |
| **Tailwind CSS** | `^4` | With `@tailwindcss/postcss` |
| **HTTP** | `axios` `^1.13.5` | Shared instance in `src/lib/api.ts` |
| **Forms** | `react-hook-form` + `@hookform/resolvers` + `zod` | Listing flow |
| **Maps** | `leaflet` + `react-leaflet` | Search / map UX |
| **Motion** | `framer-motion` | UI polish |
| **Realtime** | `socket.io-client` `^4.8.3` | Chat |
| **Toasts** | `sonner` | Global toaster in layout |

**API base URL:** `NEXT_PUBLIC_API_URL` (falls back to `http://localhost:4000`; avoid **5000** on macOS — AirPlay uses it).

Optional frontend envs:

- **`NEXT_PUBLIC_DEBUG_BOOKING_ERRORS=1`**: in non-production, logs structured booking failures to `console.debug` (helpful when the backend returns nested error payloads).

### Backend (`backend/`)

| Technology | Version (from `package.json`) | Notes |
|------------|-------------------------------|--------|
| **NestJS** | `^11.x` (`@nestjs/common` etc.) | Modular monolith |
| **Prisma** | `^5.22.0` | ORM; DB table name `Listing` maps to model `Property` |
| **PostgreSQL** | 16 (Docker image `postgis/postgis:16-3.4-alpine`) | **PostGIS** used for radius search |
| **Auth** | `@nestjs/jwt`, `passport-jwt`, `bcrypt` (+ optional **Auth0**) | ProperT-issued JWTs; optional Auth0-backed login + social providers |
| **Realtime** | `@nestjs/platform-socket.io`, `socket.io` | Chat gateway |
| **Object storage** | `@aws-sdk/client-s3`, presigner | MinIO/S3 for uploads |
| **HTTP client** | `@nestjs/axios` | Geo (Nominatim) |
| **Validation** | `class-validator`, global `ValidationPipe` (whitelist, transform) | DTOs |
| **Config** | `@nestjs/config` + **Joi** schema in `app.module.ts` | Env validation (`DATABASE_URL`, `JWT_SECRET`, optional S3/FRONTEND_URL) |
| **API docs** | `@nestjs/swagger` | Served at `/api` |

**Runtime:** default port **4000** (`PORT` env override). **CORS** allows `FRONTEND_URL` or `http://localhost:3000`.

### Database & domain model (high level)

- **User** — credentials, profile, role; owns **Property** rows.
- **Property** (`@@map("Listing")`) — listing fields, geo coordinates, images array, features, pricing, etc. **Bedrooms/Bathrooms** support **half steps** (stored as floats).
- **Availability** — recurring (weekly `dayOfWeek`) **or date-specific** (`date`) windows per listing. The slots API expects a **date-only** query (`yyyy-MM-dd`) to avoid timezone drift.
- **Booking** — seeker + listing + time range + **BookingStatus**.
- **Conversation** / **UserConversation** / **Message** — chat threads, optionally tied to a listing.

Geo queries use **raw SQL** with `ST_DWithin` / geography in `PropertiesService.findAllWithinRadius` — DB must have PostGIS and valid lat/lng on listings.

### Infrastructure (`docker-compose.yml`)

| Service | Image | Host ports (defaults) |
|---------|--------|------------------------|
| Postgres + PostGIS | `postgis/postgis:16-3.4-alpine` | `5433` → 5432 |
| Redis | `redis:alpine` | `6379` |
| MinIO | `minio/minio` | `9000`, console `9001` |

**Note:** Application code **does not currently connect to Redis** (a previous Bull queue bootstrap was removed as unused). Redis remains useful for **future** queues, caching, or rate limiting—safe to stop the service locally if you are not using it.

---

## 3. Project State & Roadmap

### Current state (implemented & working)

- **Auth:** register/login, ProperT JWT, `/users/me`, refresh flow used by the frontend `AuthContext`. Optional **Auth0** integration supports email/password (DB connection) and Google/Apple via `/authorize` + callback exchange.
- **Properties:** CRUD patterns; public listing list/detail; geo radius search; **owner-scoped** create; `GET /properties/mine` for authenticated owner listings.
- **Security fix (recent):** `PATCH` / `DELETE` on listings require **JWT** and **owner** match (see `PropertiesService.assertOwner`).
- **Bookings & availability** modules exist with services and controllers.
- **Chat:** REST for conversations/messages + Socket.IO gateway for realtime delivery.
- **Media:** presigned upload URLs; bucket creation/policy on module init (MinIO-oriented).
- **Geo:** forward/reverse geocoding via **OpenStreetMap Nominatim** (respect User-Agent policy in production).
- **Frontend:** home, search, property detail, multi-step create listing, dashboard, auth, chat list + thread.
- **Secrets & env:** access JWTs signed with **`JWT_SECRET`** from env (`JwtModule.registerAsync`, `JwtStrategy`, Joi min length 16); template vars in **`.env.example`** (root) and **`backend/.env.example`**.

### WIP / partial / fragile

- **Unit tests:** several Nest controller specs fail to compile/instantiate because providers are not mocked (`BookingsController`, etc.). Treat `npm test` as **not green** until tests are refactored with proper module mocks or e2e focus.
- **JWT refresh model:** `POST /auth/refresh` re-validates the **access** JWT and re-issues tokens (no separate refresh signing secret or rotation yet). For production-grade sessions, consider opaque refresh tokens and/or a distinct `JWT_REFRESH_SECRET` when you extend `AuthService`.
- **`GET /properties?owner=me`:** relies on `req.user`, but the route is **not** guarded with `JwtAuthGuard`, so `owner=me` without a valid JWT will not filter as intended. Prefer **`GET /properties/mine`** for authenticated “my listings.”
- **Naming collision:** two different components export `ChatWindow`:
  - `components/ChatWindow.tsx` — modal chat from a **property** page (propertyId, ownerId, …).
  - `components/chat/ChatWindow.tsx` — full-page thread by **conversation id**.
  When adding features, **rename or namespace** to avoid confusion (e.g. `PropertyChatDrawer` vs `ConversationChatView`).
- **Duplicated `saveAuth` call** was removed from auth submit handler; watch for similar copy-paste drift elsewhere.

### Next steps / backlog (suggested)

1. **Tests:** repair unit tests or replace critical paths with e2e (`test/app.e2e-spec.ts`).
2. **Redis:** either wire a real use case (queues, session store) or document/remove from compose for minimal local setups.
3. **Payments / contracts:** not present—out of scope today; schema is listing-centric.
4. **Production hardening:** rate limits on auth and geo; helmet/CORS review for deployed origins; audit logging for mutations.
5. **Auth sessions (optional):** opaque refresh tokens, separate signing secret (`JWT_REFRESH_SECRET`), and rotation—today `POST /auth/refresh` only re-issues after validating the **access** JWT.
6. **Optional:** root `package.json` with `concurrently` scripts for `dev` (frontend + backend) for DX.

---

## 4. Codebase Navigation

```
ProperT/
├── MASTER_README.md          ← This file
├── .env.example              ← Template for backend + frontend env (no secrets committed)
├── docker-compose.yml        ← Local Postgres, Redis, MinIO
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     ← Data model (Property → Listing table)
│   │   └── migrations/       ← SQL migrations (PostGIS, columns)
│   ├── src/
│   │   ├── main.ts           ← Bootstrap, Swagger, CORS, helmet
│   │   ├── app.module.ts     ← Feature modules, Joi env validation
│   │   ├── auth/             ← JWT guard + Auth0-backed login (optional)
│   │   ├── users/
│   │   ├── properties/       ← Listings API + geo search
│   │   ├── bookings/
│   │   ├── availability/
│   │   ├── chat/             ← REST + gateway
│   │   ├── media/            ← S3 presigned URLs
│   │   ├── geo/              ← Nominatim proxy
│   │   └── prisma/           ← PrismaService
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/              ← Next.js routes (App Router)
    │   │   ├── page.tsx      ← Home
    │   │   ├── search/
    │   │   ├── auth/
    │   │   │   ├── callback/ ← Auth0 OAuth callback (code → API exchange)
    │   │   ├── dashboard/
    │   │   ├── chat/
    │   │   └── properties/   ← [id] detail, create wizard
    │   ├── components/       ← Shared UI, Map, cards, layout
    │   ├── context/          ← AuthContext
    │   └── lib/              ← api client, constants, utils
    └── package.json
```

---

## 5. AI Directives & Coding Standards

When working in this repo, follow these rules unless the user explicitly overrides them.

### General principles

- **Minimal diffs:** change only what is required; no drive-by refactors or unrelated formatting.
- **Match existing style:** quote style, file organization, and Nest/React patterns in neighboring files.
- **No unsolicited markdown docs** (except when the user asks for documentation like this master file).

### Backend (NestJS)

- **Modules:** feature-based (`XxxModule`, `XxxService`, `XxxController`). New endpoints belong in the correct module, not `AppController`.
- **Guards:** use `JwtAuthGuard` for any route that reads or mutates **user-specific** data. Never assume `@Request() req.user` is populated without a guard.
- **Authorization:** for listing mutations, always verify **ownerId** (pattern: `assertOwner`-style check in the service).
- **Validation:** use DTOs with `class-validator`; rely on global `ValidationPipe` (whitelist, forbid unknown properties).
- **Errors:** prefer Nest HTTP exceptions (`NotFoundException`, `ForbiddenException`, etc.) over generic `Error` for API responses.
- **Prisma:** respect `@@map` — the table is **`Listing`** for the `Property` model. Raw SQL must target `"Listing"` where applicable.
- **Logging:** never log full `DATABASE_URL` or secrets.

### Frontend (Next.js)

- **App Router:** default to Server Components only when there is no browser API; interactive pages use `'use client'`.
- **Next.js 15+ / 16 static generation:** hooks like `useSearchParams()` must be used under a **`<Suspense>`** boundary (see `auth/page.tsx` pattern).
- **Data fetching:** authenticated calls go through `src/lib/api.ts` (axios + cookie token + 401 redirect).
- **State:** React context for auth global state; local `useState` / hooks for wizards (`properties/create/hooks/`).
- **Styling:** Tailwind + existing `cn()` helper from `lib/utils.ts`; reuse `components/ui/*` before inventing primitives.

### Naming & files

- **API resource naming:** REST paths use `properties` in URLs while the DB table is `Listing` — be explicit in comments when touching both.
- **Components:** PascalCase files for React components; colocate wizard-specific pieces under `app/properties/create/`.
- **Types:** shared auth types in `src/types/auth.ts`; wizard types under `properties/create/types/`.

### Testing requirements

- **Before claiming “done” on backend logic:** run `npm run build` in `backend/` and `frontend/`.
- **Unit tests:** fix or extend specs with mocked `PrismaService` / services—do not leave controllers without providers.
- **E2E:** `backend/npm run test:e2e` when changing critical API contracts.

### Idiosyncrasies to remember

1. **Two `ChatWindow` components** — different props and use cases; do not merge blindly.
2. **PostGIS** — local DB must be the PostGIS image; migrations assume geographic functions.
3. **MinIO** — `MediaService` uses path-style URLs and `forcePathStyle: true`.
4. **Token cookie key** — defined in `frontend/src/lib/constants.ts` (`AUTH_TOKEN_KEY`); keep aligned with backend cookie strategy if you add cookie-based auth later (currently Bearer from cookie on the client).

### Agent prompt skeleton (copy-paste)

Use this when opening a new chat or task with an AI agent. Replace bracketed placeholders; keep **דגשים** (Hebrew: “emphases” / non‑negotiable constraints) updated for your ticket.

```markdown
*ROLE*

You are a senior full-stack engineer and careful reviewer for **ProperT**: a NestJS 11 + Prisma 5 + PostgreSQL/PostGIS **backend** (`backend/`) and a Next.js 16 App Router **frontend** (`frontend/`). You have read **MASTER_README.md** in the repo root and follow its architecture, risks, and conventions.

*Task*

[Describe the mission: e.g. fix a bug, add an endpoint, extend the listing wizard, adjust Prisma schema + migration, etc.]

Acceptance criteria:
- [ ] …
- [ ] …

*Key Constraints*

- **Scope:** Minimal, focused diffs; do not refactor unrelated code or add docs unless asked.
- **Context paths:** Prefer `backend/src/…`, `frontend/src/…`, `backend/prisma/schema.prisma` and migrations.
- **API default port:** `4000` (not 5000 on macOS — AirPlay). Frontend: `NEXT_PUBLIC_API_URL` / axios base in `frontend/src/lib/api.ts`.
- **Prisma / DB:** The model is `Property` but the table is **`Listing`**; fields may use `@map` (e.g. `sqft` → `size`). After schema changes run **`npx prisma migrate dev`** (or `deploy`) and **`npx prisma generate`**. Never log secrets or full `DATABASE_URL`.
- **Auth / listings:** Use `JwtAuthGuard` where appropriate; mutations on listings must enforce **owner** checks (see `PropertiesService.assertOwner` pattern).
- **Next.js:** `useSearchParams` and similar require a **`<Suspense>`** boundary. Client data: `api` from `@/lib/api`.
- **Availability:** rules may be weekly (`dayOfWeek`) or date-specific (`date`); slot queries should pass **date-only** `yyyy-MM-dd` (avoid timezone drift).
- **Duplicates:** Two different `ChatWindow` components (`components/ChatWindow.tsx` vs `components/chat/ChatWindow.tsx`) — do not conflate them.
- **Verification:** Run `npm run build` in `backend/` and `frontend/` before claiming done; extend or fix tests if you touch controllers/services.

Optional attachments for the agent:
- Relevant file paths, stack traces, and `curl`/request examples.
```

---

## 6. Environment & Setup

### Prerequisites

- Node.js (LTS recommended) and npm
- Docker (for Postgres + MinIO + optional Redis)

### 1) Start infrastructure

```bash
cd /path/to/ProperT
docker compose up -d
```

Default DB is reachable at **`localhost:5433`** (see compose file). Copy **`.env.example`** (repo root) or **`backend/.env.example`** into `backend/.env` and set at least:

```env
DATABASE_URL="postgresql://admin:admin123@localhost:5433/propert?schema=public"
JWT_SECRET="use-a-long-random-string-at-least-16-chars"
FRONTEND_URL="http://localhost:3000"
PORT=4000

# MinIO (match docker-compose defaults or your overrides)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin123
S3_ENDPOINT=http://localhost:9000
S3_BUCKET_NAME=propert-uploads
AWS_REGION=us-east-1
```

`JWT_SECRET` is **validated at startup** (minimum length 16). The API will not boot without it.

#### Auth0 (optional)

When `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are set in `backend/.env`, the backend uses Auth0 for:

- **Manual login** (`POST /auth/login`): Auth0 DB connection via password-realm grant.
- **Manual signup** (`POST /auth/register`): Auth0 `/dbconnections/signup`.
- **Google/Apple**: frontend redirects to Auth0 `/authorize` (connection = `google-oauth2` or `apple`), then `frontend/src/app/auth/callback` exchanges the code via `POST /auth/oauth/exchange` to receive a ProperT JWT.

Backend env (example):

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
# Optional
AUTH0_AUDIENCE=
AUTH0_DB_CONNECTION=Username-Password-Authentication
```

Frontend env (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

Apply migrations and generate the Prisma client:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 2) Run the API

```bash
cd backend
npm install
npm run start:dev
```

- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api`

### 3) Run the web app

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:3000`
- Set `frontend/.env.local` if the API is not on the default host:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Build (production-like)

```bash
cd backend && npm run build && npm run start:prod
cd frontend && npm run build && npm run start
```

### Lint

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

### Tests

```bash
cd backend && npm test
cd backend && npm run test:e2e
```

*(See “Project state” — unit tests may fail until repaired.)*

---

## Document history

| Date | Summary |
|------|---------|
| 2026-04-27 | Initial master README: stack versions, architecture, cleanup notes (removed unused Bull bootstrap, PowerShell port-kill scripts, unsafe Prisma URL logging; secured listing PATCH/DELETE; fixed auth Suspense for production build). |
| 2026-04-27 | Added **Agent prompt skeleton** under §5 (ROLE / Task / דגשים) for copy-paste agent prompts. |
| 2026-04-27 | **Secrets & env:** `JWT_SECRET` from env + Joi; root `.env.example`; `backend/.env.example` + e2e `load-e2e-env` default for missing `JWT_SECRET` only. |
| 2026-04-28 | Listings: allow **half bedrooms/bathrooms** (Prisma + migration), availability supports **weekly + specific-date** rules, and frontend property details UX improved (return-to links, map embed, lightbox gallery, booking calendar rule matching). |
