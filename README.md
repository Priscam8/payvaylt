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

## Optional backend

The repository still includes the earlier Express scaffold in `backend/`. It is useful as a future starting point for merchant, customer, and checkout services, but the current investor POS demo is front-end driven and does not yet depend on a live bank or WhatsApp integration.

If you want to run that scaffold locally:

```bash
npm run backend
```

For auto-reload while you work:

```bash
npm run backend:dev
```

The backend serves on `http://localhost:4000` by default and exposes a versioned API under `http://localhost:4000/api`.
