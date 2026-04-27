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

> **Note (macOS):** The API defaults to **port 4000** because **5000** is often taken by **AirPlay Receiver**; requests there get `403` / “Network Error” instead of hitting NestJS. Set `PORT` / `NEXT_PUBLIC_API_URL` if you use another port.
