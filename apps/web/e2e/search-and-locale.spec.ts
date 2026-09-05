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

  // The header and the homepage banner both read subscription status. Pinning
  // it keeps the shell out of the assertions below.
  await page.route('**/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'demo-user',
        memberSince: '2026-01-01T00:00:00.000Z',
        subscription: { active: false, cancelAtPeriodEnd: false, currentPeriodEnd: null },
      },
    });
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

  // The page's one h1 is the hero, not the header wordmark: the wordmark is a
  // link home, and a page should carry a single top-level heading.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByLabel('Search packaged foods').fill('nutella');
  // The submit is a circular icon button, so it is addressed by its
  // accessible name rather than visible text.
  await page.getByRole('button', { name: 'Search products' }).click();

  await expect(page.getByText('Nutella', { exact: true })).toBeVisible();

  // A native <select>, chosen so touch devices get the platform picker.
  await page.getByLabel('Select language').selectOption('fr');

  await expect(page.getByRole('button', { name: 'Rechercher des produits' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Search products' }).click();

  await expect(page.getByText('Enter a search term.')).toBeVisible();
  expect(searchRequested).toBe(false);
});

test('the clear button empties the field and returns the page to its idle state', async ({
  page,
}) => {
  await page.goto('/');

  const field = page.getByLabel('Search packaged foods');
  await field.fill('nutella');
  await page.getByRole('button', { name: 'Search products' }).click();
  await expect(page.getByText('Nutella', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Clear search' }).click();

  await expect(field).toHaveValue('');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Search by product name or brand to see results here.'))
    .toBeVisible();
});
