# BYOC — Missing functionality roadmap

Plan for closing the gaps in the storefront, API, and staff console.

**Conventions for every item**

- Public endpoints get validation, a honeypot where relevant, and their own rate limit.
- Admin endpoints stay behind `requireAdmin`.
- Update `README.md`, `.env.example`, the admin UI, and add tests in the same PR.
- No secrets in code; never trust totals, prices, or stock sent by the browser.
- Definition of done: tests pass, `npm run lint` passes, `npm run build` passes, docs updated.

**Status:** `[ ]` not started · `[~]` in progress · `[x]` done

## Decisions locked

- **Customer accounts:** in scope.
- **Product reviews:** in scope. Any signed-in user can review; purchases are checked and verified ones get a badge. Staff moderation stays.
- **Discount codes:** **out for now** — no discount model, UI, or checkout field. Keep the order shape ready but do not build it.
- **Online payments:** out of scope — cash on delivery stays the only payment method.
- **Routing:** migrate from hash routing to the History API (`react-router-dom`) in Phase 8.
- **Redis:** in scope. Shared rate-limit store backed by Redis in Phase 9 (required for multi-replica deployments, memory fallback for local dev).
- **Shipping:** configured by staff in the admin console. Global mode is either a fixed amount per order or a percentage of the item subtotal. No free-shipping threshold for now. Each product's override is a **fixed amount per unit**. Applied system-wide.
- **Collections:** every product belongs to exactly one collection. Collections are seeded from the existing product categories (T-Shirts, Hoodies, Pants, Jackets, Accessories). The collection name appears in the **bottom-right corner of each product card**. Staff can create, read, update, and delete collections. Deactivating a collection hides only its collection page; its products stay visible and keep their label.
- **Pending orders:** held for **72 hours**, then cancelled automatically and stock released. Customers must see this notice at checkout, in notifications, on the tracking page, and in the FAQ/shipping copy.
- **Unchanged:** COD only and a single shared staff token for now.

---

## Phase 0 — Baseline before new features

Everything below depends on this. Today there are no tests, no CI, and no config module.

- [x] Add test tooling: `vitest`, `@testing-library/react`, `jsdom`, `supertest`, `mongodb-memory-server`.
- [x] Add scripts in `package.json`: `test`, `test:watch`, `test:coverage`.
- [x] Add `.github/workflows/ci.yml`: install → lint → test → build on Node 22.
- [x] Create `server/config.js`: read and validate env once (`PORT`, `MONGODB_URI`, `ADMIN_API_TOKEN`, `REDIS_URL`, shipping, order TTL, low-stock threshold).
- [x] Add a React error boundary and consistent offline/empty states for catalogue pages.
- [x] Add structured request logging with request IDs (`server/index.js`).
- [x] Add a real not-found page and route (see Phase 8).

**Acceptance:** CI is green on a no-op PR; `npm test` runs and covers at least one API route.

---

## Phase 1 — Cart persistence and resilience (small, high impact)

The bag is lost on refresh (`src/App.jsx:40`). Wishlist persists but cart does not.

- [x] Persist cart to `localStorage` under `byok-cart:v1`; hydrate and sanitize on load.
- [x] Validate each line: known `id`, valid `size`, quantity `1..10`, max 30 lines.
- [x] Revalidate against `/api/products` on mount: drop deleted products/sizes, clamp quantity to available stock, show a dismissible notice.
- [x] Sync across tabs with the `storage` event.
- [x] Re-check stock when opening the drawer and when placing the order (the API already returns `409`).
- [x] Show per-line available stock and disabled/out-of-stock state in `CartDrawer.jsx`.
- [x] Add an explicit "Clear bag" action.

**Files:** `src/App.jsx`, `src/components/CartDrawer.jsx`, `src/components/ProductCard.jsx`.

**Acceptance:** refresh keeps the bag; an item that went out of stock is removed or clamped with a visible message; quantity never exceeds stock.

---

## Phase 2 — Customer order tracking

Today the customer only sees a reference after checkout (`src/components/CartDrawer.jsx:97-112`) and has no way to check status.

**Backend**

