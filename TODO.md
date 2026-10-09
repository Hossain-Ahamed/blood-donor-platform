# Deployment & API-versioning plan

Goal: run behind our **own nginx** (no Caddy), remove every hardcoded URL / `/v1`,
and support **multiple API versions at the same time** so the web app can stay on one
version while older versions keep running for other clients (mobile apps, partners, etc.).

> Status: **plan only, no application code has been changed yet.**
> Everything below is the proposed change set, for review.

---

## 1. Findings in the current code

| # | Finding                                                                                                                                                                  | Where                                                                                                                      |
| - | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 1 | `\|\| "http://localhost:3001/v1"` fallback hardcoded in 3 places. Inside a container `localhost` is the container itself, so a missing env var becomes a confusing 502 | `apps/web/src/lib/api/server.ts`, `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/login/page.tsx` |
| 2 | `/v1` is baked into `NEXT_PUBLIC_API_URL`, and the API itself hardcodes `defaultVersion: "1"`                                                                      | `apps/api/src/main.ts`, `DEPLOY.md`                                                                                    |
| 3 | `server.ts` calls the API through the **public** URL instead of the Docker-internal one                                                                          | `apps/web/src/lib/api/server.ts`                                                                                         |
| 4 | `NEXT_PUBLIC_*` values are inlined at **build** time, but compose only passes them as runtime `environment`                                                    | `docker-compose.prod.yml`, `apps/web/Dockerfile`                                                                       |
| 5 | Cookie`secure` flag is derived with `NEXT_PUBLIC_API_URL.includes("localhost")` (brittle)                                                                            | `apps/web/src/app/actions/auth.ts`, `apps/web/src/app/login/success/route.ts`                                          |
| 6 | `Caddyfile` is referenced by compose but is **not in the repo**                                                                                                  | `docker-compose.prod.yml`                                                                                                |
| 7 | Browser data calls already go through same-origin`/api/proxy/*` (safe). The **only** direct browser -> API call is the Google OAuth redirect                     | `apps/web/src/lib/api/client.ts`, `login/page.tsx`                                                                     |
| 8 | `server-only` package is not installed yet (needed by the proposed `config.ts`)                                                                                      | `apps/web/package.json`                                                                                                  |

---

## 2. Design

### 2.1 Versioning model

- The API serves **many versions at once**: `/v1/...`, `/v2/...`. Versions are declared per route in code
  (`@Version('2')`), the Nest convention. Old routes are never removed until deprecated.
- `API_DEFAULT_VERSION` (env) = version used by routes that have no `@Version`, and the version the **web app** talks to by default.
- The web app is pinned to **one** version via `API_DEFAULT_VERSION`. It can opt a single call into another version
  (`{ version: "2" }`). Other clients choose their own version through the URL.
- `API_SUPPORTED_VERSIONS` (web, allowlist) validates any version coming from a request, which prevents path injection through the proxy.
- No env var contains `.../v1` any more. Origin and version are separate.

### 2.2 Google OAuth is version-neutral

The callback URL is registered with Google and must **never** change when `v2` ships.
`GET /auth/google` and `GET /auth/google/callback` become `VERSION_NEUTRAL`
(served at `/auth/google...`, no version segment).

### 2.3 Two deployment topologies

|                                         | **A. One port**                               | **B. Two ports**                                             |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ |
| Published on host                       | `127.0.0.1:3000` (web)                            | `127.0.0.1:3000` (web) + `127.0.0.1:3001` (api)                |
| Public (via our nginx)                  | 443 only                                            | 443 only                                                           |
| nginx routing                           | everything -> web                                   | `/` -> web, `/v{n}/*`, `/auth/google*`, `/api/docs` -> api |
| Who routes`/v{n}` to the API          | Next.js`rewrites()`                               | nginx                                                              |
| External/old clients on`/v1`, `/v2` | Works through Next rewrite (extra hop through Node) | Direct to API (best for third-party / mobile apps)                 |
| Best for                                | Simplest ops, smallest surface                      | Long-lived multi-version API with external consumers               |

Both topologies use the **same code**. The only difference is compose `ports` and nginx config.
Both ports are bound to `127.0.0.1`, so only nginx can reach them.

---

## 3. Code changes (same for both topologies)

### 3.1 API

- [ ] `apps/api/src/config/env.validation.ts`: add

  ```ts
  API_DEFAULT_VERSION: z.string().regex(/^\d+$/),
  ```
