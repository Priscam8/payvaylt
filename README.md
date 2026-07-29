# PayVaylt

PayVaylt is a digital lay-by platform designed to help customers secure items they cannot afford immediately and pay toward them at a pace that matches their own income rhythm.

The concept is built around one promise: `work towards the goal`.

Customers can:

- secure a cart or item from a partner merchant
- choose their own deposit amount
- choose a payment cadence that fits their budget
- choose a completion term up to 12 months
- use store-specific vouchers as part of payment
- receive merchant notifications if a reserved item is discontinued

This repository contains an Expo + React Native product scaffold for that experience, plus a Postgres-ready backend for customer, merchant, verification, voucher, lay-by, and checkout flows.

## What the app now covers

- branded welcome/onboarding screen as the first entry into the app
- customer sign in, create account, forgot password, and merchant sign-in entry states
- `OTP Verification` and `Reset Password` stack routes wired into the shared auth prototype
- dedicated `FICA Upload` screen as the next step after account creation, with real file uploads for supported document types
- `Dashboard` tab for the customer journey, support feed, and live plan summaries
- `Plans` tab for flexible lay-by setup, repayment pacing, and exception handling
- `Stores` tab for vendor partnerships, checkout integrations, and voucher balances
- `Account` tab for registration, OTP, FICA, verification questions, Home Affairs-style checks, and sign-out
- `Checkout Demo` stack route for a full journey from merchant redirect to payment-session creation, confirmation, and release
- `Blueprint` modal describing the current product scope and next implementation steps
- persistent local MVP state using device storage for accounts, sessions, lay-by plans, vouchers, notices, uploaded documents, and checkout outcomes

Brand copy and static product content live in [`constants/payvaylt-data.ts`](./constants/payvaylt-data.ts). The app state now runs through [`components/auth-provider.tsx`](./components/auth-provider.tsx), which caches locally but uses the backend API for sign-in, OTP, password reset, FICA, Home Affairs matching, merchant sign-in, and checkout completion. Shared mobile/domain types still live in [`lib/payvaylt-mvp.ts`](./lib/payvaylt-mvp.ts).

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Express
- Zod
- PostgreSQL-compatible SQL backend
- `pg-mem` in-memory Postgres fallback for local demo use

## One-click open

On macOS, double-click [Open PayVaylt.command](./Open%20PayVaylt.command).

That launcher will:

- create `.env` from `.env.example` if it does not exist yet
- install dependencies on the first run
- start the PayVaylt backend in demo mode with the in-memory database, console OTP, and mock payments
- start the web app on `http://127.0.0.1:8081`
- open the app in your browser automatically

To stop the local app again, double-click [Stop PayVaylt.command](./Stop%20PayVaylt.command).

If you prefer the terminal, the same flow is available with:

```bash
npm run app:open
npm run app:stop
```

Runtime logs are written to `.payvaylt-runtime/backend.log` and `.payvaylt-runtime/web.log`.

## Run locally

```bash
npm install
cp .env.example .env
npm run backend
npm run web
```

## Use Postgres locally

If you want a persistent local database instead of the in-memory demo database:

```bash
npm run backend:db:start
npm run backend:db:migrate
npm run backend
```

When you are done:

```bash
npm run backend:db:stop
```

The included [`docker-compose.yml`](./docker-compose.yml) starts a local Postgres 16 instance for PayVaylt.

## Run on mobile

The Expo app already supports iOS and Android. For a phone-friendly development session:

```bash
npm run mobile
```

If `EXPO_PUBLIC_PAYVAYLT_API_URL` is set to a localhost-style URL, the app now rewrites that host on native devices so Expo Go and simulators can still reach your backend during development.

## Run the backend separately

Start the PayVaylt development API in a separate terminal:

```bash
npm run backend
```

For auto-reload while you work:

```bash
npm run backend:dev
```

To initialize or re-run the database bootstrap and migrations explicitly:

```bash
npm run backend:db:migrate
```

The backend serves on `http://localhost:4000` by default and exposes a versioned API under `http://localhost:4000/api`.

## Environment configuration

PayVaylt ships with a ready-to-edit [`.env.example`](./.env.example). Copy it to `.env` and adjust the values for your environment.