- [x] Add `statusHistory: [{ status, at, note }]` to `server/models/Order.js`; append on create and on every transition.
- [x] Add `POST /api/orders/lookup` — body `{ orderId, email }`, rate-limited (5 / 15 min), generic `404` for any mismatch.
- [x] Return only safe fields: status, timeline, items, subtotal/shipping/total, timestamps. Never return full customer record.
- [x] Normalize and compare email case-insensitively.

**Frontend**

- [x] New `TrackOrderPage` at `/order` (form) and `/order/:id` (result), reusing the site header/footer.
- [x] Form fields: order reference + email; prefill from `byok-last-order` saved at checkout.
- [x] Status timeline UI: pending → confirmed → fulfilled, or cancelled with reason.
- [x] Save `{ orderId, email }` on successful checkout and add a "Track order" button on the success screen.
- [x] Link from FAQ and the shipping page; Track Order sits in the navbar for signed-in customers.

**Acceptance:** a customer can see live status without contacting staff; wrong email returns a generic not-found; no enumeration with only an order ID.

---

## Phase 3 — Pending-order expiry (stock safety)

Pending orders reserve stock immediately (`server/routes/api.js:166-211`) and never release it without a manual cancel.

- [x] Add `expiresAt` to `Order` with a **72-hour** default (`PENDING_ORDER_TTL_HOURS`, default `72`) and `cancelReason`.
- [x] Add index `{ status: 1, expiresAt: 1 }`.
- [x] Add `server/jobs/expireOrders.js`: interval every 5 min, `unref()`, also runs once on boot.
- [x] For each expired pending order: atomic `findOneAndUpdate({ _id, status: 'pending' }, { status: 'cancelled', cancelReason: 'expired' })`; only the winner restores inventory and writes `statusHistory`.
- [x] Safe with multiple replicas (no double restore) and idempotent on restart.
- [x] Notify the customer (existing notification service), log a count, stop cleanly on `SIGINT`/`SIGTERM`.
- [x] Admin UI shows an "expires in" countdown and the cancellation reason.
- [x] Return `expiresAt` in the order-creation response so the UI can show the exact deadline.
- [x] **Customer notice of the 72-hour hold:**
  - [x] Cart drawer before "Place order": "Your items are reserved for 72 hours while we confirm."
  - [x] Checkout success screen: "We'll hold your items for 72 hours. If the order is not confirmed, it will be cancelled and the items released."
  - [x] Order lookup/tracking page: show the deadline and a live countdown ("reserved until …").
  - [x] Confirmation email/SMS text includes the deadline.
  - [x] FAQ, shipping page, and `README.md` explain the policy.
- [x] Env: `PENDING_ORDER_TTL_HOURS=72` in `.env.example` + README.
- [x] Tests: reservation → expiry → stock restored once; concurrent workers restore once; 72h boundary.

**Acceptance:** an abandoned pending order releases its stock exactly once after 72 hours, and the customer is told the deadline at every step.

---

## Phase 4 — Configurable shipping and order totals

Order total is currently the item subtotal only (`server/routes/api.js:213-216`), and the shipping page admits no fee is added (`src/components/InfoPage.jsx:56`).

**Data model**

- [x] New `StoreSetting` singleton (`key: 'store'`): `shipping: { mode: 'fixed' | 'percentage', value, currency }`.
  - Validate `fixed` value ≥ 0 and `percentage` 0–100.
  - Create a default row on boot if missing (fixed `0`, `TND`) so checkout never fails before staff configure it.
- [x] `Product.shippingOverride: number | null` — optional **fixed amount per unit**; `null` means "use the global rule". Confirmed behaviour.
- [x] `Order`: add `subtotal`, `shippingFee`, `total`, and a `shippingSnapshot` (`{ mode, value, overrides }`) so historical orders stay accurate after settings change.
- [x] Migration script for existing orders (backfill `subtotal = total`, `shippingFee = 0`) and existing products (`shippingOverride = null`).

**Calculation — one server-only helper (`server/services/shipping.js`)**

- [x] Lines with an override: `override × quantity` (fixed per unit, always charged).
- [x] Lines without: their `unitPrice × quantity` form `globalBase`.
- [x] Global fee: `fixed` → `value` charged once when `globalBase > 0`; `percentage` → `round(globalBase × value / 100)`.
- [x] `shippingFee = globalFee + overrideTotal`; `total = subtotal + shippingFee`.
- [x] Mixed carts: an entirely overridden cart pays no global fee; a mixed cart pays the global fee once plus every override.
- [x] Never accept prices, shipping, or totals from the browser; recompute from the catalogue.

