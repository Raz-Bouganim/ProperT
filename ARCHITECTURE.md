# ProperT — Architecture

Canonical technical specification: stack, **software architecture**, **database** (full Prisma schema below), **flows**, API patterns, and conventions.

- **Delivery status:** [`ROADMAP.md`](ROADMAP.md)
- **Setup / repo:** root [`README.md`](README.md)
- **Authoritative schema source:** [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) — the block in §4 duplicates it for docs; if they diverge, **`schema.prisma` wins**.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Software architecture](#2-software-architecture)
3. [Non-functional targets](#3-non-functional-targets)
4. [Database — Prisma schema](#4-database--prisma-schema)
5. [Database — PostgreSQL additions](#5-database--postgresql-additions)
6. [Entity relationship diagram](#6-entity-relationship-diagram)
7. [Flows](#7-flows)
8. [API overview](#8-api-overview)
9. [Infrastructure](#9-infrastructure)
10. [Product conventions](#10-product-conventions)

---

## 1. Executive summary

ProperT is a property marketplace: **Auth0** identity, **NestJS** API, **Next.js** frontend, **PostgreSQL + PostGIS**, **Redis** (cache / Socket.IO scale-out), **S3-compatible** storage, and an **AWS Lambda** image processor.

| Concern | Approach |
|---------|----------|
| **Identity** | Auth0 Universal Login; `User.externalId` = Auth0 `sub`; internal UUID in JWT `sub` for API/WebSocket |
| **Listings** | Table **`properties`**. **Draft** = `publishedAt IS NULL`. Status: `FOR_SALE`, `FOR_RENT`, `CLOSED`. Structured address + **`time_zone`** (IANA) for availability/bookings |
| **Bookings** | Table **`bookings`**; overlap prevented in DB for active statuses; statuses include `COMPLETED`, `LAPSED`; **`note_history`** audit trail |
| **Availability** | Table **`property_availabilities`**; slots computed in listing **time zone** (30-minute steps) |
| **Chat** | Tables **`conversations`**, **`conversation_participants`**, **`messages`**; Socket.IO with **JWT-derived sender**; pagination, archive, edit/reply |
| **Favorites** | Table **`favorites`**; seeker-only toggle; property must be published |
| **Property views** | Table **`property_views`**; tracked per detail-page request (anon + auth); weekly view count drives featured scoring |
| **Search / geo** | PostGIS radius + bounding-box filters; multi-field filter; Redis cached results (60 s) |
| **Featured** | Top 3 listings scored by recency, 7-day views, favorites, geo proximity, user preference; Redis cached 5 min |
| **Images** | Direct browser → S3 via presigned PUT; Lambda (or MinIO webhook locally) produces thumbnail (400 px WebP) and optimized (1500 px WebP) |
| **Geocoding** | Nominatim forward + reverse geocoding |

**Authorization:** No role enums — data-driven (`ownerId`, seeker, conversation membership).

---

## 2. Software architecture

### 2.1 — System diagram

```mermaid
graph TB
  subgraph Client["Browser"]
    UI["Next.js App Router\nReact · Tailwind"]
    SIO["socket.io-client\nJWT in auth.token"]
  end

  subgraph Edge["Edge / LB"]
    LB["nginx / ALB"]
  end

  subgraph API["NestJS API :4000"]
    AUTH["AuthModule\nAuth0 + JWT"]
    USERS["UsersModule"]
    PROP["PropertiesModule"]
    BOOK["BookingsModule"]
    AVAIL["AvailabilityModule"]
    CHAT["ChatModule\nREST + ChatGateway"]
    FAV["FavoritesModule"]
    MEDIA["MediaModule\npresigned S3"]
    GEO["GeoModule\nNominatim"]
    PRISMA["PrismaService"]
  end

  subgraph Data["Data & infra"]
    PG[("PostgreSQL + PostGIS")]
    REDIS[("Redis")]
    S3[("MinIO / S3")]
  end

  subgraph Serverless["Serverless"]
    LAMBDA["Lambda\nimage-processor\nsharp · WebP"]
  end

  subgraph IdP["Identity"]
    AUTH0["Auth0"]
  end

  subgraph External["External"]
    NOM["Nominatim\ngeocoding"]
  end

  UI --> LB
  SIO --> LB
  LB --> API
  UI -->|presigned PUT| S3
  AUTH --> AUTH0
  API --> PG
  API --> REDIS
  CHAT --> REDIS
  MEDIA --> S3
  S3 -->|PutObject event| LAMBDA
  LAMBDA -->|thumbnail + optimized| S3
  GEO --> NOM
```

### 2.2 — Backend modules

| Module | Responsibility |
|--------|----------------|
| **AuthModule** | OAuth code exchange, JWT issuance, Auth0 profile upsert |
| **UsersModule** | User CRUD, public profile, role inference |
| **PropertiesModule** | Listings CRUD, public catalog, geo search, soft delete, view tracking, featured scoring |
| **BookingsModule** | Create/update bookings, role-based status transitions, note history |
| **AvailabilityModule** | Owner schedule CRUD, open-slot API for a calendar day (in listing TZ) |
| **ChatModule** | Conversations + messages (REST pagination + WS fan-out), archive, edit/reply |
| **FavoritesModule** | Toggle + list favorited properties (seeker-only) |
| **MediaModule** | Presigned PUT URLs for uploads; MinIO webhook (local dev image processing) |
| **GeoModule** | Nominatim forward search + reverse geocoding |
| **PrismaModule** (global) | Database access via Prisma Client |
| **RedisModule** (global) | Cache get/set/invalidate; Socket.IO Redis adapter |

### 2.3 — Frontend routes (Next.js App Router)

| Route | Purpose |
|-------|---------|
| `/` | Home: hero, featured listings, how-it-works |
| `/auth` | Login / register (Auth0 social + email/password) |
| `/auth/callback` | Auth0 OAuth code exchange |
| `/search` | Property search with filters, map view (Leaflet), pagination |
| `/properties/[id]` | Property detail; UUID redirects to canonical slug URL |
| `/properties/create` | 4-step listing creation wizard |
| `/dashboard` | User tabs: bookings (seeker), saved homes, incoming requests (owner), my listings |
| `/chat` | Conversation inbox with sidebar + embedded chat |
| `/chat/[id]` | Full-page conversation view |

**Two chat components — do not confuse:**

| Component | Use |
|-----------|-----|
| `components/ChatWindow.tsx` | Popover widget on property detail page; minimal feature set |
| `components/chat/ChatWindow.tsx` | Full-page chat at `/chat/[id]`; file uploads, partner online status, full event set |

---

## 3. Non-functional targets

| ID | Area | Target / note |
|----|------|----------------|
| NF-1 | Throughput | Scale API horizontally; Redis adapter for Socket.IO when multi-instance |
| NF-2 | Search | Sub-second for cached queries (60 s TTL); Redis `X-Cache` header on all property endpoints |
| NF-3 | Media | Direct browser → S3 via presign; API does not stream large bodies; Lambda processes originals asynchronously |
| NF-4 | Security | JWT on REST; WS verifies JWT on connection; **never trust client `senderId`** |
| NF-5 | Bookings | DB exclusion constraint for overlapping **PENDING/CONFIRMED** windows |
| NF-6 | Data integrity | Soft-delete listings; **RESTRICT** deleting `properties` if **conversations** reference them |
| NF-7 | Images | Lambda generates `thumbnails/{key}` (400 px WebP) and `optimized/{key}` (1500 px WebP) per upload; skips derivative keys |
| NF-8 | Analytics | `property_views` tracks every detail-page visit; 7-day window aggregated for featured scoring; no separate analytics store |

---

## 4. Database — Prisma schema

The following is the full `schema.prisma` as of this document (sync from repo if needed — `schema.prisma` is authoritative).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum PropertyType {
  APARTMENT
  HOUSE
  OFFICE
}

/// Listing intent / lifecycle: live sale/rent vs off-market. Draft is `publishedAt IS NULL`, not a status value.
enum PropertyStatus {
  FOR_SALE
  FOR_RENT
  CLOSED

  @@map("PropertyStatus")
}

enum BookingStatus {
  PENDING
  CONFIRMED
  REJECTED
  CANCELLED
  COMPLETED
  LAPSED
}

enum AmenityType {
  SWIMMING_POOL
  GYM
  PARKING
  ELEVATOR
  BALCONY
  SECURITY
  AIR_CONDITIONING
  HEATING
  GARDEN
  FIREPLACE
  PET_FRIENDLY
  FURNISHED
  WASHER_DRYER
  DISHWASHER
  WIFI
}

enum MediaType {
  IMAGE
  VIDEO
  FILE
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id               String    @id @default(uuid())
  email            String    @unique @db.VarChar(254)
  /// Auth0 subject claim (`sub`) — required
  externalId       String    @unique @map("external_id")

  firstName        String    @db.VarChar(100) @map("first_name")
  lastName         String    @db.VarChar(100) @map("last_name")
  /// Profile image URL (Auth0 `picture` or generated initials fallback). Required; not overwritten on later logins once set.
  avatar           String    @db.VarChar(2048)

  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  properties       Property[]
  bookings         Booking[]
  favorites        Favorite[]
  viewLogs         PropertyView[]
  sentMessages              Message[]
  conversationParticipants  ConversationParticipant[]
  seekerConversations       Conversation[] @relation("ConversationSeeker")
  ownerConversations        Conversation[] @relation("ConversationOwner")
}

model Property {
  id          String         @id @default(uuid())
  /// URL-safe unique segment for public links (e.g. /properties/gorgeous-loft-brooklyn-a3f2c1)
  slug        String         @unique @db.VarChar(200)
  title       String         @db.VarChar(255)
  description String
  /// FOR_SALE | FOR_RENT = intent; CLOSED = off-market (still visible to owner per UX). Draft = publishedAt IS NULL.
  status      PropertyStatus @default(FOR_SALE)
  /// Sale: listing price. Rent: monthly rent (same column).
  price       Decimal        @db.Decimal(12, 2)
  sqft        Float
  negotiable  Boolean        @default(true)
  bedrooms    Float?
  bathrooms   Float?
  type        PropertyType

  addressLine String         @db.VarChar(500) @map("address_line")
  city        String         @db.VarChar(100)
  country     String         @db.VarChar(100)
  region      String?        @db.VarChar(100)
  postalCode  String?        @map("postal_code") @db.VarChar(32)

  latitude    Float?
  longitude   Float?

  /// External embed (Matterport, etc.) — no self-hosted 360 video
  virtualTourUrl String?   @db.VarChar(2048) @map("virtual_tour_url")
  floorPlanUrl   String?   @db.VarChar(2048) @map("floor_plan_url")

  currency         String   @default("USD") @db.VarChar(3)
  yearBuilt            Int?      @map("year_built")
  views                Int       @default(0)
  availableFrom        DateTime? @map("available_from")
  leaseDurationMonths  Int?      @map("lease_duration_months")

  ownerId     String   @map("owner_id")
  owner       User     @relation(fields: [ownerId], references: [id])
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  /// IANA time zone (e.g. America/New_York). Weekly `day_of_week` and `start_time` / `end_time` on
  /// property_availabilities are interpreted in this zone. Default "UTC" when omitted at create.
  timeZone    String   @default("UTC") @map("time_zone") @db.VarChar(64)

  images        PropertyImage[]
  amenities     PropertyAmenity[]
  bookings      Booking[]
  availabilities PropertyAvailability[]
  conversations Conversation[]
  favorites     Favorite[]
  viewLogs      PropertyView[]

  @@map("properties")
  @@index([price])
  @@index([ownerId])
  @@index([city])
  @@index([status, price])
  @@index([bedrooms])
  @@index([bathrooms])
}

model PropertyImage {
  id        String   @id @default(uuid())
  url       String   @db.VarChar(2048)
  key       String   @db.VarChar(1024)
  altText   String   @db.VarChar(255) @map("alt_text")
  isPrimary Boolean  @default(false) @map("is_primary")
  sortOrder Int      @default(0) @map("sort_order")

  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  createdAt  DateTime @default(now()) @map("created_at")

  @@index([propertyId, sortOrder])
  @@index([propertyId, isPrimary])
  @@map("PropertyImage")
}

model PropertyAmenity {
  propertyId String      @map("property_id")
  property   Property    @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  amenity    AmenityType

  @@id([propertyId, amenity])
  @@index([amenity])
  @@map("property_amenities")
}

model PropertyAvailability {
  id        String    @id @default(uuid())
  dayOfWeek Int?      @map("day_of_week")
  date      DateTime?
  startTime String    @map("start_time")
  endTime   String    @map("end_time")

  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@index([propertyId])
  @@map("property_availabilities")
}

model Booking {
  id        String        @id @default(uuid())
  startTime DateTime      @map("start_time")
  endTime   DateTime      @map("end_time")
  status    BookingStatus @default(PENDING)
  /// Freeform note on create (legacy / display); mutating changes append to `noteHistory`.
  notes       String?
  /// Newest-first audit lines: `[ISO8601] OWNER|SEEKER|SYSTEM: text` joined with newlines.
  noteHistory String?     @map("note_history") @db.Text

  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  seekerId  String   @map("seeker_id")
  seeker    User     @relation(fields: [seekerId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([propertyId, startTime])
  @@index([seekerId, status])
  @@map("bookings")
}

model Conversation {
  id         String @id @default(uuid())

  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Restrict)

  seekerId String @map("seeker_id")
  seeker   User   @relation("ConversationSeeker", fields: [seekerId], references: [id])

  ownerId String @map("owner_id")
  owner   User   @relation("ConversationOwner", fields: [ownerId], references: [id])

  /// Latest message time for inbox ordering (denormalized).
  lastMessageAt      DateTime? @map("last_message_at")
  /// Truncated snippet for conversation list (denormalized).
  lastMessagePreview String?   @map("last_message_preview") @db.VarChar(512)

  participants ConversationParticipant[]
  messages     Message[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([propertyId, seekerId, ownerId])
  @@index([propertyId])
  @@map("conversations")
}

model ConversationParticipant {
  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id])

  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  lastReadMessageId String?   @map("last_read_message_id")
  lastReadMessage   Message?  @relation("LastRead", fields: [lastReadMessageId], references: [id], onDelete: SetNull)
  lastReadAt        DateTime? @map("last_read_at")

  /// Null = visible in main inbox; set to hide without deleting history.
  archivedAt DateTime? @map("archived_at")

  @@id([userId, conversationId])
  @@index([conversationId])
  @@map("conversation_participants")
}

model Message {
  id        String  @id @default(uuid())
  content   String?
  mediaUrl  String?   @db.VarChar(2048) @map("media_url")
  mediaType MediaType? @map("media_type")

  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  senderId String @map("sender_id")
  sender   User   @relation(fields: [senderId], references: [id])

  editedAt DateTime? @map("edited_at")

  replyToMessageId String?  @map("reply_to_message_id")
  replyToMessage   Message? @relation("MessageReplyThread", fields: [replyToMessageId], references: [id], onDelete: SetNull)
  replies          Message[] @relation("MessageReplyThread")

  readPointers ConversationParticipant[] @relation("LastRead")

  createdAt DateTime @default(now()) @map("created_at")

  @@index([conversationId, createdAt])
  @@index([replyToMessageId])
  @@index([senderId])
  @@map("messages")
}

model Favorite {
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now()) @map("created_at")

  @@id([userId, propertyId])
  @@index([userId])
  @@index([propertyId])
  @@map("favorites")
}

model PropertyView {
  id         String   @id @default(uuid())
  propertyId String   @map("property_id")
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  userId     String?  @map("user_id")
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  viewedAt   DateTime @default(now()) @map("viewed_at")

  @@index([propertyId, viewedAt])
  @@index([userId, viewedAt])
  @@map("property_views")
}
```

---

## 5. Database — PostgreSQL additions

Applied via migrations (not all expressible in Prisma):

```sql
-- Extension for booking range exclusion
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Overlapping bookings (same property, overlapping time range) —
-- only for statuses that "hold" the calendar
ALTER TABLE "bookings" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING GIST (
    "property_id"  WITH =,
    tsrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- Geo + FTS on listings (table "properties")
-- - geography(Point,4326) generated column `location` + GiST index
-- - tsvector `search_vector` + GIN index (title, description, address, city)
-- - CHECK currency ~ '^[A-Z]{3}$'

-- One primary image per property (partial unique index on PropertyImage)
CREATE UNIQUE INDEX ON "PropertyImage" (property_id) WHERE is_primary = true;

-- Availability: exactly one of (day_of_week, date) — CHECK on property_availabilities
-- Message: content OR media required — CHECK on messages
```

Exact DDL lives under **`backend/prisma/migrations/`**.

---

## 6. Entity relationship diagram

```mermaid
erDiagram
  USER {
    uuid id PK
    string email UK
    string external_id UK
    string first_name
    string last_name
    string avatar
    datetime created_at
    datetime updated_at
  }

  PROPERTY {
    uuid id PK
    string slug UK
    string title
    text description
    enum status
    decimal price
    float sqft
    boolean negotiable
    float bedrooms
    float bathrooms
    enum type
    string address_line
    string city
    string country
    string region
    string postal_code
    float latitude
    float longitude
    string virtual_tour_url
    string floor_plan_url
    string currency
    int year_built
    int views
    datetime available_from
    int lease_duration_months
    uuid owner_id FK
    datetime published_at
    datetime created_at
    datetime updated_at
    datetime deleted_at
    string time_zone
  }

  PROPERTY_IMAGE {
    uuid id PK
    string url
    string key
    string alt_text
    boolean is_primary
    int sort_order
    uuid property_id FK
    datetime created_at
  }

  PROPERTY_AMENITY {
    uuid property_id PK_FK
    enum amenity PK
  }

  PROPERTY_AVAILABILITY {
    uuid id PK
    int day_of_week
    datetime date
    string start_time
    string end_time
    uuid property_id FK
  }

  BOOKING {
    uuid id PK
    datetime start_time
    datetime end_time
    enum status
    text notes
    text note_history
    uuid property_id FK
    uuid seeker_id FK
    datetime created_at
    datetime updated_at
  }

  CONVERSATION {
    uuid id PK
    uuid property_id FK
    uuid seeker_id FK
    uuid owner_id FK
    datetime last_message_at
    string last_message_preview
    datetime created_at
    datetime updated_at
  }

  CONVERSATION_PARTICIPANT {
    uuid user_id PK_FK
    uuid conversation_id PK_FK
    uuid last_read_message_id FK
    datetime last_read_at
    datetime archived_at
  }

  MESSAGE {
    uuid id PK
    text content
    string media_url
    enum media_type
    uuid conversation_id FK
    uuid sender_id FK
    datetime edited_at
    uuid reply_to_message_id FK
    datetime created_at
  }

  FAVORITE {
    uuid user_id PK_FK
    uuid property_id PK_FK
    datetime created_at
  }

  PROPERTY_VIEW {
    uuid id PK
    uuid property_id FK
    uuid user_id FK
    datetime viewed_at
  }

  USER ||--o{ PROPERTY : owns
  USER ||--o{ BOOKING : seeks
  USER ||--o{ MESSAGE : sends
  USER ||--o{ CONVERSATION_PARTICIPANT : participates
  USER ||--o{ FAVORITE : saves
  USER ||--o{ PROPERTY_VIEW : generates
  PROPERTY ||--o{ PROPERTY_IMAGE : has
  PROPERTY ||--o{ PROPERTY_AMENITY : has
  PROPERTY ||--o{ PROPERTY_AVAILABILITY : has
  PROPERTY ||--o{ BOOKING : receives
  PROPERTY ||--o{ CONVERSATION : context
  PROPERTY ||--o{ FAVORITE : saved-in
  PROPERTY ||--o{ PROPERTY_VIEW : tracked-in
  CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : members
  CONVERSATION ||--o{ MESSAGE : contains
  MESSAGE ||--o{ CONVERSATION_PARTICIPANT : last_read
```

---

## 7. Flows

### 7.1 — Authentication (Auth0 → ProperT JWT)

```mermaid
sequenceDiagram
  actor User
  participant FE as Next.js
  participant Auth0 as Auth0
  participant API as NestJS API
  participant DB as PostgreSQL

  User->>FE: Login / Register
  FE->>Auth0: Redirect to Universal Login
  Auth0-->>FE: Redirect with code
  FE->>API: POST /auth/oauth/exchange { code, redirectUri }
  API->>Auth0: Exchange code for access token
  API->>Auth0: GET /userinfo
  API->>DB: Upsert User (externalId = sub)
  API-->>FE: ProperT JWT (sub = internal userId)
```

### 7.2 — Chat (REST thread + Socket.IO)

```mermaid
sequenceDiagram
  participant Seeker as Seeker browser
  participant API as REST API
  participant GW as ChatGateway
  participant DB as PostgreSQL
  participant REDIS as Redis

  Seeker->>API: POST /chat/conversations { propertyId, ownerId }
  API->>DB: getOrCreate conversation + participants
  API-->>Seeker: conversation id

  Seeker->>GW: WebSocket connect (JWT in handshake auth)
  GW->>GW: verify JWT → userId
  Seeker->>GW: joinRoom(conversationId)
  GW->>DB: ensure participant
  GW->>REDIS: subscribe to room channel

  Seeker->>GW: sendMessage { conversationId, content, mediaUrl?, mediaType?, replyToMessageId? }
  GW->>DB: insert Message; update conversation lastMessageAt + lastMessagePreview (transaction)
  GW->>REDIS: broadcast newMessage to room
  REDIS-->>GW: fan-out to all connected instances
  GW-->>Seeker: newMessage event to room
```

### 7.3 — Booking (slot + overlap)

```mermaid
sequenceDiagram
  participant Seeker as Seeker
  participant API as Bookings API
  participant AV as AvailabilityService
  participant DB as PostgreSQL

  Seeker->>API: POST /bookings { propertyId, startTime, endTime }
  API->>AV: assertBookableWindow (duration, open slot, no overlap)
  AV->>DB: load property TZ, availability rules, blocking bookings
  AV-->>API: valid or throw 400
  API->>DB: INSERT booking PENDING
  alt Overlap conflict (DB constraint)
    DB-->>API: exclusion constraint violation
    API-->>Seeker: 409
  else OK
    API-->>Seeker: 201 booking
  end
```

### 7.4 — Property search (radius)

```mermaid
sequenceDiagram
  participant Client
  participant API as Properties API
  participant REDIS as Redis
  participant DB as PostgreSQL

  Client->>API: GET /properties?lat&lng&radius&filters
  API->>REDIS: get(properties:search:{hash})
  alt Cache hit
    REDIS-->>API: cached result
    API-->>Client: properties + totalCount (X-Cache: HIT)
  else Cache miss
    API->>DB: ST_DWithin(location, point, radius) + published + status + filters
    DB-->>API: rows + count
    API->>REDIS: set(key, result, 60s)
    API-->>Client: properties + totalCount (X-Cache: MISS)
  end
```

### 7.5 — Listing create / publish

```mermaid
sequenceDiagram
  participant Owner
  participant FE as Next.js
  participant API as Properties API
  participant S3 as S3 / MinIO
  participant DB as PostgreSQL

  Owner->>FE: Fill 4-step create form
  FE->>API: POST /media/presigned-url { fileName, contentType }
  API->>S3: generate presigned PUT URL (1 h)
  API-->>FE: { url, key, publicUrl }
  FE->>S3: PUT image directly (presigned URL)
  FE->>API: POST /properties { title, price, images: [key], publish: false }
  API->>DB: INSERT property published_at = null (draft)
  API-->>FE: property id

  Owner->>API: PATCH /properties/:id { publishedAt: now }
  API->>DB: set published_at, validate
  API->>REDIS: invalidate properties:* cache
  API-->>Owner: published property
```

### 7.6 — Image upload and Lambda processing

```mermaid
sequenceDiagram
  participant Browser
  participant API as NestJS API
  participant S3 as S3 / MinIO
  participant LAMBDA as Lambda (or MinIO webhook)

  Browser->>API: POST /media/presigned-url { fileName, contentType, fileSize }
  API-->>Browser: { url (presigned PUT), key, publicUrl }
  Browser->>S3: PUT original image (presigned URL)
  S3-->>LAMBDA: PutObject event (trigger)
  LAMBDA->>S3: GetObject original
  LAMBDA->>LAMBDA: sharp → resize 400px WebP (q80) = thumbnail
  LAMBDA->>LAMBDA: sharp → resize 1500px WebP (q80) = optimized
  LAMBDA->>S3: PutObject thumbnails/{key}
  LAMBDA->>S3: PutObject optimized/{key}

  Note over LAMBDA,S3: Keys starting with thumbnails/ or optimized/ are skipped to avoid loops
```

---

## 8. API overview

| Area | Routes |
|------|--------|
| **Auth** | `POST /auth/login`, `POST /auth/register`, `POST /auth/oauth/exchange`, `POST /auth/refresh` |
| **Users** | `GET /users/me`, `GET /users/:id` |
| **Properties** | `POST /properties`, `GET /properties` (geo/filter search), `GET /properties/featured`, `GET /properties/mine`, `GET /properties/:id`, `PATCH /properties/:id`, `DELETE /properties/:id` |
| **Bookings** | `POST /bookings`, `GET /bookings/mine`, `PATCH /bookings/:id` |
| **Availability** | `POST /properties/:id/availability`, `GET /properties/:id/availability`, `GET /properties/:id/availability/slots` |
| **Chat** | `POST /chat/conversations`, `GET /chat/conversations`, `GET /chat/conversations/:id`, `PATCH /chat/conversations/:id` (archive), `PATCH /chat/conversations/:id/read`, `GET /chat/messages/:conversationId`, `PATCH /chat/messages/:messageId` |
| **Favorites** | `POST /favorites/:propertyId` (toggle), `GET /favorites` |
| **Media** | `POST /media/presigned-url`, `POST /media/s3-webhook` (local dev only) |
| **Geo** | `GET /geo/search`, `GET /geo/reverse` |

**WebSocket events (ChatGateway):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinRoom` | Client → Server | Join a conversation room; triggers `partnerOnline` to others |
| `sendMessage` | Client → Server | Persist message, broadcast `newMessage` to room |
| `newMessage` | Server → Clients | New message broadcast to conversation room |
| `partnerOnline` | Server → Clients | Emitted to room when a participant connects |
| `partnerOffline` | Server → Clients | Emitted to rooms when a participant disconnects |

---

## 9. Infrastructure

| Component | Use |
|-----------|-----|
| **PostgreSQL + PostGIS** | Primary store; GiST geo index; GIST exclusion constraint on bookings; tsvector FTS on properties |
| **Redis** | Socket.IO multi-instance adapter; search/featured/all-cards cache with TTL and pattern invalidation |
| **S3 / MinIO** | Media storage; presigned PUT for direct browser uploads |
| **AWS Lambda** | Async image processor: triggered by S3 PutObject, outputs thumbnail + optimized WebP |
| **Auth0** | Identity provider; Universal Login; social connections (Google, Apple) |
| **Nominatim** | Open-source geocoding for address → coordinates and reverse |

**Docker Compose (local dev):**

| Service | Image | Host port |
|---------|-------|-----------|
| `postgres` | `postgis/postgis:16-3.4-alpine` | 5433 |
| `redis` | `redis:alpine` | 6379 |
| `minio` | `minio/minio` | 9000 (API), 9001 (console) |

Environment variables: see **`backend/.env.example`** (never commit secrets).

---

## 10. Product conventions

1. **Discovery (public):** `published_at IS NOT NULL`, status in `FOR_SALE` / `FOR_RENT`, `deleted_at IS NULL`. Draft detail URLs require auth as the owner.
2. **Off-market:** `CLOSED` = off-market (visible to owner); soft-delete (`deleted_at`) = fully removed from browse.
3. **Time zones:** Listing **`time_zone`** is authoritative for availability slots and booking window validation; UI aligns date pickers to listing TZ.
4. **Chat archive:** Per-user **`archived_at`** on **`conversation_participants`** — history retained, conversation hidden from inbox.
5. **Chat sender:** Server always uses JWT-derived `userId` as sender — client-supplied `senderId` is never trusted.
6. **Favorites:** Seeker cannot favorite their own listing; property must be published (`published_at IS NOT NULL`).
7. **Images:** Uploaded originals are stored as-is in S3; Lambda asynchronously writes `thumbnails/{key}` and `optimized/{key}` as WebP. UI should prefer `optimized/` for display and `thumbnails/` for thumbnails when available.
8. **Property views:** Every detail-page GET writes a `property_views` row (userId nullable for anonymous visitors). This data feeds featured scoring; it is not exposed directly to users.
9. **Virtual tours:** Embed URL only (`virtualTourUrl`) — no self-hosted 360° video pipelines.
10. **Cache headers:** `X-Cache: HIT` or `MISS` is set on all property endpoint responses by the global `CacheHeaderInterceptor`.

---

*Document revision: 2026-06-09 — full schema sync including Favorite, PropertyView, updated AmenityType, updated indexes, Lambda flow, Favorites and Geo modules.*
