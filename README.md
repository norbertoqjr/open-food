# Open Food

A responsive search application for packaged foods, backed by [Open Food Facts](https://world.openfoodfacts.org/). Anyone can browse product names, brands, and images; detailed nutrition is available to users with an active subscription. The interface is available in English, Dutch, German, and French.

> **Status: foundation built.** The workspace, database, and both apps run end to end (see [Getting started](#getting-started)). Search, internationalization, and Stripe billing are not implemented yet — see [the build plan](docs/build-plan.md) for the remaining sequence.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript |
| Database | MySQL via Prisma |
| Payments | Stripe (test mode) |
| Validation | Zod, React Hook Form |
| Data source | Open Food Facts |

## Framework choices

Two deliberate deviations from the original assignment:

- **NestJS instead of Express.** The assignment names Express. NestJS is used instead for its module system, dependency injection, and first-class validation pipes and guards, which suit the subscription-gated nutrition endpoints. The tradeoff is a heavier framework than the assignment strictly requires.
- **Zod and React Hook Form added.** Neither is named in the assignment. They allow one schema to validate a form in the browser and the same request again on the server, so validation rules are defined once rather than duplicated.

## Layout

```
apps/web         Next.js interface, locale dictionaries, search and product screens
apps/api         NestJS modules for products, Open Food Facts, subscriptions
packages/shared  Environment schemas and constants shared by both apps, no server secrets
prisma           Schema, migrations, and demo-user seed
scripts          One-off local tooling (e.g. the MySQL dev-privilege grant)
docs             Assignment and build plan
```

Local MySQL runs through Docker Compose. Business logic stays in backend services, and Open Food Facts responses will be mapped in dedicated adapters rather than passed through once search is implemented.

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

The Stripe values in `apps/api/.env.example` are placeholders; they're only required once billing is implemented.

## Security

Stripe secret keys, webhook secrets, and database credentials stay on the backend and are never committed. Only `.env.example` templates are tracked. Nutrition access will be authorized on the server on every request; a successful Stripe checkout redirect alone will never grant it.

## Scope

One shared demo user, with no registration or full authentication flow. A single monthly subscription price, with no tiers or billing portal. Open Food Facts remains the only product source; there is no catalog import or machine translation of product data. Deployment is out of scope for now.

## Documentation

- [Technical assignment](docs/open-food-technical-assignment.pdf) — source requirements
- [Build plan](docs/build-plan.md) — architecture decisions and implementation sequence
