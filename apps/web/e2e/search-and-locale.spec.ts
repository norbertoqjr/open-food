import { expect, test } from '@playwright/test';

// Deterministic fixtures for the API this page calls — not Open Food Facts
// directly, but the same boundary: real upstream data changes over time and
// would make this test flaky. Two products with a locale-dependent name let
// the language-switch assertion prove a fresh request actually went out
// with the new locale, not just that translated chrome re-rendered.
const SEARCH_RESULTS_BY_LOCALE: Record<string, { id: string; name: string }> = {
  en: { id: '123', name: 'Nutella' },
  fr: { id: '123', name: 'Nutella FR' },
};
const BRAND = 'Ferrero';

test.beforeEach(async ({ page }) => {
  await page.route('**/recent-searches', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/products/search*', async (route) => {
    const url = new URL(route.request().url());
    const locale = url.searchParams.get('locale') ?? 'en';
    const product = SEARCH_RESULTS_BY_LOCALE[locale] ?? SEARCH_RESULTS_BY_LOCALE.en;

    await route.fulfill({
      json: {
        items: [{
          id: product.id, name: product.name, brand: BRAND, imageUrl: null,
        }],
        page: 1,
        pageSize: 10,
        total: 1,
      },
    });
  });
});

test('searching shows a result card, and switching language re-fetches localized names', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Open Food' })).toBeVisible();

  await page.getByLabel('Search packaged foods').fill('nutella');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('Nutella', { exact: true })).toBeVisible();

  // The locale selector is a row of buttons (EN/NL/DE/FR), not a native
  // <select> — this project's Base UI registry has no working Form/Select
  // wrapper (see the shadcn-nextjs skill), so a plain button group is what
  // actually ships.
  await page.getByRole('button', { name: 'FR', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Rechercher', exact: true })).toBeVisible();
  await expect(page.getByText('Nutella FR', { exact: true })).toBeVisible();
});

test('a blank query is rejected client-side with a translated error, no request sent', async ({
  page,
}) => {
  let searchRequested = false;
  await page.route('**/products/search*', async (route) => {
    searchRequested = true;
    await route.continue();
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  await expect(page.getByText('Enter a search term.')).toBeVisible();
  expect(searchRequested).toBe(false);
});