**Admin console**

- [x] Settings section: radio for fixed/percentage, value input (TND or %), currency, and a live example ("100 TND cart → 7 TND shipping"). No free-shipping threshold for now.
- [x] `GET /api/admin/settings/shipping` and `PUT /api/admin/settings/shipping`.
- [x] Validate `shippingOverride` on the server when the Phase 7 product form saves it (optional, TND per unit, blank = global).
- [x] Changing settings does not rewrite existing orders (snapshot protects them).

**Storefront and API**

- [x] Public `GET /api/store-config`: mode, value, currency, COD flag. Cache with a version key, invalidated on save.
- [x] Cart drawer: show per-line override notes, subtotal, shipping, and total (there is no free-shipping state for now). If config fails to load, show "calculated at checkout" and still enforce server-side.
- [x] Admin order card, emails, and SMS show subtotal / shipping / total.
- [x] Shipping and FAQ copy reflect the rule dynamically where practical.
- [x] Tests: fixed, percentage, mixed cart with overrides, zero-item guard, 100% mode, rounding.

**Confirmed:** no free-shipping threshold; the per-product override is a fixed amount per unit and is always charged. If a threshold is added later, the override should still apply.

---

## Phase 5 — Product collections and collection CRUD

Every product belongs to exactly one collection, and the collection is shown in the bottom-right corner of its card.

**Model and migration**

- [x] `Collection`: `slug` (unique), `name`, `description`, optional `image`, `active`, `sortOrder`, timestamps.
- [x] `Product.collectionId` (ObjectId ref `Collection`, required, indexed).
- [x] Roll out in order: add `collectionId` as optional → backfill every product from the mapping → switch to required + indexed.
- [x] Migration/seed: create the initial collections and assign every product; fail the seed if any product has no collection. Mapping decided below.
- [x] Public API returns `collection: { id, slug, name }` with each product; add `GET /api/collections` and a `?collection=slug` filter on `/api/products`.
- [x] Replace the virtual `collectionInfo` rules in `BrowsePage.jsx` and the hard-coded tiles/counts in `CollectionsPage.jsx` / `content.js` with server data. Update the nav menu, which currently points at `new-drop`, `essentials`, and `archive`.
- [x] Collections become the single grouping. Keep `category` temporarily as a deprecated mirror for compatibility, stop reading it in new code, and remove it after the storefront migration.

**Admin**

- [x] `GET/POST/PATCH/DELETE /api/admin/collections`; slug auto-generated but editable; unique validation.
- [x] Block deleting a collection that still has products (`409` with the count) or require `reassignTo`; prefer soft-deactivate when products exist.
- [x] Inventory/product list shows each product's collection; the create/edit form (Phase 7) requires a collection select.
- [x] Deactivating a collection hides it from the collections listing/page; its products remain in the store and keep their collection label. Reactivating restores the page.

**Storefront**

- [x] Product card: show the collection name in the **bottom-right corner** of `.store-card` (styles in `Store.css`) and on the home-page carousel card (`Products.css`). Keep it readable and clear of the wishlist/price on mobile.
- [x] Product detail: show the collection with a link to `#/collections/:slug`.
- [x] `#/collections` grid and `#/collections/:slug` pages render real collections and derived counts.
- [x] Store filter: replace the hard-coded `categories` list in `src/data/store.js` / `Store.jsx` with collections from `/api/collections` (keep "All Products").
- [x] Home `Collections` tiles read from the API instead of the hard-coded `collections` / `collectionTiles` in `content.js`.
- [x] Navigation: New Arrivals stays `#/store?sort=new`; menu links point at real collection slugs; Archive becomes "All products". Remove the virtual `collectionInfo` rules.
- [x] Loading/empty states for a collection with no products.
- [x] Tests: collection required on product, delete guard, public filter, card label, admin CRUD auth.

**Acceptance:** every product has one collection, staff can CRUD collections without touching MongoDB, the storefront lists real collections, and each product card shows its collection bottom-right.

