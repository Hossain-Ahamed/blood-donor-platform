# Deployment Guide

This project is fully containerized with Docker Compose for a self-hosted environment. It includes a PostgreSQL (+ PostGIS) database, Redis, the NestJS API, the Next.js Web frontend, and a Caddy reverse proxy that automatically handles HTTPS (Let's Encrypt).

## 1. Prerequisites

- A Linux VPS (Ubuntu/Debian recommended)
- A domain name pointing to your VPS's IP address (A record)
- Docker and Docker Compose installed
- Git installed (to clone your repository)

## 2. Configuration (.env)

Create a real `.env` file at the root of the project. Do **NOT** commit this file.

```bash
cp .env.example .env
```

Open `.env` and fill in the **real** values:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_PASSWORD`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (generate random secure strings)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- `GOOGLE_CALLBACK_URL` (e.g. `https://yourdomain.com/v1/auth/google/callback`)
- `CORS_ORIGIN` (e.g. `https://yourdomain.com`)
- `NEXT_PUBLIC_API_URL` (e.g. `https://yourdomain.com/v1`)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (Required for web push notifications. Generate a pair by running `npx web-push generate-vapid-keys` in your terminal and paste them here)

### Caddyfile Update
Open `Caddyfile` and replace `example.com` at the top with your actual domain (e.g. `Blood Aid.com`).

## 3. Build and Start the Services

Run the following command to build the production images and start the stack in detached mode:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Run Migrations

Once the stack is up, you need to run the TypeORM migrations inside the API container to set up the database schema and enable PostGIS:

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter api migration:run
```

*(Optional) Seed the database if you want sample data:*
```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter api seed
```

## 5. Bootstrapping the First Admin

There is no signup flow for Admins. To grant the first user admin privileges, they must first log in normally via Google. Then, manually update their role in the database:

```bash
# Connect to the PostgreSQL container
docker compose -f docker-compose.prod.yml exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB>

# Run this SQL command:
UPDATE users SET role = 'ADMIN' WHERE email = 'your.email@gmail.com';
```

## 6. Maintenance & Logs

**View all logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**View API logs specifically:**
```bash
docker compose -f docker-compose.prod.yml logs -f api
```

**Restart a service (e.g., API):**
```bash
docker compose -f docker-compose.prod.yml restart api
```

**Stop the stack:**
```bash
docker compose -f docker-compose.prod.yml down
```

