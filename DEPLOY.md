# Deployment Guide (Nginx Reverse Proxy)

This project is fully containerized with Docker Compose and designed to sit securely behind an **Nginx reverse proxy** with SSL/TLS.

**Production Domain:** [https://bloodaid.scripthorizon.tech](https://bloodaid.scripthorizon.tech)

---

## 1. Architecture Overview

### How Ports are Hidden from the Internet
In [docker-compose.yml](file:///home/hossain/Documents/blood-donor-platform/docker-compose.yml):
- **Web (`3000`)** and **API (`3001`)** are bound **strictly to `127.0.0.1`** (localhost).
- They are **hidden from the public internet**. No external visitor or firewall scanner can access `http://<server-ip>:3000` or `http://<server-ip>:3001` directly.
- **PostgreSQL (`5432`)** and **Redis (`6379`)** have **no host ports** published at all. They are strictly isolated inside the `backend` Docker network.
- Inside Docker, the Next.js `web` container talks directly to the NestJS `api` container via `INTERNAL_API_URL=http://api:3001`.

```mermaid
flowchart TB
    Public["Public Internet / Users / Mobile Apps"] -->|HTTPS :443| Nginx["Nginx Reverse Proxy (Host)"]
    
    subgraph "Host Machine (Localhost 127.0.0.1 only)"
        Nginx -->|"Proxy / (pages)"| Web["Web Container :3000"]
        Nginx -->|"Proxy /v*, /auth*, /api/docs"| API["API Container :3001"]
    end

    subgraph "Docker Internal Network (Not Exposed)"
        Web -->|"INTERNAL_API_URL (http://api:3001)"| API
        API --> DB[("PostgreSQL")]
        API --> Redis[("Redis")]
    end
```

---

## 2. How People Access the Application & API

External clients (web browsers, mobile apps, third-party developers, and Swagger) access everything through your single public domain **`https://bloodaid.scripthorizon.tech`**:

| Path | Destination | Description |
|---|---|---|
| `https://bloodaid.scripthorizon.tech/` | Next.js Frontend (`:3000`) | Main web platform UI |
| `https://bloodaid.scripthorizon.tech/auth/google` | NestJS API (`:3001`) | Initiates Google OAuth login |
| `https://bloodaid.scripthorizon.tech/auth/google/callback` | NestJS API (`:3001`) | Google OAuth callback handler |
| `https://bloodaid.scripthorizon.tech/v1/...` | NestJS API (`:3001`) | Version 1 API endpoints |
| `https://bloodaid.scripthorizon.tech/v2/...` | NestJS API (`:3001`) | Future API versions (auto-routed) |
| `https://bloodaid.scripthorizon.tech/api/docs` | NestJS API (`:3001`) | Swagger API interactive documentation |

---

## 3. Configuration (`.env`)

Create a `.env` file at the root of the project:

```bash
cp .env.example .env
```

All variables are strictly required. If any variable is missing, Compose will stop and display an error.

### Key Production Settings:

```env
PROJECT_NAME="Blood Aid"
NODE_ENV=production

# Database & Redis (Internal to Docker)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_strong_db_password
POSTGRES_DB=blood_platform
REDIS_PASSWORD=your_strong_redis_password

# API Service
PORT=3001
API_PORT=3001
MIGRATIONS_RUN=true
JWT_ACCESS_SECRET=your_32char_hex_secret
JWT_REFRESH_SECRET=your_32char_hex_secret
CORS_ORIGIN=https://bloodaid.scripthorizon.tech

# Google OAuth (Unversioned callback)
GOOGLE_CLIENT_ID=631641086229-uhss2d2elmmouho1tsjps9ec0l1jprtp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://bloodaid.scripthorizon.tech/auth/google/callback

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Frontend Web
WEB_PORT=3000
NEXT_PUBLIC_API_URL=https://bloodaid.scripthorizon.tech
NEXT_PUBLIC_PROJECT_NAME="Blood Aid"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

---

## 4. Setup Nginx Reverse Proxy on Host

A production-ready Nginx configuration template is provided in [nginx.conf.example](file:///home/hossain/Documents/blood-donor-platform/nginx.conf.example).

### Step 1: Copy configuration to Nginx
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/bloodaid.scripthorizon.tech
```

### Step 2: Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/bloodaid.scripthorizon.tech /etc/nginx/sites-enabled/
```

### Step 3: Test and reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Obtain Free SSL Certificate with Certbot
```bash
sudo certbot --nginx -d bloodaid.scripthorizon.tech
```
*Certbot will automatically configure HTTPS on port 443 and redirect HTTP (port 80) to HTTPS.*

---

## 5. Build and Start the Docker Stack

Ensure your `.env` file is in place, then launch the stack:

```bash
docker compose up -d --build
```

### Verify Running Containers
```bash
docker compose ps
```
Both `blood_web` and `blood_api` will be running, bound only to `127.0.0.1:3000` and `127.0.0.1:3001`.

---

## 6. Database Migrations & First Admin

### Migrations
When `MIGRATIONS_RUN=true`, database migrations and the PostGIS extension run **automatically on container startup**.

To run migrations manually if ever needed:
```bash
docker compose exec api pnpm --filter api migration:run
```

### Bootstrapping First Admin
1. Log in once via Google OAuth at `https://bloodaid.scripthorizon.tech/login`.
2. Connect to the PostgreSQL database container:
   ```bash
   docker compose exec postgres psql -U postgres -d blood_platform
   ```
3. Update user role:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your.email@gmail.com';
   ```

---

## 7. Maintenance Commands

**View logs from all containers:**
```bash
docker compose logs -f
```

**View API logs specifically:**
```bash
docker compose logs -f api
```

**Restart a service (e.g. after code update):**
```bash
docker compose restart api
docker compose restart web
```

**Stop the stack:**
```bash
docker compose down
```