- [ ] `apps/api/src/main.ts`: replace the hardcoded default (move `configService` above this block)

  ```ts
  const configService = app.get(ConfigService);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.getOrThrow<string>("API_DEFAULT_VERSION"),
  });
  ```
- [ ] `apps/api/src/main.ts`: needed behind nginx, for correct client IP and protocol

  ```ts
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  ```
- [ ] `apps/api/src/modules/auth/auth.controller.ts`: make Google routes version-neutral

  ```ts
  import { Controller, Get, Req, Res, UseGuards, Version, VERSION_NEUTRAL } from '@nestjs/common';

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) { /* unchanged */ }
  ```
- [ ] Remove the `|| 'http://localhost:3000'` fallback in `googleAuthRedirect`; use
  `ConfigService.getOrThrow('CORS_ORIGIN')` (the schema already requires it).
- [ ] Policy for future versions: new/changed endpoints use `@Version('2')` next to the old handler.
  Never edit v1 behaviour. Deprecate v1 with `Deprecation` / `Sunset` response headers before removal.

### 3.2 Web

- [ ] `pnpm --filter web add server-only`
- [ ] **New** `apps/web/src/lib/config.ts`

  ```ts
  import "server-only";

  function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing required environment variable: ${name}`);
    return v;
  }

  export function getServerApiUrl(version?: string): string {
    const origin = required("INTERNAL_API_ORIGIN").replace(/\/+$/, "");
    const supported = required("API_SUPPORTED_VERSIONS").split(",").map((s) => s.trim());
    const v = version ?? required("API_DEFAULT_VERSION");
    if (!supported.includes(v)) throw new Error(`Unsupported API version: ${v}`);
    return `${origin}/v${v}`;
  }
  ```
- [ ] `apps/web/src/lib/api/server.ts`: remove the `API_URL` constant and use the internal URL with an optional version

  ```ts
  import { getServerApiUrl } from "@/lib/config";

  async request<T>(endpoint: string, options: RequestInit & { version?: string } = {}): Promise<T> {
    const { version, ...init } = options;
    // ...headers as before, built from `init`...
    const response = await fetch(`${getServerApiUrl(version)}${endpoint}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    // ...
  }
  ```
- [ ] `apps/web/src/lib/api/client.ts` (browser): version travels as a header, so no build-time env is needed in the browser

  ```ts
  async request<T>(endpoint: string, options: RequestInit & { version?: string } = {}): Promise<T> {
    const { version, ...init } = options;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(version ? { "x-api-version": version } : {}),
      ...((init.headers as Record<string, string>) || {}),
    };
    const response = await fetch(url, { ...init, headers });
    // ...
  }
  ```
- [ ] `apps/web/src/app/api/proxy/[...path]/route.ts`: remove the `API_URL` constant

  ```ts
  import { getServerApiUrl } from "@/lib/config";

  const version = request.headers.get("x-api-version") ?? undefined;
  const targetUrl = `${getServerApiUrl(version)}${targetPath}${search}`;
  // also add "x-api-version" to the list of headers NOT forwarded
  ```
- [ ] `apps/web/src/app/login/page.tsx`: no env var and no version needed in the browser

  ```tsx
  window.location.href = "/auth/google";
  ```
- [ ] `apps/web/src/app/actions/auth.ts` and `apps/web/src/app/login/success/route.ts`:
  `secure: process.env.NODE_ENV === "production"` (drop the `includes("localhost")` check).
- [ ] `apps/web/next.config.ts`

  ```ts
  import type { NextConfig } from "next";

  function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing build env: ${name}`);
    return v;
  }

  const nextConfig: NextConfig = {
    output: "standalone",
    async rewrites() {
      const origin = required("INTERNAL_API_ORIGIN").replace(/\/+$/, "");
      return [
        // Google OAuth start + callback (version-neutral). Needed in BOTH topologies.
        { source: "/auth/google/:path*", destination: `${origin}/auth/google/:path*` },

        // Topology A only: expose every API version on the web port for external clients.
        // Version is captured from the URL, so nothing is hardcoded.
        { source: "/v:version(\\d+)/:path*", destination: `${origin}/v:version/:path*` },
      ];
    },
  };

  export default nextConfig;
  ```

  In topology B nginx matches `/v{n}/` first, so the second rewrite is simply never hit (harmless).
  Before merging, confirm there is no existing web route at `/auth/*` or `/v<number>/*` (none found today).
- [ ] `apps/web/Dockerfile` (builder stage, before `pnpm --filter web build`), because rewrites are evaluated at build time

  ```dockerfile
  ARG INTERNAL_API_ORIGIN
  ENV INTERNAL_API_ORIGIN=$INTERNAL_API_ORIGIN
  ```
- [ ] Remove `NEXT_PUBLIC_API_URL` from `.env.example`, `apps/web/.env.example`, compose and `DEPLOY.md`.
  `NEXT_PUBLIC_PROJECT_NAME` is still read at build time; pass it as a build arg the same way if it is used in client code.

---

## 4. Environment variables

`.env` on the server (names only; do not commit values):

```
# versions
API_DEFAULT_VERSION=1
API_SUPPORTED_VERSIONS=1            # later: 1,2

# web -> api (docker network, never public)
INTERNAL_API_ORIGIN=http://api:3001

# public URLs (replace with the real domain)
CORS_ORIGIN=https://blood.example.com
GOOGLE_CALLBACK_URL=https://blood.example.com/auth/google/callback

# unchanged
POSTGRES_* REDIS_PASSWORD JWT_* GOOGLE_CLIENT_* VAPID_* PROJECT_NAME
```

| Variable                      | api |  web (build)  | web (runtime) |
| ----------------------------- | :-: | :-----------: | :-----------: |
| `API_DEFAULT_VERSION`       | yes |              |      yes      |
| `API_SUPPORTED_VERSIONS`    |    |              |      yes      |
| `INTERNAL_API_ORIGIN`       |    | **yes** |      yes      |
| `CORS_ORIGIN`, `GOOGLE_*` | yes |              |              |

Google Cloud Console: authorized redirect URI = `https://blood.example.com/auth/google/callback`.

---

## 5. Topology A: ONE port

### 5.1 `docker-compose.prod.yml`

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-blood_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD:-redispassword}
    volumes:
      - redis_data:/data
    networks: [backend]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:                                   # NO published ports
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3001
      - API_DEFAULT_VERSION=${API_DEFAULT_VERSION}
      - DATABASE_URL=postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-blood_db}
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redispassword}@redis:6379
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_ACCESS_EXPIRES_IN=${JWT_ACCESS_EXPIRES_IN:-15m}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_REFRESH_EXPIRES_IN=${JWT_REFRESH_EXPIRES_IN:-30d}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
    networks: [backend, frontend]
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        INTERNAL_API_ORIGIN: ${INTERNAL_API_ORIGIN}
        NEXT_PUBLIC_PROJECT_NAME: ${PROJECT_NAME:-Blood Aid}
    restart: always
    environment:
      - NODE_ENV=production
      - HOSTNAME=0.0.0.0
      - INTERNAL_API_ORIGIN=${INTERNAL_API_ORIGIN}
      - API_DEFAULT_VERSION=${API_DEFAULT_VERSION}
      - API_SUPPORTED_VERSIONS=${API_SUPPORTED_VERSIONS}
    ports:
      - "127.0.0.1:3000:3000"            # the ONLY published port, loopback only
    networks: [frontend]
    depends_on: [api]

volumes:
  postgres_data:
  redis_data:

networks:
  backend:
    internal: true
  frontend:
```

### 5.2 nginx

```nginx
server {
    listen 80;
    server_name blood.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blood.example.com;
    # ssl_certificate     /etc/letsencrypt/live/blood.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/blood.example.com/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
}
```

Request flow:

```
Browser/app -> nginx:443 -> web:3000 -+- pages, /api/proxy/*          (handled by Next)
                                      +- /auth/google*, /v{n}/*       (Next rewrite -> api:3001)
```

---

## 6. Topology B: TWO ports

Same compose file as A, with **only these differences**:

```yaml
  api:
    ports:
      - "127.0.0.1:3001:3001"            # second published port, loopback only
```

(`web` keeps `127.0.0.1:3000:3000`.) Everything else is identical.

Why use it: the web app stays on `API_DEFAULT_VERSION=1`, while `/v1`, `/v2`, ... stay directly reachable
by older mobile apps / partners without going through Node/Next. Retiring or adding a version never touches the web container.

### 6.1 nginx

```nginx
upstream blood_web { server 127.0.0.1:3000; keepalive 16; }
upstream blood_api { server 127.0.0.1:3001; keepalive 16; }

server {
    listen 80;
    server_name blood.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name blood.example.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    client_max_body_size 10m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Connection        "";

    # Public, versioned API (any number of versions). Regex means no hardcoded version.
    location ~ ^/v[0-9]+/ {
        proxy_pass http://blood_api;
    }

    # Google OAuth (version-neutral)
    location /auth/google {
        proxy_pass http://blood_api;
    }

    # Swagger. Prefer restricting this (allow <office-ip>; deny all;) or dropping it in production.
    location /api/docs {
        proxy_pass http://blood_api;
    }

    # Everything else: Next.js (pages, /api/proxy/*, /api/auth/logout, ...)
    location / {
        proxy_pass http://blood_web;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Request flow:

```
Browser (web app) -> nginx -> web:3000 -> /api/proxy/* -> api:3001/v{DEFAULT}/...   (docker network)
Old mobile app    -> nginx -> api:3001/v1/...                                       (direct)
New partner app   -> nginx -> api:3001/v2/...                                       (direct)
Google OAuth      -> nginx -> api:3001/auth/google[/callback]
```

Note: in topology B, `/api/docs` is routed to the API, while `/api/proxy/*` and `/api/auth/logout` stay with Next
because the nginx `location /api/docs` prefix is more specific than `/`.

---

## 7. Will this break client-side fetch?

No.

- Browser fetches use relative `/api/proxy/*` (same origin) and are unchanged.
- The Google login now goes to the relative `/auth/google` instead of an absolute env URL.
- Cookies stay on the web origin. Nothing is cross-origin, so CORS and cookie settings are unaffected.
- Needed in both topologies: nginx must forward `Host` and `X-Forwarded-Proto`
  (`login/success/route.ts` builds its redirect with `new URL(path, request.url)`), and the web container needs `HOSTNAME=0.0.0.0`.

---

## 8. Rollout / deployment checklist

1. [ ] Implement section 3 on a branch (API + web), `pnpm --filter api build` and `pnpm --filter web build`.
2. [ ] Add env vars from section 4 to the server `.env`; delete `NEXT_PUBLIC_API_URL`.
3. [ ] Update the Google OAuth redirect URI to `https://<domain>/auth/google/callback`.
4. [ ] Replace `docker-compose.prod.yml` (remove the `caddy` service and the `caddy_*` volumes; drop the obsolete `version:` key).
5. [ ] Install the nginx config (A or B), then `nginx -t && systemctl reload nginx`.
6. [ ] `docker compose -f docker-compose.prod.yml up -d --build`.
7. [ ] Smoke tests (replace the domain):
    - `curl -I https://<domain>/` returns 200
    - `curl -i https://<domain>/v1/health` (or any public route) returns the API response (A: via Next rewrite, B: direct)
    - `curl -I https://<domain>/auth/google` returns 302 to `accounts.google.com`
    - Log in with Google, then confirm the `access_token` cookie is set with `Secure; HttpOnly`
    - Browser devtools: all data calls go to `/api/proxy/...`, none to another origin
    - `ss -ltnp` on the host: only `127.0.0.1:3000` (and `:3001` in B) are listening for containers, and nothing else is published
8. [ ] Update docs: `DEPLOY.md` (env + callback URL), `LOCAL_DEV.md` (local `.env` needs the new vars), `Project_plan.md`.

### Adding `v2` later (no web redeploy needed unless web should switch)

1. Add `@Version('2')` handlers in the API and deploy the API.
2. Set `API_SUPPORTED_VERSIONS=1,2` on web (runtime env, restart only).
3. Web stays on `API_DEFAULT_VERSION=1` until we choose to move. Single calls can opt in with `{ version: "2" }`.
4. Old clients keep calling `/v1/...` unchanged. Retire v1 only after a `Sunset` period.

---

## 9. Open questions for review

- [ ] A or B in production? (Recommendation: **B** if external/mobile clients on older versions are expected, otherwise **A**.)
- [ ] Should Swagger (`/api/docs`) be public in production?
- [ ] Do we need per-version Swagger docs (`/api/docs/v1`, `/api/docs/v2`)?
- [ ] `Sunset` policy: how long do we keep an old version alive?
- [ ] Local dev: keep a `.env.example` with `INTERNAL_API_ORIGIN=http://localhost:3001`, `API_DEFAULT_VERSION=1`, `API_SUPPORTED_VERSIONS=1`.
