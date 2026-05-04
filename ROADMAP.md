# ROADMAP

**[`ARCHITECTURE.md`](ARCHITECTURE.md)** = spec. **This file** = delivery status. Update after meaningful merges.

---

## Last reviewed

- **Date:** 2026-05-04  
- **Focus:** Schema aligned with implemented `properties`, `bookings`, chat, availability TZ, Auth0 user avatar  

---

## At a glance

| Area | Status |
|------|--------|
| DB / Prisma | **Current** — `properties`, `bookings`, `conversations` / `messages`, `property_availabilities`, User `avatar` + migrations on `main` |
| Auth | Auth0 + JWT; user upsert by `sub`; optional legacy paths being removed per earlier phases |
| Listings | Draft vs publish (`publishedAt`), status `FOR_SALE` / `FOR_RENT` / `CLOSED`, structured address + `time_zone` |
| Bookings | Role rules, `note_history`, `LAPSED`, DB overlap on `bookings` |
| Availability | IANA TZ on property, 30m slots, `property_availabilities` |
| Chat | Snake_case tables, pagination, archive, edit/reply, WS JWT |
| Search | Radius + filters in service; Redis FTS cache optional / incremental |

---

## Work queue (high level)

Use **`ARCHITECTURE.md`** for contracts. Check **`[x]`** when done on `main`.

### Done (recent)

- [x] **`properties`** table + listing lifecycle (no `DRAFT` in status enum; draft = `published_at` null).
- [x] User **`avatar`** required; Auth0 picture or initials fallback.
- [x] **`bookings`** rename + statuses (`COMPLETED`, `LAPSED`) + **`note_history`** + owner/seeker transition rules.
- [x] **`property_availabilities`** + property **`time_zone`** + slot overlap constants.
- [x] Chat: **`conversations`**, **`conversation_participants`**, **`messages`**; inbox fields; cursor messages; archive; WS auth via JWT (**no** spoofed `senderId`).
- [x] **RESTRICT** on conversations when deleting properties (keep threads; soft-delete listings).

### Still incremental / polish

- [ ] HttpOnly-only JWT + cookie transport everywhere (if not already uniform).
- [ ] Full-text + Redis 60s cache + single SQL path if not fully wired.
- [ ] `PATCH` read receipt route if still missing vs product needs.
- [ ] Frontend: booking/dashboard time labels in listing TZ everywhere.
- [ ] E2E and stronger controller tests.

---

## Out of scope

Same as [`ARCHITECTURE.md`](ARCHITECTURE.md) §6 — calendar export, BullMQ, etc.

---

*Bump **Last reviewed** when you merge significant work.*
