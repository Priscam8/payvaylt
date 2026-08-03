# PayVaylt Scan-to-Pay POS MVP

This repository now presents an investor-facing Expo MVP for a WhatsApp-enabled scan-to-pay point of sale aimed at small and informal merchants.

The product promise is simple:

- the merchant builds the order
- the platform generates one secure checkout QR
- the customer reviews the order in WhatsApp
- the bank or regulated PSP authenticates the payment
- both sides receive verified confirmation and a digital receipt

## What the app now covers

- investor landing page for the scan-to-pay concept
- `Overview` tab for the business case, core journey, and target sectors
- `Modes` tab for delivery methods, service definitions, and MVP deliverables
- `Checkout` tab with a live merchant basket, dynamic QR, WhatsApp review, and bank approval simulation
- persisted POS order history that survives reloads when the local API is running
- `Readiness` tab for platform boundaries, architecture, and launch stage gates
- `Scan-to-Pay Demo` stack route for the full interactive walkthrough
- `Investor Brief` modal describing what to build first, what to partner next, and what not to promise yet

Current front-end product copy lives in `constants/scan-to-pay-data.ts`, and the main interactive flow lives in `components/scan-to-pay-demo.tsx`.

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- Express
- Zod
- JSON file persistence for the development API

## Run locally

```bash
npm install
npx expo start
```

## POS backend

The Express backend in `backend/` now powers the WhatsApp POS demo with a persisted merchant profile, product catalog, dynamic checkout orders, bank-approval state changes, and recent transaction history. The payment rail is still simulated for investor use, but the order lifecycle is now API-backed instead of living only inside the screen state.

Run it locally with:

```bash
npm run backend
```

For auto-reload while you work:

```bash
npm run backend:dev
```

The backend serves on `http://localhost:4000` by default and exposes a versioned API under `http://localhost:4000/api`.

The POS-specific endpoints are:

- `GET /api/pos/bootstrap`
- `GET /api/pos/orders`
- `GET /api/pos/orders/:orderId`
- `GET /api/pos/orders/:orderId/whatsapp-entry`
- `POST /api/pos/orders`
- `POST /api/pos/orders/:orderId/send-to-bank`
- `POST /api/pos/orders/:orderId/payment-outcome`
- `POST /api/pos/orders/:orderId/cancel`

## WhatsApp Cloud API readiness

The backend now includes the Meta webhook routes needed for a real WhatsApp integration:

- `GET /api/whatsapp/config`
- `GET /api/whatsapp/events`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`

`GET /api/whatsapp/config` is the quickest way to confirm which values belong in the Meta developer form. Once `PAYVAYLT_PUBLIC_BASE_URL` is set, it returns the public callback URL alongside the active verify token.

Example local check:

```bash
curl http://localhost:4000/api/whatsapp/config
```

### Meta production setup values

Use these values on the Meta "Configure Webhooks" step:

- **Callback URL:** `https://your-public-backend.example.com/api/whatsapp/webhook`
- **Verify token:** the value in `PAYVAYLT_WHATSAPP_VERIFY_TOKEN`

Important: Meta cannot verify a localhost callback. GitHub is the right place for the codebase, but you still need a public backend URL from a deployed server or tunnel before Meta can save the webhook.

### Environment variables

Copy `.env.example` and fill in the WhatsApp values you receive from Meta:

- `PAYVAYLT_PUBLIC_BASE_URL`
- `PAYVAYLT_WHATSAPP_VERIFY_TOKEN`
- `PAYVAYLT_WHATSAPP_APP_SECRET`
- `PAYVAYLT_WHATSAPP_APP_ID`
- `PAYVAYLT_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `PAYVAYLT_WHATSAPP_PHONE_NUMBER_ID`
- `PAYVAYLT_WHATSAPP_ACCESS_TOKEN`

If `PAYVAYLT_WHATSAPP_APP_SECRET` is set, the webhook endpoint verifies Meta's `X-Hub-Signature-256` header before accepting inbound events.

### Order review handoff

For each POS order, the backend can now return a WhatsApp-friendly entry payload:

```bash
curl http://localhost:4000/api/pos/orders/ORD-EXAMPLE/whatsapp-entry
```

This response includes:

- a WhatsApp deep link that can be encoded into a checkout QR
- the short prefilled message for the customer
- the order token and current basket details
