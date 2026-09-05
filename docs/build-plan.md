# Open Food build plan

Source: [Technical assignment](open-food-technical-assignment.pdf).

This document plans implementation; no application has been built yet. Requirements below come from the assignment. Architecture and scope decisions are proposed defaults.

## Required outcome

Build a responsive packaged-food search application using Next.js, React, Tailwind CSS, and TypeScript, backed by NestJS, Prisma, and MySQL. Retrieve products through the backend from Open Food Facts. Support English, Dutch, German, and French. Anyone can view product names, brands, and images; detailed nutrition requires an active Stripe test-mode subscription. Use one demo user and persist recent searches.

User-selected stack change: use NestJS for the API. The original assignment names Express; document this framework choice in the README.

## Proposed structure

- `apps/web`: Next.js interface, locale dictionaries, search, product details, and subscription screens.
- `apps/api`: NestJS modules, controllers, and services for products, Open Food Facts integration, demo-user resolution, recent searches, and Stripe subscriptions.
- `packages/shared`: API types and validation schemas, without server secrets.
- `prisma`: schema, committed migration, and demo-user seed.
- `docs`: assignment and implementation plan.
- `docker-compose.yml`: local MySQL service with persistent storage and a health check.
- `apps/web/.env.example`: template for the web app's own `.env`, containing its API URL and other frontend configuration.
- `apps/api/.env.example`: template for the API's own `.env`, containing database, Stripe, and backend configuration.
- `.env.example`: root template for Docker Compose's MySQL configuration only.

Use a workspace repository and local MySQL through Docker Compose. Keep business logic in backend services and external API response mapping in dedicated adapters. Verify current official integration documentation and compatible package versions when implementing.

## Implementation sequence

Use the project [Zod and React Hook Form skill](../.agents/skills/zod-react-hook-form/SKILL.md) when implementing forms and validation. These libraries are user-selected additions to the assignment stack.
Apply its backend validation guidance through NestJS validation pipes; its references to Express describe the previous API plan.

### 1. Foundation and persistence

- Scaffold the required stack with development, build, lint, and type-check commands.
- Provide a root `npm run dev` command that starts the full local development stack. First start MySQL with Docker Compose and wait for its health check to pass; then use `concurrently` to run the Next.js frontend and NestJS API in watch mode with labeled logs.
- Add root scripts for database startup/shutdown and individual web/API development commands. Configure `concurrently` to stop the sibling application if either application fails and to forward shutdown signals. Document that Docker must be running and that MySQL stays available until explicitly stopped with the database shutdown script; preserve its volume.
- Add Zod for shared input schemas and backend environment/request validation, and React Hook Form with `@hookform/resolvers` for frontend forms.
- Organize the NestJS API into feature modules with injected services, a shared Prisma provider, Zod validation pipes, and a subscription guard for protected nutrition endpoints.
- Create a root `docker-compose.yml` for MySQL with a persistent volume, health check, and environment-based database configuration.
- Create separate `apps/web/.env.example` and `apps/api/.env.example` files. The web template covers its API URL and frontend configuration. The API template covers Prisma's `DATABASE_URL`, API port, allowed web origin and checkout return URLs, Stripe test-mode secret key, webhook secret, and monthly price ID. Use placeholders for secrets; never put database credentials or Stripe secrets in the web environment.
- Keep the root `.env.example` limited to Docker Compose's MySQL database, user, passwords, and exposed port. Document how these values must match the API's `DATABASE_URL`.
- Load each application's environment from its own directory when launched through the root `concurrently` command. Configure Prisma migration and seed commands to explicitly load `apps/api/.env`, even though the Prisma schema lives at the repository root. Validate each application's environment independently.
- Ignore actual `.env` files and local environment overrides in version control while committing all `.env.example` templates.
- Document first-time setup: install dependencies, copy each of the three `.env.example` files to `.env` in the same directory, configure values, start MySQL, and run migrations and seeding. After setup, `npm run dev` must start Docker Compose services and both applications without separate terminal commands.
- Model `User`, `RecentSearch`, `Subscription`, and processed Stripe events. Use unique Stripe identifiers and timestamps.
- Commit the initial Prisma migration and an idempotent seed for one demo user.
- Resolve the demo user on the server; do not accept arbitrary user IDs from the browser. Document the shared demo identity as a deliberate simplification.

