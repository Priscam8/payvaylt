# PayVaylt Deployment Guide

This guide turns the local MVP into a deployable PayVaylt stack. The code is ready to accept real service credentials, but you still need to create the external accounts and secrets before the app can go fully live.

## 1. Production Services You Need

- Hosted Postgres database for customer, merchant, FICA, voucher, lay-by, payment-session, and notice records.
- S3-compatible object storage for uploaded FICA documents. AWS S3, Cloudflare R2, MinIO, or another S3-compatible provider can work.
- Twilio SMS credentials for real OTP delivery.
- Stripe credentials and webhook secret for checkout payment sessions.
- A deployed backend URL, for example `https://api.payvaylt.co.za/api`.
- Expo Application Services access for Android and iOS builds.

## 2. Required Backend Environment Variables

Set these on your backend host:

```bash
NODE_ENV=production
PAYVAYLT_PORT=4000
PAYVAYLT_DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/payvaylt
PAYVAYLT_DATABASE_SSL=require
PAYVAYLT_DATABASE_POOL_MAX=10

PAYVAYLT_DOCUMENT_STORAGE=s3
PAYVAYLT_MAX_UPLOAD_BYTES=10485760
PAYVAYLT_S3_BUCKET=payvaylt-fica-documents
PAYVAYLT_S3_REGION=af-south-1
PAYVAYLT_S3_ENDPOINT=
PAYVAYLT_S3_FORCE_PATH_STYLE=false
PAYVAYLT_S3_ACCESS_KEY_ID=replace_me
PAYVAYLT_S3_SECRET_ACCESS_KEY=replace_me

PAYVAYLT_ALLOW_DEV_CODES=false
PAYVAYLT_OTP_PROVIDER=twilio
PAYVAYLT_TWILIO_ACCOUNT_SID=replace_me
PAYVAYLT_TWILIO_AUTH_TOKEN=replace_me
PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID=replace_me

PAYVAYLT_PAYMENT_PROVIDER=stripe
PAYVAYLT_STRIPE_SECRET_KEY=sk_live_replace_me
PAYVAYLT_STRIPE_WEBHOOK_SECRET=whsec_replace_me
PAYVAYLT_STRIPE_SUCCESS_URL=https://payvaylt.co.za/payment-success
PAYVAYLT_STRIPE_CANCEL_URL=https://payvaylt.co.za/payment-cancelled
```

If you use Cloudflare R2 or MinIO, set `PAYVAYLT_S3_ENDPOINT` and usually set `PAYVAYLT_S3_FORCE_PATH_STYLE=true`.

## 3. Check Production Readiness

After setting your environment variables, run:

```bash
npm run backend:check-production
```

This fails loudly if Postgres, S3 storage, Twilio, Stripe, or production security settings are missing.

## 4. Deploy The Backend

Any Docker-capable host can run the backend from the included `Dockerfile`.

Recommended backend deploy flow:

```bash
npm install
npm run backend:check-production
npm run backend:db:migrate
npm run backend
```

The backend initializes migrations automatically on startup, but running `npm run backend:db:migrate` during deployment makes database issues easier to catch before traffic reaches the app.

Production health endpoint:

```bash
curl https://YOUR_BACKEND_DOMAIN/api/health
```

Expected fields include `databaseMode`, `documentStorage`, `otpProvider`, and `paymentProvider`.

## 5. Configure Stripe Webhook

In Stripe, create a webhook endpoint that points to:

```text
https://YOUR_BACKEND_DOMAIN/api/payments/stripe/webhook
```

Subscribe to:

```text
checkout.session.completed
```

Copy the signing secret into `PAYVAYLT_STRIPE_WEBHOOK_SECRET`.

## 6. Build The Mobile App

Update `eas.json` so `EXPO_PUBLIC_PAYVAYLT_API_URL` points to your deployed backend:

```json
"EXPO_PUBLIC_PAYVAYLT_API_URL": "https://YOUR_BACKEND_DOMAIN/api"
```

Preview Android build:

```bash
npx eas build --profile preview --platform android
```

Production Android build:

```bash
npx eas build --profile production --platform android
```

Production iOS build:

```bash
npx eas build --profile production --platform ios
```

When builds are ready, submit them through the Expo dashboard or with:

```bash
npx eas submit --profile production --platform android
npx eas submit --profile production --platform ios
```

## 7. Final Go-Live Checklist

- `GET /api/health` shows `databaseMode=postgres`, `documentStorage=s3`, `otpProvider=twilio`, and `paymentProvider=stripe`.
- OTP messages arrive on a real phone number.
- A FICA PDF or image uploads and appears in object storage.
- Stripe checkout opens, succeeds, and the webhook marks the payment session as paid.
- The checkout demo completes and creates a completed lay-by plan.
- `EXPO_PUBLIC_PAYVAYLT_API_URL` in EAS builds points to the production backend, not localhost.
- `PAYVAYLT_ALLOW_DEV_CODES` is disabled in production.
