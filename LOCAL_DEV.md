# Local Development & Testing Guide

## 1. Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [pnpm](https://pnpm.io/installation) (v8 or higher)
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose (for running the PostgreSQL + PostGIS database and Redis cache)

## 2. Setting Up Environment Variables

Run the following command (or manually copy the files) to set up your `.env` files from the examples:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

*Note: For local development, the default placeholder values in the examples will work fine until you need real Google OAuth.*

## 3. Start the Database and Cache Services

To run the PostgreSQL and Redis containers locally:

```bash
docker compose up -d postgres redis
```

*To verify they are running: `docker ps`*

## 4. Install Dependencies

Install all monorepo dependencies (you may need `--ignore-scripts` if build scripts fail):

```bash
pnpm install
# OR if you face ERR_PNPM_IGNORED_BUILDS:
pnpm install --ignore-scripts
```

## 5. Run Database Migrations and Seed

Once the DB is up and packages are installed, apply the migrations and insert test data:

```bash
pnpm --filter api migration:run
pnpm --filter api seed
```

## 6. Running the Applications Locally

You can start the backend and frontend simultaneously from the root, or separately.

**To run the API (Backend):**
```bash
pnpm --filter api start:dev
```
*API will run on `http://localhost:3001/v1` and Swagger UI at `http://localhost:3001/api/docs`*

**To run the Web (Frontend):**
```bash
pnpm --filter web dev
```
*Web will run on `http://localhost:3000`*

## 7. Running Tests

We have added unit tests and End-to-End (E2E) tests in the `apps/api` package.

**Run Unit Tests:**
```bash
pnpm --filter api test
```

**Run End-to-End (E2E) Tests:**
*Note: Make sure your `.env` is loaded and the local test database is accessible if real modules are bootstrapped.*
```bash
pnpm --filter api run test:e2e
```

**Run Tests in Watch Mode (for active development):**
```bash
pnpm --filter api test:watch
```

