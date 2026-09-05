---
name: shadcn-nextjs
description: Build the Open Food web interface with shadcn/ui components on Next.js and Tailwind. Use when creating or editing search, product, subscription, and layout UI, adding a component, or theming the frontend.
---

# shadcn/ui on Next.js

Use shadcn/ui for `apps/web` interface primitives. Components are generated into the repository and owned as project source, not consumed as a dependency: add one with `npx shadcn@latest add <component>`, then edit the generated file directly rather than wrapping it to work around defaults. Verify current component APIs before use; the registry changes independently of this project.

- Initialize once with `npx shadcn@latest init`, committing `components.json`. Keep generated primitives under `apps/web/components/ui` and project compositions (search form, result card, nutrition panel) in sibling directories so regenerating a primitive never overwrites project logic.
- Prefer composing existing primitives over installing near-duplicates. Add only components a screen actually renders; an unused primitive is still code to review and maintain.
- Build forms with the shadcn `Form` components, which wrap React Hook Form. Supply the schema through `zodResolver` and follow the project [Zod and React Hook Form skill](../zod-react-hook-form/SKILL.md) for schema placement and error handling; the two skills describe one form stack, not two.
- Never hardcode user-facing strings in a component. Take every label, placeholder, empty state, and error from the locale dictionaries for English, Dutch, German, and French, and pass them as props or read them from the locale context so a language change re-renders correctly.
- Theme through the Tailwind CSS variables that `init` generates. Change design tokens in one place instead of adding per-component color classes, and keep the palette legible in both themes.
- Render loading, empty, and error states explicitly for search and product views. Use `Skeleton` for pending data rather than a layout that collapses and reflows.
- Treat nutrition UI as gated: components must render a subscribe prompt when entitlement is absent and must never receive nutrition data they are not permitted to show. A successful checkout redirect is not proof of access; reflect backend-confirmed status only.
- Preserve the accessibility the underlying Radix primitives provide. Keep labels associated with controls, keep dialogs and menus keyboard-navigable, and do not strip focus styling. Verify tab order on search, product detail, and subscription flows.
- Keep layouts responsive from a mobile-first baseline; result grids and product detail must reflow without horizontal scrolling.

The official [shadcn MCP server](https://ui.shadcn.com/docs/mcp) (`npx shadcn@latest mcp init --client claude`) lets an agent browse and install registry components directly. Consult the [shadcn/ui documentation](https://ui.shadcn.com/docs) for component APIs and the current Next.js installation guide.
