# Open Food

A responsive search application for packaged foods, backed by [Open Food Facts](https://world.openfoodfacts.org/). Anyone can browse product names, brands, and images; detailed nutrition is available to a demo user with an active Stripe test-mode subscription. The interface is available in English, Dutch, German, and French.

> **Status: feature-complete on this branch, pending review.** Search, internationalization, and Stripe subscriptions are all implemented and tested (see [Testing](#testing)) — see [Limitations](#limitations) for the one significant gap: no live Stripe test-mode account exists in this environment, so the actual browser checkout flow and live webhook delivery from Stripe are unverified beyond what a placeholder key allows.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (Base UI) |
| Backend | NestJS, TypeScript |
| Database | MySQL via Prisma (driver-adapter client, `@prisma/adapter-mariadb`) |
| Payments | Stripe (test mode): Checkout, webhooks, subscriptions |
| Validation | Zod, React Hook Form |
| Data source | Open Food Facts — [Search-a-licious](https://search.openfoodfacts.org) for search, the legacy Product Opener API for single-product lookups |
| Testing | Vitest (unit + API e2e), Playwright (browser e2e) |

## Framework and implementation choices

- **NestJS instead of Express.** The assignment names Express. NestJS is used instead for its module system, dependency injection, and first-class validation pipes and guards, which suit the subscription-gated nutrition endpoints.
- **Zod and React Hook Form added.** Neither is named in the assignment. One schema validates a form in the browser and the same request again on the server, so validation rules are defined once.
- **Hand-rolled i18n, not a library.** Locale selection is client-only (localStorage, no routing), so `next-intl`'s URL/middleware machinery isn't needed. Four dictionaries (`apps/web/src/lib/messages/*.ts`) are checked against the English one with `satisfies`, so a missing translation is a compile error.
- **Open Food Facts' legacy full-text search is deprecated** (`world.openfoodfacts.org/api/v2/search` returns HTTP 503 for anonymous callers as of this writing). Search goes through [Search-a-licious](https://search.openfoodfacts.org) instead, confirmed live against the running API rather than assumed from older documentation. Single-product-by-barcode lookups are unaffected and stay on the legacy host.

## Architecture

**Backend** (`apps/api`) is organized by feature module, each with its own controller/service:

- `open-food-facts/` — the only place that talks to Open Food Facts; maps every upstream response onto an explicit allowlist of fields (`ProductSummary`, `NutritionInfo`) before anything else in the app sees it. Requested-locale product names fall back through `product_name_<locale>` → generic `product_name` → `product_name_en` → `null`, never fabricating a translation.
- `products/` — `GET /products/search`, `GET /products/:id`, and the guarded `GET /products/:id/nutrition`.
- `recent-searches/` — persists and lists the demo user's search history.
- `users/` — resolves the one demo user server-side; no endpoint accepts a client-supplied user ID.
- `stripe/`, `subscriptions/`, `billing/` — the Stripe client wrapper, webhook processing and entitlement state, and the checkout/status/webhook HTTP endpoints, respectively.
- `common/` — a generic `ZodValidationPipe` used across controllers.

**Frontend** (`apps/web`) is a single App Router tree: `/` (search), `/products/[id]` (detail, nutrition or subscribe prompt), `/subscription/success` and `/subscription/cancel` (Stripe redirect targets). `lib/locale-context.tsx` provides the active locale and translations everywhere via React context; `lib/api.ts` is the one place that calls the backend.

**`packages/shared`** holds the Zod schemas, TypeScript types, and constants both apps import — no server secrets — so the same validation rules and response shapes are enforced on both ends of every request.

## Layout

```
apps/web         Next.js interface: search, product/nutrition pages, locale dictionaries, Playwright e2e
apps/api         NestJS modules: products, Open Food Facts adapter, recent searches, users, Stripe/billing
packages/shared  Zod schemas, types, and constants shared by both apps, no server secrets
prisma           Schema, migrations, and demo-user seed
scripts          One-off local tooling (e.g. the MySQL dev-privilege grant)
docs             Assignment and build plan
```

## Getting started

Requires Node.js 22+ and Docker.

```bash
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

npm run db:up
npm run prisma:migrate
npm run prisma:seed

npm run dev
```

`npm run dev` starts MySQL (if not already running), waits for its healthcheck, then runs the web app on [localhost:3000](http://localhost:3000) and the API on [localhost:4000](http://localhost:4000). If either app fails to start, the other is stopped with it. MySQL keeps running after `npm run dev` exits — stop it explicitly with `npm run db:down` — and its data persists in a Docker volume across restarts.

Other useful scripts, runnable from the repo root:

| Command | Effect |
| --- | --- |
| `npm run lint` / `npm run typecheck` / `npm run test` / `npm run build` | Run across every workspace |
| `npm run prisma:migrate` | Apply schema changes to the local database |
| `npm run prisma:seed` | Re-run the demo-user seed (idempotent) |

## Internationalization

The selector in the top-right of the search page switches between English, Dutch, German, and French, persisting the choice to `localStorage`. Changing it re-issues the active search and any open product page against the API with the new `locale`, so product names — not just interface labels — update; a product with no name in the selected language falls back through the generic and English fields rather than showing nothing, and never displays a fabricated translation.

## Stripe test-mode setup

`apps/api/.env.example`'s Stripe values are placeholders. To exercise the real checkout flow against your own Stripe account:

1. Create a [Stripe test-mode](https://dashboard.stripe.com/test/apikeys) account and copy the test **secret key** into `STRIPE_SECRET_KEY`.
2. Create one recurring monthly [Price](https://dashboard.stripe.com/test/prices) and put its ID in `STRIPE_MONTHLY_PRICE_ID`.
3. Run the [Stripe CLI](https://docs.stripe.com/stripe-cli) locally: `stripe listen --forward-to localhost:4000/billing/webhook`. It prints a `whsec_...` value — put that in `STRIPE_WEBHOOK_SECRET`.
4. Leave `STRIPE_CHECKOUT_SUCCESS_URL` / `STRIPE_CHECKOUT_CANCEL_URL` pointed at `apps/web`'s `/subscription/success` and `/subscription/cancel` (the defaults already are).
5. Restart the API, click **Subscribe** on any product page, and complete checkout with a [Stripe test card](https://docs.stripe.com/testing#cards) (`4242 4242 4242 4242`, any future expiry, any CVC).

The success redirect itself grants nothing — only a verified webhook does — so the success page polls entitlement for a few seconds while the webhook (forwarded by the CLI above) is processed.

## Testing

| Command | What it covers | Needs |
| --- | --- | --- |
| `npm run test --workspace apps/api` | Unit tests: Open Food Facts response mapping and locale fallback, Stripe webhook signature verification (a genuinely valid HMAC via Stripe's own `generateTestHeaderString`, no network call), webhook idempotency/staleness/entitlement logic | Nothing — no database, no network |
| `npm run test:e2e --workspace apps/api` | Real HTTP against the full app: query/locale validation, recent-search persistence (read back through the real endpoint), and nutrition access control (403 with no/canceled subscription, 200 with `Cache-Control: private, no-store` once active) | Local MySQL running (`npm run db:up`) and `apps/api/.env` configured |
| `npm run test:e2e --workspace apps/web` | A real headless Chromium (Playwright): submitting a search renders results, switching locale re-fetches and re-renders with the new language, a blank query is rejected client-side. Network is mocked at the API boundary the page calls, so it doesn't depend on live Open Food Facts data | Nothing — builds and serves the app itself; no backend or database needed |

What isn't automated, and needs a real Stripe test-mode account (see above) plus a browser to check by hand: completing an actual Checkout session, confirming a live webhook delivery unlocks nutrition, and general UX review (responsive layout, keyboard navigation, error-state readability).

## Security

Stripe secret keys, webhook secrets, and database credentials stay on the backend and are never committed. Only `.env.example` templates are tracked. Nutrition access is authorized on the server on every request via a Nest guard, never assumed from a prior page visit or a successful checkout redirect; nutrition responses are marked `Cache-Control: private, no-store` so a shared cache can never serve one client's entitled response to another.

## Limitations

- **No live Stripe test-mode account in this environment.** Webhook processing (signature verification, idempotency, staleness protection, entitlement changes) is verified thoroughly — both by unit tests and by sending genuinely-signed webhook events to the running server — but creating a real Checkout Session requires calling Stripe's actual API, which a placeholder key cannot do. See [Stripe test-mode setup](#stripe-test-mode-setup) to exercise it for real.
- One shared demo user, with no registration or full authentication flow.
- A single monthly subscription price, with no tiers or billing portal.
- Open Food Facts remains the only product source; there is no catalog import or machine translation of product data.
- Deployment is out of scope.

## Documentation

- [Technical assignment](docs/open-food-technical-assignment.pdf) — source requirements
- [Build plan](docs/build-plan.md) — architecture decisions and implementation sequence
