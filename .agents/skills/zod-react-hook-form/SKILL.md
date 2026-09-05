---
name: zod-react-hook-form
description: Implement Open Food forms and request validation with Zod and React Hook Form. Use when building or editing search forms, shared input schemas, API validation, or localized form errors in this project.
---

# Zod and React Hook Form

Use Zod for runtime validation and React Hook Form for frontend forms, including product search. Connect them through `zodResolver` from `@hookform/resolvers/zod`. Check installed versions and compatibility before adding dependencies.

- Keep reusable input schemas in `packages/shared`; infer TypeScript types from schemas. Keep environment schemas and secrets in the backend.
- Validate Express query parameters, route parameters, and request bodies on the server even when the frontend validates them. Use parsed values downstream and return structured field errors for invalid requests.
- Define search trimming, nonempty query rules, supported locales, and pagination bounds explicitly. Handle empty strings deliberately when coercing numeric inputs.
- Use React Hook Form inside Next.js client components. Submit through `handleSubmit`, provide default values, and show pending and request-error states. Use native input registration unless a controlled component requires `Controller`.
- If a schema transforms values, distinguish schema input and output types so form values and submission data remain correctly typed.
- Translate validation messages for English, Dutch, German, and French. Map stable error codes to interface translations; avoid global locale mutation on the server. Refresh visible validation messages after a language change.
- Associate field errors with their inputs and preserve entered values after failed requests.
- Keep subscription authorization on the backend; successful input validation never grants nutrition access.
- Test meaningful behavior: whitespace-only searches, invalid pagination/locales, localized errors, and server rejection of invalid requests that bypass the form.

Consult the official [Zod basics](https://zod.dev/basics) and [React Hook Form resolvers documentation](https://github.com/react-hook-form/resolvers) for version-specific syntax.
