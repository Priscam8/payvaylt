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
- `POST /api/pos/orders`
- `POST /api/pos/orders/:orderId/send-to-bank`
- `POST /api/pos/orders/:orderId/payment-outcome`
- `POST /api/pos/orders/:orderId/cancel`
