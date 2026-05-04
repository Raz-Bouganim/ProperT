# ROADMAP

## What this file is

**[`ARCHITECTURE.md`](ARCHITECTURE.md)** is the spec (design, schema, flows, infra targets). **This file** is the only place for **time-ordered work**: what to build next, what is done, migration order, and risks. Update it when you finish a meaningful chunk or merge.

---

## How to use it

1. Execute **[Work queue](#work-queue)** in **phase order** (Phase 1 → 2 → 3 → 4). Do not start a later phase until prior blockers are cleared.
2. When a checkbox is merged to `main`: `[ ]` → `[x]`, bump **[Last reviewed](#last-reviewed)**.
3. Column names, constraints, and API shapes: read **[`ARCHITECTURE.md`](ARCHITECTURE.md)** — do not duplicate the spec here.

---

## Last reviewed

- **Date:** 2026-05-04  
- **Git (short):** `82e4fce`  

---

## At a glance

| Area | Status |
|------|--------|
| **Database / schema** | **Done** — single baseline migration `20260504000000_init`; schema locked to §6.1; §6.2 constraints applied |
| Auth / JWT transport | In progress — move to Auth0-only + HttpOnly cookie (Phases 1–2) |
| Bookings | Partial — app overlap check; DB exclusion + **409** in Phase 3 |
| Search | Partial — radius only; single SQL + FTS + 60s Redis in Phase 3 |
| Chat / WS | Partial — REST OK; cookie auth, no body `senderId`, `lastReadMessageId` in Phases 2–3 |
| Media / listings UI | Partial — presign path/policy drift; Phase 4: `virtualTourUrl` input, forms, Canvas thumbnails |
| Calendar / `.ics` | **N/A** — out of product scope ([`ARCHITECTURE.md`](ARCHITECTURE.md) §8, §10) |
| Redis / `/health` / `/ready` | Partial in compose — wire for search cache, Socket.IO adapter, probes (Phase 3 + infra as needed) |

---

## Work queue

**Product decision:** The owner has authorized a **complete database wipe**. We **do not** preserve users, properties, or rows, and we **do not** author multi-step data migration scripts. The fastest path to the target model is **hard reset** after a clean Prisma baseline aligned with **`ARCHITECTURE.md` §6** (see also §6.4 — Migration strategy).

Check **`[x]`** when the item is **done on `main`**.

### Phase 1: The Hard Reset & Schema Lock (Priority 0)

- [x] **Remove old migrations** — Delete every folder under `prisma/migrations` (keep the directory).
- [x] **Lock `schema.prisma` to the target MVP** — Match **`ARCHITECTURE.md` §6.1**: Auth0-only `User` with required `externalId` (no `UserRole`, no local `password`); `Property` / `PropertyImage` / `PropertyFeature` / `Availability` / `Booking` / chat models as specified; required `address` / `city` / `country`; `virtualTourUrl`; soft delete and listing status enums (`DRAFT`, `SOLD`, etc.); no MVP-excluded financial/custom-fee fields where the spec omits them.
- [x] **One initial migration** — `prisma/migrations/20260504000000_init/migration.sql` — single new migration directory.
- [x] **Embed §6.2 SQL in that migration** — `CREATE EXTENSION IF NOT EXISTS btree_gist`; booking overlap **exclusion** constraint (using `tsrange` since Prisma maps `DateTime` to `TIMESTAMP` without timezone); PostGIS generated **`location`** on `"Listing"`; generated **`search_vector`** + GIN index; partial unique primary image; message content/media check; availability XOR; currency check.
- [x] **Apply cleanly** — `npx prisma migrate reset --force` succeeded; Prisma Client generated; API boots against empty DB (`Nest application successfully started`).

### Phase 2: Auth & Transport Security (Priority 1)

- [ ] **ProperT JWT via `Set-Cookie`** — HttpOnly, Secure in production, SameSite appropriate for your domains; REST reads the session cookie (see **`ARCHITECTURE.md`** auth transport + §7.1).
- [ ] **Remove legacy local auth** — Delete bcrypt paths, email/password registration/login, and any role-based JWT claims; **Auth0-only** exchange and user upsert by `sub` → `externalId`.
- [ ] **Enforce Auth0-only flows** — No feature flags that re-enable local passwords; guards and DTOs assume external identity only.

### Phase 3: Core Backend Features (Priority 2)

- [ ] **Booking overlap at the database** — Rely on the exclusion constraint from Phase 1; map unique violation to **HTTP 409 Conflict**; remove redundant application-only racing logic where the DB is authoritative.
- [ ] **Property search** — One parameterized SQL query: PostGIS radius + **`search_vector`** FTS + filters + pagination per **F-2 / D-7–D-8**; exclude `DRAFT`, `SOLD`, and soft-deleted rows from public discovery (**§10**).
- [ ] **Search cache** — Redis key = stable hash of full query params, **TTL 60s**.
- [ ] **Chat gateway** — Authenticate Socket.IO using the **same HttpOnly JWT** as REST; **derive sender from the socket session**, never from client-supplied `senderId` in the payload; verify `joinRoom` membership.
- [ ] **`lastReadMessageId` / read receipts** — Implement **`PATCH /chat/conversations/:id/read`** (or equivalent per API contract) and persist on `UserConversation` per **F-1-5**.
- [ ] **Realtime + ops (MVP)** — Redis adapter for Socket.IO where multi-instance; **`GET /health`** and **`GET /ready`** (DB + Redis) per **`ARCHITECTURE.md` §9**.

### Phase 4: Frontend Alignment (Priority 3)

- [ ] **Virtual tour** — Remove legacy multipart / large video upload UI; single **text input** for **`virtualTourUrl`** (e.g. Matterport embed URL) per **F-4** / §8.
- [ ] **Listing forms** — Match the new schema: required **country** and **city**; remove surfaces for custom fees / tax / HOA if absent from the MVP model.
- [ ] **Gallery** — Standard images only: presigned upload flow + **Canvas-generated thumbnails** before upload, aligned with **F-3–F-4** and **`PropertyImage`** (`sortOrder`, `isPrimary`).

---

## Database: greenfield baseline (Phase 1 only)

There is **no** ordered “migrate production rows” checklist. After Phase 1, the database is defined entirely by **one** Prisma migration (Prisma DDL + §6.2 raw SQL). All environments that should match MVP run **`npx prisma migrate reset`** (or deploy that migration onto empty databases). Future schema work adds **new** migrations on top of this baseline—never revive deleted migration folders for the same environment.

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

- **Until Phase 1 lands:** Code and DB still reflect the **legacy** model—treat any “align to ARCH” work as provisional until the baseline migration ships.
- **Until Phase 3:** Booking races and weak search parity vs spec.
- **Until Phases 2–3:** WS impersonation and missing read-receipt semantics if not gated in product.
- **Tests:** Few meaningful API tests; no E2E — add as part of MVP hardening after core phases.

---

*After merges: update **Last reviewed**, refresh **At a glance**, and check boxes in **Work queue**.*
