import { TaxonomyService } from './taxonomy.service.js';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

const humanize = (tag: string) => tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');

describe('TaxonomyService', () => {
  let service: TaxonomyService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new TaxonomyService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the translation for the requested locale', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:rolled-oats': { name: { en: 'Rolled oats', de: 'Haferflocken' } },
      'en:breakfasts': { name: { de: 'Frühstücke' } },
    }));

    const result = await service.translate(
      'categories',
      ['en:rolled-oats', 'en:breakfasts'],
      'de',
      humanize,
    );

    expect(result).toEqual(['Haferflocken', 'Frühstücke']);
  });

  it('preserves the order it was given', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:b': { name: { de: 'Bee' } },
      'en:a': { name: { de: 'Ay' } },
    }));

    expect(await service.translate('labels', ['en:a', 'en:b'], 'de', humanize))
      .toEqual(['Ay', 'Bee']);
  });

  it('falls back for a tag the taxonomy has no translation for', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:green-dot': { name: { en: 'Green Dot' } },
    }));

    expect(await service.translate('labels', ['en:green-dot'], 'de', humanize))
      .toEqual(['green dot']);
  });

  it('falls back, rather than failing, when the taxonomy is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    // A taxonomy outage must degrade the language of a label, not the page.
    expect(await service.translate('countries', ['en:germany'], 'de', humanize))
      .toEqual(['germany']);
  });

  it('falls back on a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));

    expect(await service.translate('allergens', ['en:gluten'], 'fr', humanize))
      .toEqual(['gluten']);
  });

  it('caches hits, so a repeated tag costs no second request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:gluten': { name: { de: 'Gluten' } },
    }));

    await service.translate('allergens', ['en:gluten'], 'de', humanize);
    await service.translate('allergens', ['en:gluten'], 'de', humanize);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches misses too, so an untranslated tag is not re-requested', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ 'en:fsc': { name: { en: 'FSC' } } }));

    await service.translate('labels', ['en:fsc'], 'de', humanize);
    await service.translate('labels', ['en:fsc'], 'de', humanize);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure, so a transient outage is retried', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    await service.translate('countries', ['en:germany'], 'de', humanize);

    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:germany': { name: { de: 'Deutschland' } },
    }));

    expect(await service.translate('countries', ['en:germany'], 'de', humanize))
      .toEqual(['Deutschland']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps locales separate', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:gluten': { name: { de: 'Gluten-DE' } },
    }));
    await service.translate('allergens', ['en:gluten'], 'de', humanize);

    fetchMock.mockResolvedValueOnce(jsonResponse({
      'en:gluten': { name: { fr: 'Gluten-FR' } },
    }));

    expect(await service.translate('allergens', ['en:gluten'], 'fr', humanize))
      .toEqual(['Gluten-FR']);
  });

  it('makes no request for an empty tag list', async () => {
    expect(await service.translate('labels', [], 'de', humanize)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
