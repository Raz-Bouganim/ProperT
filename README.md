# ProperT

Monorepo: **NestJS** API, **Next.js** App Router, **PostgreSQL + PostGIS**, **Redis**, **S3-compatible** storage (MinIO locally), **AWS Lambda** image processor.

## Docs

| File | Role |
|------|------|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Spec — data model, conventions (**wins on conflict**). |
| [`ROADMAP.md`](ROADMAP.md) | What shipped vs next. |
| This README | Run, env, layout. |

## Layout

| Path | Role |
|------|------|
| `frontend/` | Next.js UI |
| `backend/` | NestJS REST + Socket.IO |
| `lambda/image-processor/` | AWS Lambda: S3-triggered image resizer (thumbnail + optimized WebP) |
| `docker-compose.yml` | Postgres (PostGIS), Redis, MinIO |

No root `package.json` — install per package.

## Stack (check `package.json` for versions)

- **Frontend:** Next.js, React, Tailwind, axios, socket.io-client, Leaflet (maps), react-hook-form, Zod.
- **Backend:** NestJS, Prisma, JWT, Socket.IO, AWS S3 client.
- **Lambda:** Node.js + TypeScript, sharp, AWS SDK v3.

## Prisma naming

- Model **`Property`** → table **`properties`** (`@@map("properties")`).
- **`Booking`** → **`bookings`**.
- Chat: **`conversations`**, **`conversation_participants`**, **`messages`**.
- **`Favorite`** → **`favorites`**.
- **`PropertyView`** → **`property_views`**.

Raw SQL and migrations must use these physical names.

## Local setup

### 1. Infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL on host port **5433**, Redis on **6379**, MinIO API on **9000** (console on **9001**).

### 2. Backend

```bash
cp backend/.env.example backend/.env
# Fill in JWT_SECRET, AUTH0_* and S3 variables — see .env.example for all required keys
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev          # API default :4000
```

### 3. Frontend

```bash
cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000 and Auth0 public credentials
cd frontend
npm install
npm run dev                # UI default :3000
```

### 4. Lambda (local dev only)

Image processing in local dev is handled by the backend's MinIO webhook handler (`POST /media/s3-webhook`) — no Lambda invocation is needed locally.

To build and package the Lambda for AWS deployment:

```bash
cd lambda/image-processor
npm install
npm run package:clean      # outputs function.zip
```

Deployment checklist:
- S3 trigger: PutObject events on the media bucket
- IAM role: S3 read + write on the media bucket
- Environment variable: `BUCKET_NAME`

## Auth0 setup

Backend (`backend/.env`):
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

Frontend (`frontend/.env.local`):
```
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=...
```

The backend issues its own short-lived JWTs after the Auth0 exchange — Auth0 tokens are not used by the API after that point.

## Contributing (minimal)

- Guards + owner checks on all mutations; DTO validation via `ValidationPipe`.
- After Prisma schema edits: **migrate** + **generate**.
- **`npm run build`** in `backend/` and `frontend/` before merge.
- Two chat UIs: `components/ChatWindow.tsx` (property-page popover widget) vs `components/chat/ChatWindow.tsx` (full-page `/chat/[id]` view). Do not confuse.

## Agent prompt skeleton

```markdown
**Context:** Read `ARCHITECTURE.md` → `ROADMAP.md` → this README.

**Task:** [goal]

**Constraints:** Tables `properties`, `bookings`, chat tables as in Prisma. JWT on REST; Socket.IO uses **`auth.token`** (see `createChatSocket`). Minimal diffs.

**Verify:** `npm run build` in backend + frontend; migrate if schema changed.
```
