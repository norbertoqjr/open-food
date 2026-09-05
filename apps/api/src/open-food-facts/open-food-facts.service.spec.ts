import { ServiceUnavailableException } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service.js';

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
    service = new OpenFoodFactsService();
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

      const result = await service.search('x', 1, 10);

      expect(result).toEqual({
        items: [{
          id: '123', name: null, brand: null, imageUrl: null,
        }],
        total: 1,
      });
    });

    it('joins multiple upstream brands into one display string', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ code: '123', brands: ['Ferrero', 'Nutella'] }],
        count: 1,
      }));

      const result = await service.search('x', 1, 10);

      expect(result.items[0]?.brand).toBe('Ferrero, Nutella');
    });

    it('drops hits with no barcode rather than surfacing an empty id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        hits: [{ product_name: 'No barcode' }, { code: '123' }],
        count: 2,
      }));

      const result = await service.search('x', 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('123');
    });

    it('returns an empty result for no matches rather than an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ hits: [], count: 0 }));

      const result = await service.search('zzzz', 1, 10);

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('turns upstream failure into a controlled 503, not a leaked error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down'));

      await expect(service.search('x', 1, 10)).rejects.toThrow(ServiceUnavailableException);
    });

    it('turns a non-OK upstream status into the same controlled 503', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));

      await expect(service.search('x', 1, 10)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('getProduct', () => {
    it('returns null when Open Food Facts reports the product missing', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ status: 0 }));

      expect(await service.getProduct('0000000000000')).toBeNull();
    });

    it('maps a found product to the public fields only', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({
        status: 1,
        product: {
          code: '123', product_name: 'Test', brands: 'Acme', image_url: 'https://img',
        },
      }));

      expect(await service.getProduct('123')).toEqual({
        id: '123', name: 'Test', brand: 'Acme', imageUrl: 'https://img',
      });
    });
  });
});