**Confirmed mapping:** collections are seeded from the existing categories (T-Shirts, Hoodies, Pants, Jackets, Accessories). The virtual `new-drop` / `essentials` / `archive` pages are retired: New Arrivals becomes a sort, Archive becomes all products.

---

## Phase 6 — Newsletter lifecycle

The README explicitly says unsubscribe must be implemented before campaigns (`README.md:57`). There is also no admin subscriber list.

- [x] Add `unsubscribeToken` (random 32 bytes, unique index), `status: subscribed|unsubscribed`, `unsubscribedAt` to `Subscriber`.
- [x] Generate the token on first subscribe with `$setOnInsert`; resubscribe resets status.
- [x] `GET /api/newsletter/unsubscribe?token=...` returns a minimal confirmation page; `POST` performs the one-click unsubscribe.
- [x] Add `List-Unsubscribe` / `List-Unsubscribe-Post` headers to future campaign emails (document the contract).
- [x] New `#/unsubscribe?token=...` confirmation UI for the storefront.
- [x] Add `GET /api/admin/subscribers` (paginated) and CSV export; add an admin section.
- [x] Tests: token validation, idempotent unsubscribe, expired/unknown token.

**Acceptance:** one unguessable link unsubscribes immediately; staff can see and export active subscribers.

---

## Phase 7 — Admin console completeness

**Products**

- [x] `POST /api/admin/products`, `PATCH /api/admin/products/:id`, `DELETE` (soft delete with `active: false`).
- [x] Editable: name, price, collection (required), badge, colorway, swatch color, sizes, garment config, `added`, and `shippingOverride` (blank = global rule).
- [x] Create/remove `Inventory` rows when sizes change; never destroy order history (orders already snapshot names/prices).
- [x] Public `/api/products` filters `active: true`.
- [x] Fix `server/seed.js` so it does not overwrite admin edits: use `$setOnInsert` by default, add `SEED_RESET=1` for the current behaviour.
- [x] Admin product form + list with search and active toggle; the form includes the required collection select and the optional "Shipping override (TND per unit)" field (blank = global).

**Contacts**

- [x] Add `status: new|open|resolved`, `handledAt`; `PATCH /api/admin/contacts/:id`, `DELETE /api/admin/contacts/:id`.
- [x] Filters and counts in the UI.

**Dashboard and exports**

- [x] `GET /api/admin/stats`: pending orders, revenue (confirmed + fulfilled), low-stock variants (≤ `LOW_STOCK_THRESHOLD`), new contacts.
- [x] Low-stock section + optional daily email digest.
- [x] CSV export: orders (with status/date filters), contacts, subscribers; correct quoting and UTF-8 BOM.
- [x] Add dashboard cards and export buttons to `AdminPage.jsx`.

**Audit trail**

- [x] New `AuditLog` model: `{ action, targetType, targetId, metadata, actor, createdAt }`.
- [x] Write entries for order status changes, stock edits, product CRUD, contact deletions.
- [x] `GET /api/admin/audit` (paginated) + admin view.
- [x] Optional `x-staff-name` header, recorded as `actor` (still one shared token).

**Acceptance:** staff can run the store without touching MongoDB or the seed file, and every destructive action is traceable.

---

## Phase 8 — Routing, SEO, and 404s

Unknown hashes render the homepage (`src/App.jsx:19-35`); every page shares one title/description; hash URLs are not indexable.

- [x] Migrate from hash routing to the History API (`react-router-dom`); update all `href="#/..."` links.
- [x] Keep the Express catch-all (already present in `server/index.js:54-61`) and add redirects from old `#/` URLs.
- [x] Handle scroll-to-top and anchor scrolling per route.
- [x] `usePageMeta` hook: per-page title, description, canonical, Open Graph.
- [x] Add `NotFoundPage` and a `*` route.
- [x] Add `public/robots.txt` and a build-time `sitemap.xml` generated from static pages + products.
- [x] Add JSON-LD (`Organization`, `Product`/`Offer`) to product pages.
- [x] Set `lang`/`dir` correctly if translations land.

**Acceptance:** deep links survive refresh, every page has a unique title, the sitemap is valid, unknown paths show a styled 404.

**Note:** this is the largest frontend refactor; do it after Phases 1–5 are stable.

