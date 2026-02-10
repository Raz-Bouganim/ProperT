# ProperT - Real Estate Marketplace 🏠

A modern, high-performance real estate platform built with **NestJS**, **Next.js 15**, and **PostgreSQL**.

## 🚀 Features
- **Listings:** Create, view, and manage property listings with rich media.
- **Geo-Search:** Find homes within a specific radius using **PostGIS** spatial queries.
- **Interactive Map:** dynamic map interface (`react-leaflet`) synced with search results.
- **Media Pipeline:** Direct-to-S3 uploads using presigned URLs.
- **Authentication:** JWT-based auth with Role-Based Access Control (RBAC).

## 🛠️ Tech Stack
- **Backend:** NestJS, Prisma, PostgreSQL + PostGIS, Redis.
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, React-Leaflet.
- **Infrastructure:** Docker Compose (Postgres, MinIO, Redis).

## 🏃‍♂️ Quick Start

1.  **Start Infrastructure:**
    ```bash
    docker-compose up -d
    ```

2.  **Backend:**
    ```bash
    cd backend
    npm install
    # Apply migrations (including PostGIS)
    npx prisma migrate dev
    npm run start:dev
    ```

3.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

> **Note:** We have added automatic port cleanup scripts. Running `npm run dev` or `npm run start:dev` will automatically kill any lingering processes on ports 3000/5000.
