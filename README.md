# Open Food

A responsive search application for packaged foods, backed by [Open Food Facts](https://world.openfoodfacts.org/). Anyone can browse product names, brands, and images; detailed nutrition is available to users with an active subscription. The interface is available in English, Dutch, German, and French.

> **Status: planning.** No application code has been written yet. This repository currently holds the assignment, the build plan, and the agent skills that will guide implementation. The setup instructions below are deliberately absent rather than aspirational — they will be added as each part is built.

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

## Planned layout

```
apps/web         Next.js interface, locale dictionaries, search and product screens
apps/api         NestJS modules for products, Open Food Facts, subscriptions
packages/shared  API types and validation schemas, no server secrets
prisma           Schema, migrations, and demo-user seed
docs             Assignment and build plan
```

Local MySQL runs through Docker Compose. Business logic stays in backend services, and Open Food Facts responses are mapped in dedicated adapters rather than passed through.

## Getting started

Not yet available. Setup will cover installing dependencies, copying the three `.env.example` templates, starting MySQL, and running migrations and seeding, so that a single `npm run dev` starts the database and both applications.

See [the build plan](docs/build-plan.md) for the implementation sequence and what each milestone must satisfy.

## Security

Stripe secret keys, webhook secrets, and database credentials stay on the backend and are never committed. Only `.env.example` templates are tracked. Nutrition access is authorized on the server on every request; a successful Stripe checkout redirect alone never grants it.

## Scope

One shared demo user, with no registration or full authentication flow. A single monthly subscription price, with no tiers or billing portal. Open Food Facts remains the only product source; there is no catalog import or machine translation of product data. Deployment is out of scope for now.

## Documentation

- [Technical assignment](docs/open-food-technical-assignment.pdf) — source requirements
- [Build plan](docs/build-plan.md) — architecture decisions and implementation sequence
