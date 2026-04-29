# ROADMAP

## What this file is

**[`ARCHITECTURE.md`](ARCHITECTURE.md)** is the spec (design, schema, flows, infra targets). **This file** is the only place for **time-ordered work**: what to build next, what is done, migration order, and risks. Update it when you finish a meaningful chunk or merge.

---

## How to use it

1. Open **[Work queue](#work-queue)** and do the **first unchecked** item you can start (respect **Depends on**).
2. When it is merged: change `[ ]` → `[x]`, bump **[Last reviewed](#last-reviewed)**.
3. Need column names or behavior? Read **[`ARCHITECTURE.md`](ARCHITECTURE.md)** — do not duplicate the spec here.

---

## Last reviewed

- **Date:** 2026-04-29  
- **Git (short):** `8c5d407`  

---

## At a glance

| Area | Status |
|------|--------|
| Auth / JWT transport | In progress — Auth0 paths exist; Bearer + readable cookie vs ARCH HttpOnly |
| Schema vs ARCH §6 | In progress — legacy `User`/`Property` shape; no exclusion / generated columns in migrations |
| Bookings | Partial — app overlap check; no DB `btree_gist` / 409 |
| Search | Partial — PostGIS radius; no single-query FTS + `q`, no Redis 60s cache |
| Chat / WS | Partial — REST create; WS auth off; no Redis adapter; no `PATCH .../read` |
| Media | Partial — presigned PUT; path `/media/presigned-url`; public bucket policy vs ARCH |
| Calendar / `.ics` | **N/A** — out of product scope ([`ARCHITECTURE.md`](ARCHITECTURE.md) §8, §10) |
| Redis / `/health` / `/ready` | Not started in app — Redis only in `docker-compose.yml` |

---

## Work queue

Check **`[x]`** when the item is **done on `main`**. Order matters where **Depends on** is set.

- [ ] **1. Schema & Prisma toward ARCH §6.1–6.2** — `User.externalId` (vs `auth0Sub`), listings/images/features/messages as in spec, soft delete, enums (`DRAFT`/`SOLD`, etc.). Add raw SQL migrations for §6.2 (exclusion, generated `location` / `search_vector`, partial unique primary image, message XOR content/media, availability XOR). **Owner:** backend. **Depends on:** none (start here).
- [ ] **2. Booking overlap in DB (ARCH D-4, NF-6)** — `btree_gist` + exclusion constraint; map violation → **409**; replace `any` body on `POST /bookings`. **Owner:** backend. **Depends on:** 1 (Booking table/columns match migration SQL).
- [ ] **3. Auth0-only identity (ARCH F-5, D-1–D-2)** — Remove role enum from product path; no local passwords; JWT claims without roles. **Owner:** backend (+ data backfill). **Depends on:** 1 for column names.
- [ ] **4. HttpOnly session cookie (ARCH §8, D-3)** — Issue JWT with `Set-Cookie`; validate from cookie on REST + Socket.IO; stop trusting body `senderId` on WS. **Owner:** backend + frontend.
- [ ] **5. Redis + ops baseline (ARCH §9)** — `REDIS_URL`, `ioredis`, `@nestjs/throttler` + Redis store, `@socket.io/redis-adapter`, `GET /health` + `GET /ready` (DB + Redis). **Owner:** backend. **Depends on:** none for wiring (can parallel with 3–4 if teams split).
- [ ] **6. Search: single SQL + cache (ARCH F-2, D-7–D-8)** — One query with geo + FTS + filters + pagination; Redis key = hash of params, TTL 60s; discovery excludes `DRAFT` / `SOLD` / `deleted_at` (ARCH §10). **Owner:** backend. **Depends on:** 1 (generated columns).
- [ ] **7. Chat hardening (ARCH F-1, §7.2)** — WS JWT, `joinRoom` membership, `PATCH /chat/conversations/:id/read`, message media fields, cursor history. **Owner:** backend (+ frontend). **Depends on:** 1, 4, 5.
- [ ] **8. Media module (ARCH D-6, §8)** — Align route with `POST /media/presign`, JWT on presign, presign size limits (D-6), private bucket + CDN story vs public read policy. **Owner:** backend / infra. **Depends on:** 4 (auth on route).
- [ ] **9. Listings UX vs ARCH F-3–F-4** — Draft/publish, gallery + Canvas thumbnails, strip tax/HOA from MVP surfaces if schema lags. **Owner:** frontend + backend. **Depends on:** 1, 8.
- [ ] **10. Hardening & scale** — Typed DTOs everywhere critical; owner projection on public property API; list pagination; atomic `views`; optional property-detail cache; structured logging; E2E for auth / search / booking / chat; CDN + CI/CD when ready. **Owner:** backend + frontend + infra. **Depends on:** prior items.

---

## Database migration order

When applying **§6.2**-style changes, prefer this **dependency order** (Prisma `migration.sql` + raw blocks):

1. **Booking integrity** — `btree_gist`; exclusion on `(property_id, tstzrange)` for active statuses; confirm FKs (`Booking` → `Property`, → `User`).
2. **Authentication** — Every user has **`external_id`** (Auth0 `sub`) before NOT NULL; then drop legacy password if applicable.
3. **Listing model** — Geography + `search_vector` generators, `virtual_tour_url`, soft delete, published timestamps (no listing tax/HOA per ARCH).
4. **Property images** — `alt_text`, `created_at`, partial unique one primary per property.
5. **Messaging** — Content/media check; `UserConversation` last-read columns; index `(conversation_id, created_at)`.
6. **Availability** — XOR day vs date + valid `day_of_week`.

**Pre-flight (before NOT NULL on `external_id`):**  
`SELECT COUNT(*) FROM "User" WHERE external_id IS NULL` → must be **0**.

---

## Done (on main today)

- NestJS + Prisma + PostGIS Docker image; MinIO in compose; Next.js client.
- Auth0 **optional**: `POST /auth/oauth/exchange`, profile upsert (`auth0Sub`), legacy email/password + bcrypt when Auth0 off.
- JWT in **Authorization Bearer** from client cookie; `JwtAuthGuard` on many routes.
- Properties: create/update/delete, geo radius search (`ST_DWithin`), public list/detail.
- Bookings: create, mine, status patch, **application-level** overlap check.
- Chat: REST conversations/messages; Socket.IO send/join (no WS auth).
- Media: presigned PUT to MinIO; `POST /media/presigned-url`.
- Geo: Nominatim proxy routes.

---

## Out of scope

Same as [`ARCHITECTURE.md`](ARCHITECTURE.md) §8 **Out of scope** and §10 (calendar exports, multipart giant uploads, BullMQ, etc.). Do not track here as backlog.

---

## Risks (short)

- **Race:** Booking overlap not serialized until item **2** is done.
- **Security:** WS impersonation via `senderId`; chat GET routes may not verify membership; presign may be unauthenticated — treat until items **4**, **7**, **8**.
- **Tests:** Few meaningful API tests; no E2E — add under item **10**.

---

*After merges: update **Last reviewed**, refresh **At a glance**, and check boxes in **Work queue**.*
