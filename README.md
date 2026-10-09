# Blood Aid - Emergency Blood Donor & Geolocation Platform

[![Live Platform](https://img.shields.io/badge/Live_Demo-bloodaid.scripthorizon.tech-E63946?style=for-the-badge&logo=googlechrome&logoColor=white)](https://bloodaid.scripthorizon.tech)
[![Swagger API Docs](https://img.shields.io/badge/Swagger_Docs-Interactive_API-06D6A0?style=for-the-badge&logo=swagger&logoColor=white)](https://bloodaid.scripthorizon.tech/api/docs)
[![Docker Ready](https://img.shields.io/badge/Docker-Compose_Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
[![NestJS](https://img.shields.io/badge/Backend-NestJS_10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_15_PWA-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)

**Blood Aid** is an open-source, full-stack emergency blood donation coordination platform. It connects patients and hospitals with verified, eligible blood donors nearby using real-time spatial queries (PostGIS), Redis memory caches, Web Push alerts, and social trust graphs.

---

## Live Deployment and Endpoints

| Service | URL | Description |
| :--- | :--- | :--- |
| **Web Application** | [https://bloodaid.scripthorizon.tech](https://bloodaid.scripthorizon.tech) | Next.js 15 PWA responsive interface |
| **Interactive API Docs** | [https://bloodaid.scripthorizon.tech/api/docs](https://bloodaid.scripthorizon.tech/api/docs) | Complete Swagger UI with schemas and "Try It Out" |
| **REST API Base** | [https://bloodaid.scripthorizon.tech/v1](https://bloodaid.scripthorizon.tech/v1) | Versioned RESTful API endpoints |
| **Health Check** | [https://bloodaid.scripthorizon.tech/v1/health](https://bloodaid.scripthorizon.tech/v1/health) | Terminus service liveness & database ping |

---

## Core Features and Capabilities

- **Spatial Proximity Matching**: PostGIS-powered geographic indexing (`ST_DWithin`, `ST_Distance`) finds available donors and urgent blood requests within custom radius bounds (1km to 200km).
- **Instant Multi-Channel Alerts**: Web Push Notifications (VAPID) wake background service workers on donor devices the moment a matching request is published nearby.
- **Redis Smart Feed**: Sub-millisecond prioritized in-app alerts with distributed mutex locks to prevent cache stampedes and penetration.
- **Trust and Social Verification Graph**: Verified donor badges, donation completion confirmation tracking, and trusted friend networks to prevent fraudulent blood requests.
- **Moderation and Audit Pipeline**: Community issue reporting system and comprehensive immutable admin audit trail tracking all moderation actions.
- **Progressive Web App (PWA)**: Installable on Android, iOS, and desktop browsers with offline fallback and standalone app feel.

---

## Swagger Documentation and Authentication

The interactive API documentation is accessible at [https://bloodaid.scripthorizon.tech/api/docs](https://bloodaid.scripthorizon.tech/api/docs).

### Schema Reflection and Parameters
All Data Transfer Objects (DTOs) are decorated with NestJS Swagger annotations (`@ApiProperty`, `@ApiPropertyOptional`, `@ApiParam`, `@ApiQuery`), and the NestJS Swagger compiler plugin is enabled in `nest-cli.json`. This guarantees complete TypeScript schema reflection, example payloads, and validation constraints in Swagger UI even inside production Docker containers.

### Authenticating in Swagger UI
1. Open [https://bloodaid.scripthorizon.tech/api/docs](https://bloodaid.scripthorizon.tech/api/docs).
2. Click the **Authorize** button at the top right.
3. In the BearerAuth dialog, enter your JWT access token:
   ```text
   Bearer YOUR_JWT_ACCESS_TOKEN
   ```
4. Click **Authorize** then **Close**. All protected endpoints can now be executed directly from your browser.

---

## Self-Hosting Quickstart (Docker Compose)

Deploy your own complete instance in minutes using Docker Compose.

### 1. Prerequisites
- Docker (v24+) and Docker Compose (v2+)
- A Google Cloud OAuth 2.0 Client ID and Secret ([Google Cloud Console](https://console.cloud.google.com/))

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/blood-donor-platform.git
cd blood-donor-platform
```

### 3. Configure Environment Variables
Copy the provided `.env.example` file:
```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```ini
PROJECT_NAME="Blood Aid"
NODE_ENV=production

# Database & Redis credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=blood_platform
REDIS_PASSWORD=your_secure_redis_password

# API Settings
PORT=3001
API_PORT=3001
MIGRATIONS_RUN=true
ADMIN_EMAIL=your-email@example.com

# JWT Keys (use random 64-character strings in production)
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_characters
JWT_ACCESS_EXPIRES_IN=30d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters
JWT_REFRESH_EXPIRES_IN=30d

# Web App & CORS
# For local testing use: http://localhost:3000
# For production use your domain: https://bloodaid.scripthorizon.tech
CORS_ORIGIN=https://bloodaid.scripthorizon.tech
NEXT_PUBLIC_API_URL=https://bloodaid.scripthorizon.tech
NEXT_PUBLIC_API_VERSION=v1

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
# Note: Google callback does not use version prefix (/auth/google/callback)
GOOGLE_CALLBACK_URL=https://bloodaid.scripthorizon.tech/auth/google/callback

# VAPID Web Push Keys (Generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### 4. Build and Start the Services
```bash
docker compose up -d --build
```

Verify that all containers are running and healthy:
```bash
docker compose ps
```

Containers started:
- `blood_postgres` (PostgreSQL 15 with PostGIS extension)
- `blood_redis` (Redis 7 in-memory cache and queues)
- `blood_api` (NestJS REST API engine on port 3001)
- `blood_web` (Next.js 15 PWA frontend on port 3000)

### 5. Seed the Administrator Account
Run the automated seed script inside the running API container:
```bash
docker compose exec api node dist/seed.js
```
The seed script inspects `ADMIN_EMAIL` in your `.env`. If the account exists, it promotes the user to `ADMIN`; if it does not exist yet, it creates the administrator account automatically.

---

## API Consumption Guide

All endpoints except authentication use the `/v1` prefix. Protected routes require the `Authorization: Bearer <TOKEN>` header.

### 1. Authentication Flow
- Initiate Google Login: Redirect user to `GET /auth/google`.
- Refresh Token:
  ```bash
  curl -X POST https://bloodaid.scripthorizon.tech/v1/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
  ```

### 2. User and Donor Profiles
- Get Current User:
  ```bash
  curl -X GET https://bloodaid.scripthorizon.tech/v1/users/me \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```
- Upsert Donor Profile:
  ```bash
  curl -X POST https://bloodaid.scripthorizon.tech/v1/donor-profiles \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "blood_group": "O+",
      "lat": 23.8103,
      "lng": 90.4125,
      "area_name": "Dhanmondi, Dhaka",
      "is_available": true
    }'
  ```
- Find Nearby Donors:
  ```bash
  curl -X GET "https://bloodaid.scripthorizon.tech/v1/donor-profiles/nearby?lat=23.8103&lng=90.4125&radiusKm=10&blood_group=O+" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

### 3. Blood Requests
- Create an Emergency Request:
  ```bash
  curl -X POST https://bloodaid.scripthorizon.tech/v1/requests \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "blood_group": "A+",
      "units_needed": 2,
      "urgency": "EMERGENCY",
      "hospital_name": "Dhaka Medical College Hospital",
      "area_name": "Bakshibazar, Dhaka",
      "contact_phone": "+8801700000000",
      "lat": 23.7259,
      "lng": 90.3976
    }'
  ```
- Search Nearby Blood Requests:
  ```bash
  curl -X GET "https://bloodaid.scripthorizon.tech/v1/requests/nearby?lat=23.7259&lng=90.3976&radiusKm=15"
  ```

### 4. Responding and Donating
- Respond to a Request as Donor:
  ```bash
  curl -X POST https://bloodaid.scripthorizon.tech/v1/requests/REQUEST_UUID/responses \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "I can donate blood within 1 hour."}'
  ```

### 5. Smart Notification Feed
- Fetch Real-Time Alerts:
  ```bash
  curl -X GET https://bloodaid.scripthorizon.tech/v1/smart-feed \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

---

## Community Sponsorship and Collaboration Call

This platform is developed as a free, open-source community health service to assist during critical medical emergencies. We are actively seeking partners, sponsors, and contributors to scale the platform:

### 1. Codebase and Feature Contributions
We welcome developers, designers, and community advocates. Areas of contribution include:
- Frontend UI/UX enhancements and micro-interactions
- Offline caching optimizations for service workers
- Multi-language localization (Bangla / English)
- Automated end-to-end testing (Playwright / Cypress)

### 2. Google Maps Platform API Sponsorship
- **Context**: The platform currently uses open OpenStreetMap tiles with Leaflet.
- **The Challenge**: In Bangladesh and South Asia, OpenStreetMap frequently lacks hyper-local points of interest, newly established hospitals, precise reverse geocoding, and traffic-aware travel duration estimates.
- **How You Can Help**: If you or your organization has access to Google Cloud credits or can sponsor Google Maps Platform APIs (Places API, Geocoding API, Directions API), we can integrate real-time hospital autocomplete, precise routing, and estimated arrival times for donors.

### 3. Bulk SMS Gateway Sponsorship (Bangladesh)
- **Context**: Alerts currently rely on Web Push notifications and email, which require continuous internet connectivity and smartphone notification permissions.
- **The Challenge**: During urgent medical crises in Bangladesh, every minute matters. Many dedicated blood donors do not have active mobile data or smartphones at all times, and non-technical family members may struggle with Google OAuth login.
- **How You Can Help**: We are seeking sponsorship or subsidized API access for a local **Bangladesh Bulk SMS Gateway** (e.g., SSL Wireless, Metronet, InfoBip, or direct operator gateways for Grameenphone, Robi, Banglalink, Teletalk) to enable:
  1. **Phone Number OTP Login**: Instant mobile login without requiring a Google account.
  2. **Emergency Donor Broadcasts**: Direct SMS dispatch to matching eligible donors within a 5-10 km radius of the hospital whenever an urgent emergency request is created.

---

## Contact and Maintainer Information

If you are interested in sponsoring API credits, integrating SMS gateways, or collaborating on this project:

- **Maintainer**: Md. Ahamed Hossain
- **Portfolio**: [https://hossain-ahamed.com](https://hossain-ahamed.com)
- **Project Domain**: [https://bloodaid.scripthorizon.tech](https://bloodaid.scripthorizon.tech)
- **GitHub Issues & PRs**: Submit an issue or pull request directly to this repository.

---

## License
This project is open-source under the [MIT License](LICENSE).
