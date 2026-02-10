# ProperT - Next-Generation Real Estate Platform

**ProperT** is a modern, high-performance real estate platform designed to streamline property discovery and transaction management. It bridges the gap between Agents, Private Sellers, and Seekers by offering real-time communication, intelligent scheduling, and hyper-local discovery.

## 🚀 Vision
To democratize property discovery by removing friction. We provide rich data, automated viewing scheduling, and direct messaging to make finding a home as easy as booking a hotel.

---

## 🏗️ Tech Stack (Best Practices)

### Frontend
- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: TypeScript (Strict)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **State Management**: Zustand (Client) + TanStack Query (Server State)
- **Maps**: Leaflet / Mapbox (to be implemented)

### Backend
- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: TypeScript
- **Database**: PostgreSQL + PostGIS (Geospatial)
- **ORM**: Prisma
- **Real-time**: Socket.io (Chat & Notifications)
- **Queues**: BullMQ + Redis (Async jobs)

---

## ✨ Key Features

1.  **Advanced Geo-Spatial Search**: "Search this area" map functionality and radius-based discovery.
2.  **Smart Tour Scheduling**: Automated booking system preventing conflicts and managing availability.
3.  **Real-Time Messaging**: Direct chat between Seekers and Listers, contextualized by property.
4.  **Rich Property Details**: High-res media, virtual tour integration, and structured amenity data.
5.  **Role-Based Access**: Specialized dashboards for Agents, Owners, and Admins.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (for DB/Redis)
- npm or pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/propert.git
    cd propert
    ```

2.  **Start Infrastructure (Postgres, Redis)**
    ```bash
    docker-compose up -d
    ```

3.  **Backend Setup**
    ```bash
    cd backend
    npm install
    npx prisma migrate dev
    npm run start:dev
    ```
    *Server runs on http://localhost:5000*

4.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *App runs on http://localhost:3000*

---

## 🗺️ Roadmap

- [ ] **Phase 1**: Core Architecture (NestJS + Postgres Setup, Auth System)
- [ ] **Phase 2**: Listing Management & Geo-Search (PostGIS integration)
- [ ] **Phase 3**: Booking System & "My Schedule" Dashboard
- [ ] **Phase 4**: Real-time Chat & Notifications
- [ ] **Phase 5**: Analytics & Recommendations Engine

---

## 📄 License
This project is licensed under the MIT License.
