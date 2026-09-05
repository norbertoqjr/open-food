import { ServiceUnavailableException } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service.js';
import type { TaxonomyService } from './taxonomy.service.js';

// Stands in for the taxonomy endpoint by returning each tag's own fallback,
// so these tests assert the mapper's behaviour rather than translations.
// Translation itself is covered in taxonomy.service.spec.ts.
const passthroughTaxonomy = {
  translate: (
    _tagType: string,
    tags: string[],
    _locale: string,
    fallback: (tag: string) => string,
  ) => Promise.resolve(tags.map(fallback)),
} as unknown as TaxonomyService;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new OpenFoodFactsService(passthroughTaxonomy);
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('maps missing name, brand, and image to null rather than upstream defaults', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ code: '123' }],
        count: 1,
      }));
      // The image backfill runs for the hit with no image and finds none.
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 1, product: {} }));

      const result = await service.search('x', 1, 10, 'en');

      expect(result).toEqual({
        items: [{
          id: '123', name: null, brand: null, imageUrl: null,
        }],
        total: 1,
      });
    });

    it('backfills an image the search index is missing but the product API has', async () => {
      // Real gap: Search-a-licious carries no image data at all for some
      // products whose detail page shows a photo.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [
          { code: 'has-image', image_url: 'https://img/a.jpg' },
          { code: 'no-image' },
        ],
        count: 2,
      }));
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { image_url: 'https://img/b.jpg' },
      }));

      const result = await service.search('x', 1, 10, 'en');

      expect(result.items.map((i) => i.imageUrl))
        .toEqual(['https://img/a.jpg', 'https://img/b.jpg']);
      // Only the hit that needed one was fetched.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('makes no extra request when every hit already has an image', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ code: '123', image_url: 'https://img/a.jpg' }],
        count: 1,
      }));

      await service.search('x', 1, 10, 'en');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('asks once per product, then serves the answer from cache', async () => {
      // Includes "no photo anywhere", which is common: re-asking on every
      // search made a repeated query pay the round trip again.
      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123' }], count: 1 }));
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 1, product: {} }));
      await service.search('x', 1, 10, 'en');

      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123' }], count: 1 }));
      const again = await service.search('x', 1, 10, 'en');

      expect(again.items[0].imageUrl).toBeNull();
      // Two search calls, and only the first backfilled.
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not cache a failed backfill, so it is retried', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123' }], count: 1 }));
      fetchMock.mockRejectedValueOnce(new Error('network down'));
      await service.search('x', 1, 10, 'en');

      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123' }], count: 1 }));
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { image_url: 'https://img/b.jpg' },
      }));

      const again = await service.search('x', 1, 10, 'en');

      expect(again.items[0].imageUrl).toBe('https://img/b.jpg');
    });

    it('still returns results when the image backfill fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123' }], count: 1 }));
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      const result = await service.search('x', 1, 10, 'en');

      // A missing photo is not worth failing a search over.
      expect(result.items).toEqual([{
        id: '123', name: null, brand: null, imageUrl: null,
      }]);
    });

    it('joins multiple upstream brands into one display string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ code: '123', brands: ['Ferrero', 'Nutella'] }],
        count: 1,
      }));

      const result = await service.search('x', 1, 10, 'en');

      expect(result.items[0]?.brand).toBe('Ferrero, Nutella');
    });

    it('drops hits with no barcode rather than surfacing an empty id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ product_name: 'No barcode' }, { code: '123' }],
        count: 2,
      }));

      const result = await service.search('x', 1, 10, 'en');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('123');
    });

    it('returns an empty result for no matches rather than an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [], count: 0 }));

      const result = await service.search('zzzz', 1, 10, 'en');

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('turns upstream failure into a controlled 503, not a leaked error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      await expect(service.search('x', 1, 10, 'en')).rejects.toThrow(ServiceUnavailableException);
    });

    it('turns a non-OK upstream status into the same controlled 503', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));

      await expect(service.search('x', 1, 10, 'en')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getProduct', () => {
    it('returns null when Open Food Facts reports the product missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 0 }));

      expect(await service.getProduct('0000000000000', 'en')).toBeNull();
    });

    it('maps a found product to the public fields only', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123', product_name: 'Test', brands: 'Acme', image_url: 'https://img',
        },
      }));

      expect(await service.getProduct('123', 'en')).toEqual({
        id: '123',
        name: 'Test',
        brand: 'Acme',
        imageUrl: 'https://img',
        genericName: null,
        quantity: null,
        servingSize: null,
        ingredientsText: null,
        allergens: [],
        categories: [],
        labels: [],
        countries: [],
        novaGroup: null,
        ecoScore: null,
      });
    });

    it('humanizes taxonomy tags and drops upstream placeholder values', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          allergens_tags: ['en:milk', 'en:nuts'],
          labels_tags: ['en:palm-oil-free'],
          // A product with no category yields this literal, not an empty list.
          categories_tags: ['en:null'],
          ecoscore_grade: 'unknown',
          nova_group: 4,
        },
      }));

      const result = await service.getProduct('123', 'en');

      expect(result?.allergens).toEqual(['Milk', 'Nuts']);
      expect(result?.labels).toEqual(['Palm oil free']);
      expect(result?.categories).toEqual([]);
      expect(result?.ecoScore).toBeNull();
      expect(result?.novaGroup).toBe(4);
    });

    it('omits a generic name that merely repeats the product name', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', product_name: 'Nutella', generic_name: 'Nutella' },
      }));

      expect((await service.getProduct('123', 'en'))?.genericName).toBeNull();
    });

    it('prefers the requested locale for the generic name', async () => {
      // Shape of a real Hungarian product: the bare field is the submitter's
      // language, with a usable English translation alongside it.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          product_name_en: 'PORCI Snack - spicy',
          generic_name: 'Sertesborbol keszult pikans sult snack',
          generic_name_en: 'Spicy fried snack made of pork rind',
        },
      }));

      expect((await service.getProduct('123', 'en'))?.genericName)
        .toBe('Spicy fried snack made of pork rind');
    });

    it('omits a generic name that duplicates the name only in the resolved locale', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          product_name_fr: 'Pate a tartiner',
          generic_name: 'Hazelnut spread',
          generic_name_fr: 'Pate a tartiner',
        },
      }));

      expect((await service.getProduct('123', 'fr'))?.genericName).toBeNull();
    });

    it('omits a generic name that merely repeats the brand', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          product_name: 'Hazelnut Spread + Breadsticks',
          brands: 'Nutella',
          generic_name: 'Nutella',
        },
      }));

      expect((await service.getProduct('123', 'en'))?.genericName).toBeNull();
    });

    it('prefers the requested locale for ingredients', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          ingredients_text: 'sugar, palm oil',
          ingredients_text_fr: 'sucre, huile de palme',
        },
      }));

      expect((await service.getProduct('123', 'fr'))?.ingredientsText)
        .toBe('sucre, huile de palme');
    });

    it('prefers the requested locale over the generic and English names', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          product_name: 'Nutella',
          product_name_en: 'blueberry jam',
          product_name_fr: 'Nutella FR',
        },
      }));

      const result = await service.getProduct('123', 'fr');

      expect(result?.name).toBe('Nutella FR');
    });

    it('prefers a tagged English name over the untagged field', async () => {
      // The untagged product_name carries no language claim; a tagged English
      // one at least declares what it is.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', product_name: 'Haferflocken', product_name_en: 'Oat flakes' },
      }));

      expect((await service.getProduct('123', 'fr'))?.name).toBe('Oat flakes');
    });

    it('still names a product that only has the untagged field', async () => {
      // A name is an identifier: showing the wrong language beats showing
      // nothing, so unlike prose it keeps the untagged last resort.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', product_name: 'Haferflocken' },
      }));

      expect((await service.getProduct('123', 'en'))?.name).toBe('Haferflocken');
    });

    it('omits ingredients when none are tagged in the locale or English', async () => {
      // Real shape: the untagged field is a multilingual dump off the packaging,
      // and the only "en" keys are OCR artifacts, not a curated translation.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          ingredients_text: 'Hafervollkornflocken Kleinblatt\r\nPalnozarnesti oveseni yadki.',
          ingredients_text_de: 'Hafervollkornflocken Kleinblatt',
          ingredients_text_en_ocr_1746020332: '100 % wholemeal oat flakes',
        },
      }));

      // Not the German/Bulgarian blob, and not the OCR field either.
      expect((await service.getProduct('123', 'en'))?.ingredientsText).toBeNull();
    });

    it('omits a generic name when none is tagged in the locale or English', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', generic_name: 'Haferflocken Extra zart' },
      }));

      expect((await service.getProduct('123', 'en'))?.genericName).toBeNull();
    });

    it('never publishes the Nutri-Score grade through the free label list', async () => {
      // Upstream files the grade as a label too, sometimes two contradictory
      // ones at once. Publishing it here would give away what the
      // subscription gates.
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          labels_tags: [
            'en:nutriscore', 'en:nutriscore-grade-a', 'en:nutriscore-grade-c',
            'en:green-dot', 'en:source-of-fibre',
          ],
        },
      }));

      const labels = (await service.getProduct('123', 'en'))?.labels ?? [];

      expect(labels).toEqual(['Green dot', 'Source of fibre']);
      expect(labels.join(' ').toLowerCase()).not.toContain('nutriscore');
    });

    it('falls back to the generic name, then English, when the locale is missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', product_name_en: 'blueberry jam' },
      }));

      expect((await service.getProduct('123', 'fr'))?.name).toBe('blueberry jam');

      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123' },
      }));

      expect((await service.getProduct('123', 'fr'))?.name).toBeNull();
    });
  });

  describe('getNutrition', () => {
    it('maps the per-100g nutriments fields, defaulting basis to 100g', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123',
          nutriments: {
            'energy-kcal_100g': 539,
            fat_100g: 30.9,
            'saturated-fat_100g': 10.6,
            carbohydrates_100g: 57.5,
            sugars_100g: 56.3,
            proteins_100g: 6.3,
            salt_100g: 0.107,
          },
        },
      }));

      expect(await service.getNutrition('123')).toEqual({
        basis: '100g',
        energyKcal: 539,
        fat: 30.9,
        saturatedFat: 10.6,
        carbohydrates: 57.5,
        sugars: 56.3,
        fiber: null,
        proteins: 6.3,
        salt: 0.107,
        nutriScore: null,
      });
    });

    it('carries the Nutri-Score grade, which is subscriber-only', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: { code: '123', nutriments: { fat_100g: 30.9 }, nutriscore_grade: 'E' },
      }));

      expect((await service.getNutrition('123'))?.nutriScore).toBe('e');
    });

    it('returns null when the product has no nutriments at all', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 1, product: { code: '123' } }));

      expect(await service.getNutrition('123')).toBeNull();
    });

    it('returns null for an unknown product', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 0 }));

      expect(await service.getNutrition('0')).toBeNull();
    });
  });
});
