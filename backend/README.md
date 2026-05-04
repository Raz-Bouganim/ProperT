# ProperT — Backend

NestJS API + Prisma + PostgreSQL. Parent docs: repo root **`README.md`**, **`ARCHITECTURE.md`**, **`ROADMAP.md`**.

## Commands

```bash
npm install
npx prisma migrate deploy   # or migrate dev
npx prisma generate
npm run start:dev
```

API default: **http://localhost:4000** · Swagger often at **`/api`**.

## Prisma

Schema: **`prisma/schema.prisma`**. Physical tables include **`properties`**, **`bookings`**, **`conversations`**, **`messages`**, **`conversation_participants`**, **`property_availabilities`**.

## Modules (overview)

`auth`, `users`, `properties`, `bookings`, `availability`, `chat`, `media`, `geo`, `prisma`.