---

## Phase 9 — Security, Redis, and infrastructure hardening

- [x] Enable Helmet CSP with explicit directives (`script-src 'self'`, `style-src 'self' 'unsafe-inline' fonts.googleapis.com`, `font-src fonts.gstatic.com`, `img-src 'self' data: https://images.unsplash.com`, `connect-src 'self'`). Disable or relax only in dev.
- [x] Add `redis` and `rate-limit-redis` dependencies.
- [x] Build one rate-limit store factory in `server/` and use it for every public and admin limiter.
- [x] `REDIS_URL` config: required in production, memory fallback with a loud warning in development.
- [x] Report Redis connectivity in `GET /api/health` (for example `rateLimitStore: 'redis' | 'memory'`).
- [x] Lock down CORS (same-origin by default, `ALLOWED_ORIGINS` allowlist).
- [x] Support token rotation: `ADMIN_API_TOKENS` (comma-separated, constant-time compare) while keeping `ADMIN_API_TOKEN`.
- [x] Add `npm audit --omit=dev` (high) and Dependabot to CI.
- [x] Add `docker-compose.yml` with MongoDB and Redis for local development; document `REDIS_URL` in `.env.example`.
- [x] Smoke tests for auth, CSP headers, body-size limits, and rate limiting.
- [x] Integration test proving two app instances share one limit through Redis (and that dev falls back to memory).

**Acceptance:** production responses carry a strict CSP, all rate limits are shared through Redis across replicas, `/api/health` reports the store, and tokens can rotate without downtime.

---

## Phase 10 — Customer accounts (in scope)

Guest checkout stays allowed; accounts are optional. Email and password authentication with scrypt hashing keeps credentials secure; legacy magic-link routes remain available for existing links.

**Models**

- [x] `User`: `email` (unique, lowercase), `name`, `passwordHash`, `emailVerifiedAt`, `status`, timestamps.
- [x] `LoginToken`: `email`, `tokenHash`, `expiresAt` (15 min), `usedAt`; TTL index.
- [x] `Session`: `userId`, `tokenHash`, `expiresAt`, `userAgent`, `ip`; TTL index.
- [x] Addresses embedded in `User` (label, name, phone, address, city, isDefault).

**Auth API**

- [x] `POST /api/auth/register` — name, email and password (8+ characters); hashes with scrypt and starts a session.
- [x] `POST /api/auth/login` — verifies the password hash, rejects invalid credentials, and starts a session.
- [x] `POST /api/auth/request-link` — always returns a generic `200` (no account enumeration); rate-limited per email and IP; sends a magic link through the existing mail transport.
- [x] `POST /api/auth/verify` — consumes a single-use token, creates a session, sets an `httpOnly`, `secure` (in production), `sameSite=lax` cookie; rotates the session on login.
- [x] `POST /api/auth/logout`, `GET /api/auth/me`.
- [x] CSRF protection for cookie-authenticated mutations (double-submit token or strict origin check + custom header).
- [x] `PATCH /api/account/profile`, `GET/PUT /api/account/wishlist`, `GET/POST/PATCH/DELETE /api/account/addresses`.

**Account experience**

- [x] New `#/account` page: profile, saved addresses, order history, synced wishlist.
- [x] Header account icon points to `#/account` (login form when signed out).
- [x] On first login, merge the local wishlist into the account and claim past orders matching the verified email.
- [x] `GET /api/account/orders` with the same safe fields as order lookup; link to tracking.
- [x] Prefill checkout from the default address and let the customer save the entered address.
- [x] Optional staff read-only customer list in the admin console.

**Security/tests**

- [x] Token hashing at rest, single use, expiry, replay rejection.
- [x] Session revocation on logout and after email change.
- [x] Never expose another customer's orders, addresses, or wishlist.
- [x] Tests: registration, duplicate email, password login, hashed-at-rest passwords, cookie flags, CSRF rejection, order claim, wishlist merge.

---

## Phase 11 — Product reviews (in scope)

