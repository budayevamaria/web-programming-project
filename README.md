<<<<<<< HEAD
# HomeSync Premium checkout (standalone)

A separate payment app: no login, no signup. The customer enters a name and email, pays with Halyk ePay, and gets a receipt with an activation code.

Stack: React (Vite) · Node.js + Express · MongoDB · Halyk ePay.

```
frontend/   React pages: Plans + checkout ( / ) and Receipt ( /result )
backend/    Express API, Halyk ePay integration, MongoDB model
  mock/     Built-in Halyk simulator (no credentials, works offline)
  test/     End-to-end tests of the Halyk flow (npm test)
Dockerfile, docker-compose.yml   One-command run
```

## Run with Docker (easiest)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Open http://localhost:4000, click **Upgrade to Premium**, enter any name and email, then **Pay** on the simulator page.
You land on the receipt with an activation code. **Decline** shows the failed flow.

## Run for development

Requirements: Node 20.12+ and MongoDB (for example `docker run -d -p 27017:27017 mongo:7`).

```bash
cp backend/.env.example backend/.env
cd backend && npm install && npm run dev      # API on :4000 (and the simulator on :4100)
cd frontend && npm install && npm run dev     # pages on http://localhost:5173
```

`cd backend && npm test` checks the whole Halyk flow against the simulator (no database needed).

## Use the real Halyk ePay test environment

In `backend/.env`:

```
HALYK_ENV=test
HALYK_CLIENT_ID=test
HALYK_CLIENT_SECRET=...        # from Halyk's test data
HALYK_TERMINAL=...             # from Halyk's test data
HALYK_POSTLINK_SECRET=a-long-random-string
PUBLIC_API_URL=https://your-public-address   # Halyk must reach this (ngrok http 4000 works)
FRONTEND_URL=https://your-public-address     # same address when using docker / production build
```

Test data is in the Halyk ePay docs (https://epayment.kz/en-US/docs) or from Halyk support.
No real money moves in the test environment. For real payments use `HALYK_ENV=prod` with production credentials and HTTPS.

## How a payment works

1. `POST /api/orders` stores an order (name, email, amount from the server) with a unique 12-digit order number and an unguessable public id, then asks Halyk for a token tied to that order and amount.
2. The page loads Halyk's `payment-api.js` and calls `halyk.pay(paymentObject)`. The customer pays on Halyk's page, so card data never touches this app.
3. Halyk redirects to `/result?order=<publicId>` and posts a notification to `postLink`.
4. The server never trusts the redirect or the notification. It asks Halyk's Transaction status API, and only `resultCode 100` + `CHARGE` + the same amount marks the order paid, creates the activation code and sets the 30-day validity. The update is atomic and safe to repeat.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/plans | plans, price, Halyk mode |
| POST | /api/orders | `{name,email}` → `{publicId, widgetUrl, paymentObject}` |
| GET | /api/orders/:publicId | verifies with Halyk, returns status and receipt (code only when paid) |
| GET | /api/activation/:code | `{valid, plan, validUntil}` so the main app can check a code |
| POST | /api/halyk/postlink?s=SECRET | Halyk notification (public, secret in the URL) |
| GET | /api/health | health check |

## Notes

- Price (`PREMIUM_PRICE_KZT=2990`) is a placeholder. Set your real one.
- No email is sent. The receipt page and the activation code are the proof of payment. Add an email service if you want receipts by mail.
- The token request is sent as URL-encoded form data. Halyk's docs say form-data; if their endpoint rejects it, change `requestToken` in `backend/src/services/halyk.js`.
- The simulator copies Halyk's documented flow, not the bank itself. Do one pass in the real test environment before going live.
=======

# HomeSync

### A Digital Platform for Managing and Analyzing Family Responsibilities

## Description
HomeSync is a mobile and web platform designed to help families organize household responsibilities, track completed tasks, and analyze workload distribution.

The system considers both physical household tasks and mental load, including planning, remembering, and coordinating activities.

## Team
- Budayeva Mariya - Team Lead, Backend
- Tursungali Diara - ML/AI, DevOps-QA
- Lyubeznova Nika - Frontend


## Technology Stack
- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Machine Learning: Python, scikit-learn
- AI: OpenAI API
>>>>>>> 515fe879cc74dc40c478167a9d8cf8f95635db7e
