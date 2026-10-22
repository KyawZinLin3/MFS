# MFS Operations Portal and Customer PWA

A Docker-ready MFS workspace with a React + TypeScript internal operations portal, a separate customer-facing mobile PWA, and a Fastify + TypeScript API backed by PostgreSQL and private S3-compatible object storage.

## Run locally with Docker

1. Copy `.env.example` to `.env` and change the local passwords/secrets if needed.
2. From the repository root run:

   ```sh
   docker compose up --build
   ```

3. Open the staff portal at [http://localhost:8080](http://localhost:8080) or the separate customer PWA at [http://localhost:8081](http://localhost:8081).

The API applies Prisma migrations at startup. Demo data is only loaded when `SEED_DEMO_DATA=true`; `.env.example` enables it for local development. `S3_PUBLIC_ENDPOINT` must be reachable from staff browsers for direct photo and document uploads; the local Compose default is `http://localhost:9000`. Other local services:

| Service | Address | Local login |
| --- | --- | --- |
| API health | http://localhost:4000/health | — |
| Object storage | `http://object-storage:9000` inside the Compose network | — |
| Customer PWA | http://localhost:8081 (override with `CLIENT_PWA_PORT`) | â€” |
| Grafana | http://localhost:3001 (override with `GRAFANA_PORT`) | `admin` / `admin` |
| Loki | http://localhost:3100 | — |

With the `.env.example` settings, demo portal login is `admin@mfs.local` / `Welcome123!`. Other seeded accounts are `manager@mfs.local`, `operator@mfs.local`, and `auditor@mfs.local`, all using the same demo password. Seed accounts and fallback Compose secrets are for local development only; set `SEED_DEMO_DATA=false` and replace all secrets before deploying.

Stop the stack with `docker compose down`. Persistent database, object storage, logs, and Grafana data use named Docker volumes. `docker compose down -v` removes those volumes.

## Architecture

The API is a modular monolith organized by feature under `apps/api/src/modules`. Routes delegate persistence to Prisma and shared application policies provide authentication, authorization, and scope enforcement. Modules include auth, dashboard, organization, audit, private file storage, customer KYC and accounts, transfers, and loan applications. The staff portal is under `apps/web`; the separate customer PWA is under `apps/client-pwa`.

The staff portal includes a loan application workflow with customer lookup, resumable drafts, guided application sections, affordability calculations, private applicant photo uploads, and submission for review. Drafts and submitted applications are stored per applicant with company and branch access controls.

JWT bearer tokens expire after 30 minutes. The role model includes platform administrator, company administrator, branch manager, operator, and auditor. Company and branch filters are applied server-side for dashboard, branch, team, audit, transfer, and file access. Private files use short-lived presigned URLs and are limited to PDF, JPG, PNG, and CSV uploads up to 10 MB.

The API writes structured Pino logs to stdout; Promtail collects Docker logs into Loki. OpenTelemetry auto-instrumentation exports API traces to the Collector. Grafana is provisioned with Loki as its default data source.

## Progressive Web App

The customer PWA lives in `apps/client-pwa`, independently from the staff portal in `apps/web`. It includes an installable manifest, icons, an offline app shell, responsive KYC steps, and camera/photo selection for identity documents. Use the browser's install menu to add it to a device; installability requires HTTPS outside local development, where `localhost` is supported. The KYC screens are a frontend preview and do not yet submit or store personal data or upload identity documents. Do not use real customer details until a secure KYC API and private document workflow are connected.


## Local development without Docker

Run PostgreSQL and an S3-compatible service (RustFS is used by the Docker setup) separately, set `DATABASE_URL`, `JWT_SECRET`, `S3_*`, and `WEB_ORIGIN`, then from the root:

```sh
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
npm run dev:client
```

The internal portal Vite server is at `http://localhost:5173`; the customer PWA is at `http://localhost:5174`.
