# ProperT

Monorepo: **NestJS** API, **Next.js** App Router, **PostgreSQL + PostGIS**, **Redis**, **S3-compatible** storage (MinIO locally).

## Docs

| File | Role |
|------|------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Spec — data model summary, conventions (**wins on conflict**). |
| [`ROADMAP.md`](ROADMAP.md) | What shipped vs next. |
| This README | Run, env, layout. |

## Layout

| Path | Role |
|------|------|
| `frontend/` | Next.js UI |
| `backend/` | NestJS REST + Socket.IO |
| `docker-compose.yml` | Postgres (PostGIS), Redis, MinIO |

No root `package.json` — install per package.

## Stack (check `package.json` for versions)

- Frontend: Next.js, React, Tailwind, axios, socket.io-client, etc.
- Backend: NestJS, Prisma, JWT, Socket.IO, AWS S3 client.

## Prisma naming

- Model **`Property`** → table **`properties`** (`@@map("properties")`).
- **`Booking`** → **`bookings`**.
- Chat: **`conversations`**, **`conversation_participants`**, **`messages`**.

Raw SQL and migrations must use these physical names.

## Local setup (short)

1. `docker compose up -d` (Postgres often on host port **5433** — see `docker-compose.yml`).
2. Copy **`backend/.env.example`** → **`backend/.env`**; **`frontend/.env.local`** for `NEXT_PUBLIC_API_URL`.
3. `cd backend && npm install && npx prisma migrate deploy && npx prisma generate`
4. `npm run start:dev` (API default **4000**).
5. `cd frontend && npm install && npm run dev` (**3000**).

Details and Auth0 vars: **`.env.example`** and **`ARCHITECTURE.md`**.

## Contributing (minimal)

- Guards + owner checks on mutations; DTO validation.
- After Prisma edits: **migrate** + **generate**.
- **`npm run build`** in `backend/` and `frontend/` before merge.
- Two chat UIs: `components/ChatWindow.tsx` vs `components/chat/ChatWindow.tsx` — do not confuse.

## Agent prompt skeleton

```markdown
**Context:** Read `ARCHITECTURE.md` → `ROADMAP.md` → this README.

**Task:** [goal]

**Constraints:** Tables `properties`, `bookings`, chat tables as in Prisma. JWT on REST; Socket.IO uses **`auth.token`** (see `createChatSocket`). Minimal diffs.

**Verify:** `npm run build` in backend + frontend; migrate if schema changed.
```
