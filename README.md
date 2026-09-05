# Open Food

A responsive search application for packaged foods, backed by [Open Food Facts](https://world.openfoodfacts.org/). Anyone can browse product names, brands, and images; detailed nutrition is available to a demo user with an active Stripe test-mode subscription. The interface is available in English, Dutch, German, and French.

> **Status: feature-complete.** Search, internationalization, and Stripe subscriptions are all implemented and tested (see [Testing](#testing)). Checkout has since been run for real against a Stripe test-mode account: a live Checkout Session, a real subscription, and the resulting entitlement change have all been exercised end to end. See [Limitations](#limitations) for what remains out of scope.

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

- **NestJS instead of Express.** The assignment names Express under Required Stack. NestJS is used instead for its module system, dependency injection, and first-class validation pipes and guards, which suit the subscription-gated nutrition endpoints. Worth noting that Express is still the HTTP layer underneath — the API runs on `@nestjs/platform-express`, and the raw-body handling for Stripe webhook signature verification goes through Express' own request object. The deviation is the framework wrapping Express, not a different server.
- **Zod and React Hook Form added.** Neither is named in the assignment. One schema validates a form in the browser and the same request again on the server, so validation rules are defined once.
- **Hand-rolled i18n, not a library.** Locale selection is client-only (localStorage, no routing), so `next-intl`'s URL/middleware machinery isn't needed. Four dictionaries (`apps/web/src/lib/messages/*.ts`) are checked against the English one with `satisfies`, so a missing translation is a compile error.
- **Open Food Facts' legacy full-text search is deprecated** (`world.openfoodfacts.org/api/v2/search` returns HTTP 503 for anonymous callers as of this writing). Search goes through [Search-a-licious](https://search.openfoodfacts.org) instead, confirmed live against the running API rather than assumed from older documentation. Single-product-by-barcode lookups are unaffected and stay on the legacy host.

## Architecture

**Backend** (`apps/api`) is organized by feature module, each with its own controller/service:

- `open-food-facts/` — the only place that talks to Open Food Facts; maps every upstream response onto an explicit allowlist of fields (`ProductSummary`, `ProductDetail`, `NutritionInfo`) before anything else in the app sees it. Prose fields resolve through `<field>_<locale>` → the submitter's own text → `<field>_en` → `null`, never fabricating a translation. The mapper also filters upstream noise that would otherwise render as content: the literal `en:null` category a product with no category produces, `unknown`/`not-applicable` grades, and a generic name that merely repeats the product name or brand.
- `products/` — `GET /products/search`, `GET /products/:id`, and the guarded `GET /products/:id/nutrition`. Search results whose image the search index is missing are reconciled against the product API, since that index carries no image data for some products the detail endpoint does have a photo for; the URL cannot be derived from the barcode because it embeds a revision number. Those lookups are capped, issued together, given a tighter timeout than the search itself, and memoised per barcode — including "there is no photo", which is common and would otherwise be re-asked on every search.
- `recent-searches/` — persists and lists the demo user's search history. Repeating the search you just ran bumps the existing row rather than adding a duplicate; a non-consecutive repeat still records, so `a → b → a` keeps both.
- `users/` — resolves the one demo user server-side and exposes it at `GET /me` (id, member-since, subscription status). No endpoint accepts a client-supplied user ID, so there is nothing to tamper with.
- `stripe/`, `subscriptions/`, `billing/` — the Stripe client wrapper, webhook processing and entitlement state, and the checkout/status/webhook HTTP endpoints, respectively.
- `common/` — a generic `ZodValidationPipe` used across controllers.

**Frontend** (`apps/web`) is a single App Router tree: `/` (search), `/products/[id]` (detail, nutrition or subscribe prompt), `/subscription/success` and `/subscription/cancel` (Stripe redirect targets). Two React contexts sit in the root layout — `lib/locale-context.tsx` for the active locale and translations, `lib/subscription-context.tsx` for subscription status, fetched once and shared by the header and the homepage rather than requested per component. `lib/api.ts` is the one place that calls the backend, and `lib/use-checkout.ts` the one place that starts a Checkout Session.

**The active search lives in the URL** (`/?q=nutella`) rather than in component state, so it survives a reload, restores on back/forward, and can be shared. Submitting the form rewrites the URL and a single effect reacts to it, which avoids keeping state and URL in sync. Product links carry the query so their back link returns to the same results.

**`packages/shared`** holds the Zod schemas, TypeScript types, and constants both apps import — no server secrets — so the same validation rules and response shapes are enforced on both ends of every request.

## Layout

```
apps/web         Next.js interface: search, product/nutrition pages, locale dictionaries, Playwright e2e
apps/api         NestJS modules: products, Open Food Facts adapter, recent searches, users, Stripe/billing
packages/shared  Zod schemas, types, and constants shared by both apps, no server secrets
prisma           Schema, migrations, and the seed (demo user plus six recent searches)
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
| `npm run prisma:seed` | Re-run the seed (idempotent — safe to run repeatedly) |
| `npm run prisma:reset` | **Destroys all local data**, replays every migration, then seeds. Prompts before dropping anything |

The app has no registration: every request acts as a single seeded demo user. If that row is missing, every endpoint answers `500` with *"Demo user is missing; run the database seed"* rather than failing obscurely — the fix is always `npm run prisma:seed`.

That error is easy to hit after a reset, because **Prisma 7's `migrate reset` does not run the seed** (seeding was decoupled from it — there is no longer a `--skip-seed` flag, and the command's help makes no mention of seeding). Running `prisma migrate reset` directly therefore leaves an empty database and a `500`ing API. `npm run prisma:reset` above exists to avoid that trap: it chains the seed itself.

## What is free and what is paywalled

The assignment says everyone may view *"basic information such as the product name, brand, and image"*, while *"detailed nutritional values"* require an active subscription. "Such as" reads as examples rather than an exhaustive list, so the line is drawn at nutritional values:

| | Fields |
| --- | --- |
| **Free** | `name`, `brand`, `imageUrl`, `id` (barcode), `genericName`, `quantity`, `servingSize`, `ingredientsText`, `allergens`, `categories`, `labels`, `countries`, `novaGroup`, `ecoScore` |
| **Subscriber only** | `energyKcal`, `fat`, `saturatedFat`, `carbohydrates`, `sugars`, `fiber`, `proteins`, `salt`, `basis`, `nutriScore` |

Two decisions worth surfacing:

- **Nutri-Score is paywalled**, even though it is a single letter rather than a number. It is computed *from* the nutriments, so publishing it free would leak a summary of exactly what the subscription sells. It travels on `NutritionInfo` and renders inside the gated panel.
- **Ingredients and allergens are free.** They are label information printed on the package, not nutritional values, and allergens in particular are safety information that it would be hard to justify charging for.

Enforcement is server-side only: `SubscriptionGuard` on `GET /products/:id/nutrition` returns `403` unless the demo user's subscription status is exactly `active`, so a canceled subscription loses access immediately. Hiding the panel in React is cosmetic — the data never leaves the server without entitlement, and the response carries `Cache-Control: private, no-store`. Both the free payload's exact field set and the 403/200 behaviour are pinned by tests, so the boundary cannot drift unnoticed.

## Subscribing

Checkout can be started from three places, all sharing one `useCheckout` hook: the prompt on a product page (where the paywall is actually met), a banner on the homepage, and the plan badge in the header. The latter two exist because a visitor who never opens a product would otherwise have no way to find the offer at all. All three disappear for a subscriber.

**Checkout returns you where you started.** The client sends the current path — query string included — and the API appends it to Stripe's success and cancel URLs, so paying from `/products/123?q=snack` lands back on that product with nutrition unlocked, and abandoning checkout returns there too. That path is validated as a same-origin relative path in three places (the Zod body schema, the service that builds the URL, and the page that renders the link): it reaches a redirect after a round trip through a third party, so a protocol-relative value like `//other-site.test` or anything carrying a scheme is rejected at each step rather than trusted from the one before.

## Internationalization

A labelled selector in the header switches between English, Dutch, German, and French, persisting the choice to `localStorage`. It is in the header rather than on the search page so the language can also be changed while reading a product. Options are endonyms — English, Nederlands, Deutsch, Français — so someone who has landed on a language they cannot read can still find their own.

Changing it re-issues the active search and any open product page against the API with the new `locale`, so **product data updates, not just interface labels**. Numbers and dates are formatted with `Intl` against the active locale.

Open Food Facts stores text both in language-tagged fields (`ingredients_text_de`) and in an untagged one (`ingredients_text`). The untagged field is **not** reliably the submitter's language: on real records it is a dump of everything printed on the packaging — one product carries German and Bulgarian in the same field while declaring `lang=en`. Resolution therefore treats tagged and untagged fields differently:

| | Order |
| --- | --- |
| **Prose** — ingredients, generic name | requested locale → tagged English → **nothing** |
| **Name** — an identifier | requested locale → tagged English → untagged → nothing |

Prose refuses the untagged field because a description in a language the reader cannot parse is noise, and an ingredient list is where allergens are declared — an explicit "unavailable" is safer than text nobody can read. A name keeps it as a last resort, since showing the wrong language still identifies the product better than "Unnamed product". Nothing is ever machine-translated.

**Tag lists are translated through a second endpoint.** Product responses only ever carry canonical English tag ids (`en:rolled-oats`), whatever locale is requested, so allergens, categories, labels and countries stayed English at first. The translations do exist — behind Open Food Facts' taxonomy endpoint, one request per tag type — so `TaxonomyService` resolves them and memoises the result for the life of the process, since the taxonomy is static reference data. A tag with no translation, or a taxonomy outage, falls back to the humanised canonical name: the language of a label degrades, never the page.

Two honest limits:

- **A cold cache costs extra requests.** The first product view issues up to four taxonomy lookups in parallel; subsequent views for the same tags are served from memory. The cache is per-process, so it starts empty on every restart.
- **Upstream language tags are sometimes simply wrong**, and that is not detectable from here. One record files a French name under `product_name_en`, another files German text under `generic_name_en`; a real product returns `"blueberry jam"` as the English name for Nutella, a case pinned in the tests. Honouring the tag is the best available signal — the alternative is guessing at the language of free text, which would be worse.

## Stripe test-mode setup

`apps/api/.env.example`'s Stripe values are placeholders. To exercise the real checkout flow against your own Stripe account:

1. Create a [Stripe test-mode](https://dashboard.stripe.com/test/apikeys) account and copy the test **secret key** into `STRIPE_SECRET_KEY`.
2. Create one recurring monthly [Price](https://dashboard.stripe.com/test/prices) and put its ID in `STRIPE_MONTHLY_PRICE_ID`.
3. Install the Stripe CLI and start forwarding webhooks (see [below](#installing-the-stripe-cli)): `stripe listen --forward-to localhost:4000/billing/webhook`. It prints a `whsec_...` value — put that in `STRIPE_WEBHOOK_SECRET`.
4. Leave `STRIPE_CHECKOUT_SUCCESS_URL` / `STRIPE_CHECKOUT_CANCEL_URL` pointed at `apps/web`'s `/subscription/success` and `/subscription/cancel` (the defaults already are).
5. Restart the API, click **Subscribe** on any product page, and complete checkout with a [Stripe test card](https://docs.stripe.com/testing#cards) (`4242 4242 4242 4242`, any future expiry, any CVC).

The success redirect itself grants nothing — only a verified webhook does — so the success page polls entitlement for a few seconds while the webhook (forwarded by the CLI above) is processed.

### Installing the Stripe CLI

Stripe cannot reach `localhost`, so webhook events only arrive if the CLI is running to tunnel them in. **Without it, checkout succeeds and payment is taken, but the app never learns about it and nutrition stays locked** — the most likely cause if a real payment appears to have no effect.

It is already a devDependency of `apps/api`, so `npm install` puts it in the repo and `npx stripe …` works with no further setup. To type `stripe` instead of `npx stripe`, either install it globally or put the local one on your `PATH`:

```bash
npm install -g @stripe/cli                      # global; needs sudo if the npm prefix is root-owned
brew install stripe                             # macOS
ln -sf "$PWD/node_modules/@stripe/cli/bin/shim.js" ~/.local/bin/stripe   # no sudo; repo-local
```

The symlink resolves through this checkout, so it stops working if the repo moves or `node_modules` is removed — prefer a global install for a machine you use across projects.

<details>
<summary>Debian / Ubuntu via apt</summary>

```bash
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public \
  | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" \
  | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

</details>

Other platforms, and prebuilt binaries, are listed in the [Stripe CLI readme](https://github.com/stripe/stripe-cli#installation).

Then start the listener. `stripe login` pairs the CLI with your account via the browser, but is optional here — passing the secret key you already put in `apps/api/.env` avoids it, and keeps the signing secret stable across restarts:

```bash
stripe login                                    # optional, interactive
stripe listen --forward-to localhost:4000/billing/webhook
# or, without logging in:
stripe listen --api-key sk_test_… --forward-to localhost:4000/billing/webhook
```

Leave that running in its own terminal for as long as you are testing. It prints a webhook signing secret on startup:

```
> Ready! You are using Stripe API Version [2026-08-27]. Your webhook signing secret is whsec_1a2b3c... (^C to quit)
```

Copy that `whsec_...` into `STRIPE_WEBHOOK_SECRET` in `apps/api/.env` and **restart the API** — it reads the secret at boot. The value changes each time `stripe listen` starts unless you pass `--api-key`, so re-copy it if you restart the listener.

To check the wiring without paying for anything, trigger an event by hand:

```bash
stripe trigger customer.subscription.created
```

The API logs the event and records it in `ProcessedStripeEvent`. A `400` on `/billing/webhook` means the secret in `.env` does not match the one the listener printed.

## Testing

| Command | What it covers | Needs |
| --- | --- | --- |
| `npm run test --workspace apps/api` | 58 unit tests: Open Food Facts response mapping, locale fallback and upstream-noise filtering; Stripe webhook signature verification (a genuinely valid HMAC via Stripe's own `generateTestHeaderString`, no network call); webhook idempotency/staleness/entitlement logic; checkout return-path validation, including rejection of protocol-relative and scheme-carrying values; recent-search de-duplication | Nothing — no database, no network |
| `npm run test:e2e --workspace apps/api` | 11 tests over real HTTP against the full app: query/locale validation, recent-search persistence (read back through the real endpoint), the `GET /me` payload, and nutrition access control (403 with no or canceled subscription, 200 with `Cache-Control: private, no-store` once active, and the public product payload asserted to carry no nutrition at all) | Local MySQL running (`npm run db:up`) and `apps/api/.env` configured |
| `npm run test:e2e --workspace apps/web` | A real headless Chromium (Playwright): submitting a search renders results, switching locale re-fetches and re-renders with the new language, a blank query is rejected client-side. Network is mocked at the API boundary the page calls, so it doesn't depend on live Open Food Facts data | Nothing — builds and serves the app itself; no backend or database needed |

The full payment path has since been exercised by hand against a real Stripe test-mode account — a live Checkout Session, a card payment, `customer.subscription.created` delivered by `stripe listen`, and nutrition unlocking as a result. That run is not automated: it needs a Stripe account and a browser, so it stays a manual check, as does general UX review (responsive layout, keyboard navigation, error-state readability).

That same run surfaced a real defect. Two CLI listeners were briefly forwarding to the same endpoint, so each event arrived twice at once; the idempotency check reads `ProcessedStripeEvent` and then inserts into it, which is not atomic, and the delivery that lost the race returned `500` — telling Stripe to redeliver an event that had in fact been handled. Losing that race now returns normally, which is covered by tests. It is not only an artifact of the duplicate listener: Stripe's own retries can overlap, and multiple API instances behind a load balancer would race the same way.

## Security

Stripe secret keys, webhook secrets, and database credentials stay on the backend and are never committed. Only `.env.example` templates are tracked. The Stripe **publishable** key is not used at all — the browser never talks to Stripe directly; it asks the API for a Checkout Session and follows the URL Stripe returns.

Nutrition access is authorized on the server on every request via a Nest guard, never assumed from a prior page visit or a successful checkout redirect — a redirect can be forged, a signed webhook cannot. Nutrition responses are marked `Cache-Control: private, no-store` so a shared cache can never serve one client's entitled response to another.

Two smaller things worth naming:

- **The post-checkout return path is validated as an open-redirect surface.** It is client-chosen, embedded in a URL Stripe redirects to, and navigated to on return, so it is treated as untrusted at every step (see [Subscribing](#subscribing)).
- **Errors do not echo credentials.** When Stripe rejects the configured key, the API logs the detail and returns its own `billing_not_configured` message rather than forwarding Stripe's, which contains a masked form of the key.

## Limitations

- **Webhook delivery depends on the Stripe CLI running locally.** Stripe cannot reach `localhost`, so without `stripe listen` a completed payment never reaches the app and nutrition stays locked, even though the money moved. That is a property of local development rather than a defect — a deployed instance registers a public webhook endpoint instead — but it is the first thing to check when a real payment appears to have had no effect. See [Installing the Stripe CLI](#installing-the-stripe-cli).
- **No subscription management.** Cancelling or changing a plan happens in the Stripe dashboard; the app reflects the change when the resulting webhook arrives, but offers no billing portal of its own.
- One shared demo user, with no registration or full authentication flow.
- A single monthly subscription price, with no tiers.
- **Taxonomy translations are cached in memory only**, so they are re-fetched after every API restart and are not shared between instances (see [Internationalization](#internationalization)).
- Recent searches are stored but not otherwise used — there is no history page, and the list is capped at the ten most recent.
- Open Food Facts remains the only product source; there is no catalog import or machine translation of product data.
- Deployment is out of scope.

## Documentation

- [Technical assignment](docs/open-food-technical-assignment.pdf) — source requirements
- [Build plan](docs/build-plan.md) — architecture decisions and implementation sequence