- `EXPO_PUBLIC_PAYVAYLT_API_URL` points the Expo app to the backend API.
- `PAYVAYLT_DATABASE_URL` switches the backend from in-memory `pg-mem` to a real Postgres database.
- `PAYVAYLT_DOCUMENT_STORAGE` can be `local` for development or `s3` for production uploads.
- `PAYVAYLT_UPLOADS_DIR` controls where uploaded FICA documents are stored on disk during local development.
- `PAYVAYLT_S3_*` variables connect production FICA uploads to S3-compatible object storage.
- `PAYVAYLT_OTP_PROVIDER` supports `console` for local development and `twilio` for real OTP delivery.
- `PAYVAYLT_PAYMENT_PROVIDER` supports `mock` for local development and `stripe` for hosted checkout.
- `PAYVAYLT_ALLOW_DEV_CODES=true` keeps the OTP code visible in development responses when using the console provider.

Before deploying, run:

```bash
npm run backend:check-production
```

This checks that Postgres, S3 document storage, Twilio OTP, Stripe payments, and production security values are configured.

### Useful endpoints

- `GET /api/health`
- `GET /api/catalog/bootstrap`
- `GET /api/vendors`
- `GET /api/vendors/:vendorSlug/catalog`
- `POST /api/vendors/:vendorSlug/reservations`
- `POST /api/vendors/:vendorSlug/vouchers/sync`
- `POST /api/auth/customers/register`
- `POST /api/auth/customers/sign-in`
- `POST /api/auth/customers/verify-otp`
- `POST /api/auth/customers/request-password-reset`
- `POST /api/auth/customers/reset-password`
- `POST /api/auth/merchants/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/sessions/me`
- `GET /api/customers/:customerId/dashboard`
- `PATCH /api/customers/:customerId/fica-documents`
- `GET /api/customers/:customerId/document-uploads/:documentId/download`
- `POST /api/checkout/payment-session`
- `POST /api/payment-sessions/:paymentSessionId/confirm`
- `POST /api/checkout/complete`
- `POST /api/payments/stripe/webhook`
- `GET /api/merchants/:merchantId/workspace`

### Backend notes

- SQL schema lives in [`backend/migrations/001_init.sql`](./backend/migrations/001_init.sql).
- production-readiness additions for document uploads and payment sessions live in [`backend/migrations/002_customer_documents_and_payment_sessions.sql`](./backend/migrations/002_customer_documents_and_payment_sessions.sql).
- vendor integration tables live in [`backend/migrations/003_vendor_integrations.sql`](./backend/migrations/003_vendor_integrations.sql).
- If `PAYVAYLT_DATABASE_URL` is set, the backend uses your real Postgres database.
- If `PAYVAYLT_DATABASE_URL` is not set, the backend uses an in-memory Postgres instance via `pg-mem` so local demo work still runs.
- Expo can point to the backend with `EXPO_PUBLIC_PAYVAYLT_API_URL=http://localhost:4000/api`.
- [`backend/repository.js`](./backend/repository.js) is the database-backed repository layer used by the API routes.
- vendor adapter packages live in [`packages/vendor-integrations`](./packages/vendor-integrations).
- customer document uploads are stored via [`backend/providers/document-storage.js`](./backend/providers/document-storage.js).
- OTP delivery is abstracted in [`backend/providers/otp-provider.js`](./backend/providers/otp-provider.js).
- payment-session creation and confirmation are abstracted in [`backend/providers/payment-provider.js`](./backend/providers/payment-provider.js).
- `components/auth-provider.tsx` syncs the main app flows against the backend and stores the latest workspace state locally for quick reloads.
- `PATCH /api/customers/:customerId/fica-documents` is the stable customer mutation route. Plain boolean payloads update FICA flags directly, while action payloads are sent via `documents.__action` for document upload, verification questions, Home Affairs completion, voucher purchase, and lay-by creation.

## Deployment scaffolding

- [Dockerfile](./Dockerfile) and [docker-compose.yml](./docker-compose.yml) scaffold backend container deployment.
- [eas.json](./eas.json) scaffolds Expo Application Services builds for mobile distribution.
- [docs/deployment.md](./docs/deployment.md) has the deployment checklist, production environment variables, Stripe webhook path, and EAS build commands.
- To go fully live, you still need real secrets and hosted infrastructure for Postgres, OTP delivery, payments, and file storage.

## Recommended next implementation steps

- provision a hosted Postgres database and set `PAYVAYLT_DATABASE_URL` in the production environment
- replace local-disk uploads with cloud object storage plus signed download URLs
- configure Twilio credentials for OTP delivery and disable dev codes in production
- configure Stripe credentials, webhook secret, and hosted success/cancel URLs
- connect real FICA, Home Affairs, and fraud/risk verification services
- build merchant-facing APIs or plugins for checkout redirect, cart reservation, and discontinued-item handling
- add automated tests, monitoring, analytics, and CI/CD for backend and mobile builds
