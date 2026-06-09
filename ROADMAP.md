# ROADMAP

**[`ARCHITECTURE.md`](ARCHITECTURE.md)** = spec. **This file** = delivery status. Update after meaningful merges.

---

## Last reviewed

- **Date:** 2026-06-09
- **Focus:** Image processing pipeline, Redis caching, featured scoring, property views, favorites, geo search, search filters, chat and UI improvements

---

## At a glance

| Area | Status |
|------|--------|
| DB / Prisma | **Current** — full schema: `properties`, `bookings`, chat tables, `property_availabilities`, `favorites`, `property_views`; updated indexes; migrations on `main` |
| Auth | Auth0 + JWT; OAuth code exchange; email/password fallback; user upsert by `sub` |
| Listings | Draft vs publish (`publishedAt`), status `FOR_SALE` / `FOR_RENT` / `CLOSED`, structured address + `time_zone` |
| Bookings | Role rules, `note_history`, `LAPSED`, DB overlap exclusion on bookings |
| Availability | IANA TZ on property, 30m slots, `property_availabilities` |
| Chat | Full messaging: cursor pagination, archive, edit/reply, WS JWT, Redis scale-out, redesigned UI |
| Search | Radius + bbox geo; filters (price, beds/baths, type, sqft, amenities, lease); sort; Redis cache |
| Favorites | Toggle + list; optimistic frontend; publisher-only rule enforced |
| Property Views | Per-visit tracking (anon + auth); 7-day count drives featured scoring |
| Featured | Scored by recency + views + favorites + geo proximity + user preference; cached per user + location |
| Media / Lambda | Presigned S3 uploads; Lambda image processor (thumbnail 400px + optimized 1500px WebP) |
| Geo | Nominatim forward + reverse geocoding |

---

## Work queue (high level)

Use **`ARCHITECTURE.md`** for contracts. Check **`[x]`** when done on `main`.

### Done (recent)

- [x] **`properties`** table + listing lifecycle (no `DRAFT` in status enum; draft = `published_at` null).
- [x] User **`avatar`** required; Auth0 picture or initials fallback.
- [x] **`bookings`** rename + statuses (`COMPLETED`, `LAPSED`) + **`note_history`** + owner/seeker transition rules.
- [x] **`property_availabilities`** + property **`time_zone`** + slot overlap constants.
- [x] Chat: **`conversations`**, **`conversation_participants`**, **`messages`**; inbox fields; cursor messages; archive; edit/reply; WS auth via JWT (**no** spoofed `senderId`).
- [x] **RESTRICT** on conversations when deleting properties (keep threads; soft-delete listings).
- [x] **Favorites** — `favorites` table, toggle endpoint (seeker cannot favorite own listing), list endpoint; optimistic UI.
- [x] **Property views** — `property_views` table; tracked on every property detail GET (anon + auth); 7-day count used in featured scoring.
- [x] **Featured endpoint** — top 3 properties scored by recency, 7-day views, favorites count, geo proximity, and user preference inferred from last 10 favorites; cached 5 min per user + location.
- [x] **Redis caching** — search results (60 s), all-cards (5 min), featured (5 min); SCAN-based pattern invalidation on mutations; `X-Cache: HIT/MISS` response header.
- [x] **Lambda image processor** — S3 PutObject trigger; resizes to thumbnail (400 px WebP, q80) and optimized (1500 px WebP, q80); MinIO webhook replaces Lambda in local dev.
- [x] **Search filters** — price range, beds/baths (≥), property type, sqft range, amenities (AND logic), max lease duration, sort (price asc/desc, newest); radius + bounding-box geo.
- [x] **Geo module** — Nominatim forward search + reverse geocoding for property address resolution in frontend.
- [x] **Amenities expanded** — added `SECURITY`, `HEATING`, `WIFI` to `AmenityType`.
- [x] **Message `sender_id` index** — speeds up unread-count queries; unread count query no longer re-joins `conversation_participants` (data taken from already-loaded participants).
- [x] **Chat UI redesign** + **landing page redesign**.

### Still incremental / polish

- [ ] HttpOnly-only JWT + cookie transport — confirm uniform across all routes.
- [ ] Full-text search via `tsvector` GIN index — partially wired; needs consistent query path.
- [ ] Frontend booking/dashboard time labels in listing TZ everywhere.
- [ ] E2E and stronger controller tests.
- [ ] Lambda deployment runbook (IAM role, S3 trigger config, `BUCKET_NAME` env var).
- [ ] Read-receipt route (`PATCH /chat/conversations/:id/read`) — confirm frontend integration.

---

## Out of scope

- `.ics` / external calendar export
- Background job queues (BullMQ, etc.)
- Outbound email notifications
- Payment processing
- Admin panel
- Map tile caching

---

*Bump **Last reviewed** when you merge significant work.*
