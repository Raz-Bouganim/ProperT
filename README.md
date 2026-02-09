# ProperT - Mobile-First Real Estate Marketplace

## Project Structure
- **backend**: Nest.js (Node.js) REST API + WebSockets
- **frontend**: Next.js (React) + Tailwind CSS

## Prerequisites
- Node.js (v18+)
- npm

## Getting Started

### Backend (Nest.js)
1. Navigate to backend:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run start:dev
   ```
   Server runs on http://localhost:5000.

### Frontend (Next.js)
1. Navigate to frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
   App runs on http://localhost:3000.

## Features
- **Responsive Design**: Mobile-first approach, fully responsive.
- **Search**: Advanced filtering modal.
- **Property Details**: Carousel, Accordion, Sticky Action Bar.
- **Chat**: Real-time messaging UI (WebSockets ready).
- **PWA**: Manifest included for home screen installation.

## API Documentation
- `POST /auth/login`: Login
- `POST /auth/register`: Register
- `GET /listings`: Get all listings
- `POST /listings`: Create listing