- [x] `Review`: `productId`, `userId`, `orderId`, `rating` (1–5), `title`, `body`, `status: pending|published|rejected`, `verifiedPurchase`, timestamps; unique `{ productId, userId }`.
- [x] `POST /api/reviews` requires auth; reject duplicates; mark `verifiedPurchase` when the user has a confirmed/fulfilled order containing the product.
- [x] `PATCH/DELETE /api/reviews/:id` for the author only.
- [x] Public `GET /api/products/:id/reviews` (published only, paginated) and aggregate `ratingAverage` / `ratingCount` in the catalogue payload.
- [x] Admin moderation: `GET /api/admin/reviews`, `PATCH /api/admin/reviews/:id` (publish/reject), delete; add a Reviews tab.
- [x] Product page: star summary, review list, verified badge, review form for signed-in buyers; cards show the aggregate.
- [x] Tests: one review per user/product, verification logic, moderation visibility, aggregate math.

**Confirmed:** any signed-in user can review; verified purchases get a badge. New reviews enter moderation as `pending`.

---

## Explicitly out of scope

- **Online payments** — decision: COD only. Do not add provider code, webhooks, or payment UI.
- **Discount codes** — decision: out for now. Do not add a discount model, admin CRUD, checkout field, or validation endpoint. Leave `Order` extensible but do not build the feature.
- **Multi-language, PWA/offline, real product photography** — nice-to-have backlog, not committed. The footer language switcher stays cosmetic until a real i18n project is approved.

---

## Cross-cutting checklist (apply to every phase)

- [ ] Tests: happy path, validation, auth, concurrency/idempotency.
- [ ] `README.md`: endpoint list, env vars, operational notes.
- [ ] `.env.example`: every new variable with a safe default.
- [ ] Admin UI: loading, empty, error, success states; confirm destructive actions.
- [ ] Accessibility: labels, focus management, keyboard use, `aria-live` for async results.
- [ ] Mobile layout reviewed at 360px and 768px.
- [ ] No secrets, no stack traces, no raw Mongo errors in responses.
- [ ] Money is integer minor units or consistently rounded (define one rule for shipping and totals).
- [ ] Customer sessions: httpOnly cookie, CSRF protection, no sensitive data in `localStorage`.
- [ ] Both guest and signed-in checkout paths tested after accounts land.

---

## Suggested order and rough effort

| Order | Phase | Effort | Why now |
| --- | --- | --- | --- |
| 1 | 0 — Baseline | 1–2 days | Makes every later change safe |
| 2 | 1 — Cart persistence | 0.5 day | Quick win, visible to every shopper |
| 3 | 2 — Order tracking | 2–3 days | Removes the biggest support gap |
| 4 | 3 — Order expiry (72h) | 1–2 days | Protects sellable stock |
| 5 | 4 — Configurable shipping | 2–3 days | Correct money collected on delivery |
| 6 | 5 — Collections + CRUD | 3–5 days | Catalogue structure and card labels |
| 7 | 6 — Newsletter lifecycle | 1–2 days | Compliance + marketing readiness |
| 8 | 7 — Admin completeness | 4–6 days | Removes MongoDB/seed dependency |
| 9 | 8 — Routing + SEO | 3–4 days | Discoverability, shareable links |
| 10 | 9 — Hardening + Redis | 3–4 days | Production readiness, shared limits |
| 11 | 10 — Customer accounts | 5–8 days | Order history, wishlist sync |
| 12 | 11 — Product reviews | 3–4 days | Social proof |

**First PRs:** Phase 0 → Phase 1 → Phase 2 → Phase 3. Then Phase 4 (shipping) and Phase 5 (collections), because both change the catalogue/checkout shape before admin CRUD and accounts build on it.

---

## Open decisions (answer before starting the relevant phase)

**Answered:** accounts and reviews in, discounts out for now, payments out; reviews open to all signed-in users with a verified-purchase badge; routing migrates to the History API; Redis-backed shared rate limits are in scope; shipping configured in admin (fixed or percentage), no free-shipping threshold, product override fixed per unit; pending orders held 72h with a customer notice; collections = existing categories, admin CRUD, bottom-right card label, deactivation hides only the collection page.

1. Accounts: should checkout require an account, or stay guest-first? Current assumption: guest-first.
2. Magic-link email: which sender/domain? SPF/DKIM must be configured or links will land in spam.
3. Newsletter: which email provider sends campaigns, and should unsubscribe confirm or act immediately?
