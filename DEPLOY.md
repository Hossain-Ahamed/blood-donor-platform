# Deployment Guide

This project is containerized with Docker Compose. It includes:
- **PostgreSQL (+ PostGIS)** database (internal network)
- **Redis** cache (internal network)
- **NestJS API** backend (`apps/api`)
- **Next.js** frontend (`apps/web`)
- *(Optional)* **Caddy** reverse proxy for automated HTTPS (`docker-compose.prod.yml`)

---

## 1. Prerequisites

- Docker and Docker Compose (v2.x recommended)
- Git (to clone the repository)
- A domain name pointing to your VPS (if deploying with SSL/Caddy)

---

## 2. Configuration (`.env`)

Create a `.env` file at the root of the project:

```bash
cp .env.example .env
```

All variables are strictly required by Docker Compose. If any variable is missing, Compose will stop and display an error.

### Required Variables:

| Variable | Description | Example / Default |
|---|---|---|
| `PROJECT_NAME` | Project display name | `"Blood Aid"` |
| `NODE_ENV` | Environment mode | `production` |
| `POSTGRES_USER` | PostgreSQL superuser | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | Database name | `blood_platform` |
| `REDIS_PASSWORD` | Redis authentication password | `redispassword` |
| `PORT` | API internal port | `3001` |
| `API_PORT` | API host port (for external API consumers) | `3001` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Random 32+ char string |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Random 32+ char string |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `30d` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URL | `http://localhost:3001/v1/auth/google/callback` |
| `CORS_ORIGIN` | Allowed web origin | `http://localhost:3000` |
| `MIGRATIONS_RUN` | Auto-run TypeORM migrations on boot | `true` |
| `VAPID_PUBLIC_KEY` | Web push public key | ECDH base64url key |
| `VAPID_PRIVATE_KEY` | Web push private key | ECDH base64url key |
| `WEB_PORT` | Frontend host port | `3000` |
| `INTERNAL_API_URL` | Web-to-API internal Docker URL | `http://api:3001/v1` |
| `NEXT_PUBLIC_API_URL` | External API URL for browser redirects | `http://localhost:3001/v1` |
| `NEXT_PUBLIC_PROJECT_NAME` | Frontend project title | `"Blood Aid"` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`| Web push key for browser subscriptions | Matches `VAPID_PUBLIC_KEY` |

> [!NOTE]
> To generate new VAPID keys, run: `npx web-push generate-vapid-keys`

---

## 3. Network & Port Architecture

Only **two ports** are exposed to the host machine:
- **Port 3000 (`WEB_PORT`)**: Next.js frontend application.
- **Port 3001 (`API_PORT`)**: Backend API & Swagger UI for external clients and OAuth redirects.

**Internal Isolation:**
- PostgreSQL (`5432`) and Redis (`6379`) are isolated inside the `backend` Docker network and are **not** exposed to the outside world.
- The `web` container communicates directly with `api` through Docker's internal DNS using `INTERNAL_API_URL=http://api:3001/v1`.

---

## 4. Build and Start the Stack

To build the images and launch the entire stack in detached mode:

```bash
docker compose up -d --build
```

### Access Endpoints:
- **Website**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **API Health Check**: [http://localhost:3001/v1/health](http://localhost:3001/v1/health)

---

## 5. Database Migrations & Seeding

### Migrations
Migrations (including PostGIS extension initialization and table schema creation) run **automatically on container startup** when `MIGRATIONS_RUN=true`.

If you ever need to run migrations manually:

```bash
docker compose exec api pnpm --filter api migration:run
```

### Seeding (Optional)
To populate sample donors and requests:

```bash
docker compose exec api pnpm --filter api seed
```

---

## 6. Bootstrapping the First Admin

There is no public signup for Admins. To grant the first user admin privileges:

1. Sign in once via Google OAuth at `http://localhost:3000/login`.
2. Connect to the PostgreSQL database container:

```bash
docker compose exec postgres psql -U postgres -d blood_platform
```

3. Update the user's role:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your.email@gmail.com';
```

---

## 7. Production with Caddy & HTTPS (Optional)

If deploying to a public VPS with domain names and automated Let's Encrypt certificates:

1. Update [Caddyfile](file:///home/hossain/Documents/blood-donor-platform/Caddyfile) with your domain name.
2. Start the production compose stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Maintenance & Operations

**View logs from all containers:**
```bash
docker compose logs -f
```

**View API logs specifically:**
```bash
docker compose logs -f api
```

**Restart a service:**
```bash
docker compose restart api
```

**Check service health:**
```bash
docker compose ps
```

**Stop the stack:**
```bash
docker compose down
```

**Stop and remove persistent volumes (Caution: removes database data):**
```bash
docker compose down -v
```
