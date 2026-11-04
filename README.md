# BYOC

BYOC is a React storefront with a Vite development server and an Express API backed by MongoDB.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and configure `MONGODB_URI` and a long random `ADMIN_API_TOKEN`. Keep `.env` private; it is ignored by Git. Generate a token with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Load the catalogue and initialize size-level inventory. New size counts start at zero; this command preserves existing stock:

   ```sh
   npm run seed
   ```

4. Start the API and storefront together:

   ```sh
   npm run dev
   ```

   Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## API

- `GET /api/health/live` — process liveness
- `GET /api/health` — database readiness and notification/staff configuration state
- `GET /api/products` — MongoDB-backed product catalogue and size-level available stock
- `POST /api/orders` — reserve available stock and save a pending cash-on-delivery order
- `POST /api/newsletter` — save a newsletter subscription
- `POST /api/contact` — validate and save a customer message
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — password-based customer accounts with httpOnly sessions
- `/api/account/*` — authenticated profile, addresses, wishlist, and order history
- `/api/admin/*` — protected order and inventory management; send `Authorization: Bearer <ADMIN_API_TOKEN>`

During development the Vite server proxies `/api` to the API port from `.env` (`PORT`, default `3000`). If the API runs elsewhere, set `VITE_API_PROXY_TARGET`. The storefront sends every request through one client (`src/lib/api.js`) so JSON headers, errors, and staff authorization behave the same on every page.

Open `#/admin` on the storefront to review orders, confirm/cancel/fulfill them, and set available stock per product and size. Stock counts are sellable units after existing reservations. The token is held only in the current page session. Pending orders reserve stock immediately; cancelling a pending or confirmed order restores it. Fulfilled orders cannot be cancelled through the staff API. Configure HTTPS before using the staff console outside local development.

Checkout remains cash on delivery; online payments are intentionally not enabled. Order and contact notifications support SMTP email and Twilio SMS. Set the SMTP and Twilio variables in `.env` to enable each channel. Missing providers are reported by `/api/health` and checkout/contact responses; failed sends are logged and do not discard saved orders or messages.

Public order, contact, and newsletter endpoints have per-process rate limits and honeypot fields. The limits reset when the server restarts and are not shared across replicas; use a shared rate-limit store (for example Redis) when scaling horizontally. Configure `TRUST_PROXY` to the exact number of trusted reverse-proxy hops when deployed behind a proxy.

## Operations

- **Backups:** install MongoDB Database Tools (`mongodump`), then run `npm run db:backup`. Set `BACKUP_DIR` to a protected persistent directory. Schedule this command with the host's scheduler, copy encrypted archives to separate storage, and regularly test restores with `mongorestore --gzip --archive=<backup-file>`. Local backups are excluded from Git.
- **Retention:** contact messages expire automatically after 365 days via a MongoDB TTL index. Orders are not automatically deleted; retain/archive them according to accounting and privacy requirements that apply to the business. Newsletter subscribers remain until removed; implement an unsubscribe workflow before sending marketing campaigns.
- **Monitoring:** poll `/api/health/live` for process liveness and `/api/health` for MongoDB readiness. Server errors and notification delivery failures are written to process logs; forward and retain those logs in the hosting platform.
- **Deployment:** a provider-neutral Docker image is defined in `Dockerfile`. Provide MongoDB and secrets as runtime environment variables, persist/secure backups separately, expose HTTPS at the hosting edge, and set `TRUST_PROXY` only for known proxy hops. Do not commit credentials or database archives.

## Production

Build the storefront and start the Express server:

```sh
npm run build
npm start
```

The server serves `dist` when it exists and exposes the API on `PORT` (default `3000`).


## Pending orders
Pending orders reserve stock and expire after PENDING_ORDER_TTL_HOURS (72 by default). Unconfirmed orders are cancelled automatically, stock is released, and customers see the deadline at checkout, in tracking, and in notification text.
