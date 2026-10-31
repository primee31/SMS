# SMS
# Brightloop Subscription Management System (SMS)

**Brightloop SMS** is an enterprise‑grade, full‑stack subscription management platform built with **JavaScript only**. It supports product & plan configuration, quotations, subscription lifecycles, recurring billing, invoicing, taxes, discounts, payments, analytics and a customer portal – all without any external SaaS APIs.

## Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui, Lucide, React Router 7, Axios, React‑Hook‑Form, Zod
- **Backend**: Node 22+, Express 5, PostgreSQL (Neon or local), Prisma ORM, JWT, bcryptjs, Zod
- **Background Jobs**: Redis, BullMQ, node‑cron (worker process)
- **Testing**: Vitest, Supertest, Playwright
- **Containerisation**: Docker‑Compose (Redis, optional PostgreSQL)

## Repository Structure
```
subscription-management-system/
  frontend/
    ...
  backend/
    ...
  shared/
    API_CONTRACT.md
    DATABASE_SCHEMA.md
    PROJECT_RULES.md
  docker-compose.yml
  package.json
  .gitignore
  README.md
```

## Prerequisites
- Node 22+ (npm 10+)
- Docker Desktop (for Redis & optional PostgreSQL)
- PostgreSQL instance (local or Neon) – see `.env.example`

## Quick Start (Development)
```bash
# Install dependencies for all packages
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit the .env files with your DB credentials

# Run database migrations and seed data
npm run db:migrate
npm run db:seed

# Start the whole stack (frontend, backend, worker)
npm run dev
```
- Frontend runs at **http://localhost:5173**
- Backend API at **http://localhost:4000/api/v1**
- Worker process logs background jobs.

## Scripts
| Script | Description |
|--------|-------------|
| `install:all` | Installs dependencies for root, frontend and backend |
| `dev` | Starts frontend, backend and worker concurrently |
| `dev:frontend` | Starts Vite dev server |
| `dev:backend` | Starts Express server |
| `worker` | Starts BullMQ worker process |
| `db:migrate` | Runs Prisma migrations |
| `db:seed` | Executes seed script |
| `test` | Runs all Vitest, Supertest and Playwright tests |
| `build` | Builds frontend for production |

## Production Build
```bash
npm run build   # builds frontend assets
# Deploy backend (Node) and serve built static files via any static server or CDN.
```

## Documentation
- **API contract** – `shared/API_CONTRACT.md`
- **Database schema** – `shared/DATABASE_SCHEMA.md`
- **Project rules** – `shared/PROJECT_RULES.md`