Completion: the migration applies to an empty database and the demo user is available. After first-time setup, a single `npm run dev` starts a healthy MySQL instance plus the frontend and API; database startup failure prevents application startup, and application failure shuts down the sibling process.

### 2. Product search and recent searches

- Add validated search and product-detail endpoints backed by Open Food Facts, with pagination, request timeouts, and controlled error responses.
- Map upstream responses into explicit public fields: product identifier, name, brand, and image. Do not return raw upstream payloads containing nutrition.
- Handle blank queries, no results, unavailable images, missing fields, and upstream failure.
- Persist successful search requests for the demo user; expose a bounded recent-search list with query, locale, and timestamp.
- Build responsive search, result cards, product details, and loading, empty, and error states.
- Implement the search form with React Hook Form and a shared Zod schema; validate requests again through NestJS pipes and display localized field errors.

Completion: a user can search, open a product, and repeat a persisted recent search.

### 3. Internationalization

- Add a manual selector for `en`, `nl`, `de`, and `fr`, persisting the selection locally.
- Translate interface labels, validation, empty states, billing messages, and nutrition labels.
- Send the selected locale to the backend and prefer corresponding localized product fields when available.
- Fall back to the generic product field, then English, then a translated missing-value label. Do not fabricate translations of product data.
- Format numbers for the selected locale while retaining accurate units and nutrition bases.

Completion: changing language updates the interface and available localized product content, including incomplete-data cases.

### 4. Subscription and protected nutrition

- Configure one monthly Stripe price in test mode through environment variables.
- Create Checkout sessions on the backend for the demo user's Stripe customer, using the configured price and return URLs.
- Preserve the raw request body in the NestJS Stripe webhook endpoint and verify webhook signatures against it. Process subscription lifecycle events with retry-safe event handling and protection against stale updates.
- Store subscription state in MySQL. Grant nutrition access only for an active subscription; document the treatment of cancellation at period end and other statuses.
- Add a nutrition endpoint that checks entitlement on every request and returns a forbidden response without nutrition when access is denied.
- Show a subscribe prompt for unsubscribed users and nutrition for entitled users. Checkout's success redirect must not grant access; refresh status while webhook processing completes.
- Avoid shared caching of protected responses, and ensure public search/detail payloads never expose nutrition.

Completion: test checkout plus a verified webhook unlocks nutrition; loss of active status removes access on the backend.

### 5. Tests and delivery

- Test product mapping with incomplete data and locale fallbacks.
- Test query validation and recent-search persistence against a test database.
- Test that public payloads omit nutrition and that direct nutrition requests reject inactive users and allow active users.
- Test invalid webhook signatures, duplicate events, stale events, subscription activation, and cancellation.
- Add a browser flow covering search and language selection, with deterministic external-service fixtures.
- Manually verify Stripe test-mode checkout and webhook delivery, responsive layout, keyboard use, and readable error states.
- Run type checks, lint, automated tests, and production builds.
- Write a README covering setup, migrations, seeding, environment variables, Stripe test setup, tests, architecture, internationalization, and limitations.

Completion: the repository contains source code, migration, separate web/API `.env.example` templates, automated tests, and a reproducible README, plus `docker-compose.yml` and its root `.env.example` for local MySQL setup.

## Proposed scope boundaries

- One shared demo user; no registration or full authentication flow.
- One monthly subscription price; no pricing tiers or billing portal unless needed later.
- Open Food Facts remains the product source; no full catalog import or automatic translation service.
- Local development and review setup first; deployment is a separate decision.
- Never commit secrets. Keep Stripe secret keys, webhook secrets, and database credentials on the backend.

## First build milestone

Complete the foundation and product-search flow before adding billing. This establishes the database, backend adapter, and usable interface that internationalization and subscription checks will extend.
