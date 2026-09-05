import { Injectable, Logger } from '@nestjs/common';
import type { Locale } from '@open-food/shared';

const TAXONOMY_BASE_URL = 'https://world.openfoodfacts.org';
const USER_AGENT = 'OpenFood/1.0 (open-food-technical-assignment)';
const REQUEST_TIMEOUT_MS = 4000;

export type TagType = 'categories' | 'labels' | 'countries' | 'allergens';

interface TaxonomyEntry {
  name?: Partial<Record<Locale, string>>;
}

/**
 * Translates Open Food Facts taxonomy tags ("en:rolled-oats") into the
 * requested language ("Haferflocken").
 *
 * Product responses only ever carry canonical English tag ids, so category,
 * label, country and allergen lists stayed English no matter which language
 * the user picked. The translations do exist -- just behind a separate
 * taxonomy endpoint, one request per tag type.
 *
 * Results are memoised for the life of the process. The taxonomy is
 * effectively static reference data, so this collapses to zero network calls
 * after the first product that mentions a given tag, which is what keeps the
 * extra lookup off the critical path for repeat views.
 */
@Injectable()
export class TaxonomyService {
  private readonly logger = new Logger(TaxonomyService.name);

  private readonly cache = new Map<string, string | null>();

  /**
   * Returns display names for `tags`, in `locale` where a translation exists.
   * Never throws and never returns fewer entries than it was given: a failed
   * lookup falls back to the caller's own humanised English, so a taxonomy
   * outage degrades the language of a label rather than the page.
   */
  async translate(
    tagType: TagType,
    tags: string[],
    locale: Locale,
    fallback: (tag: string) => string,
  ): Promise<string[]> {
    if (tags.length === 0) return [];

    const missing = tags.filter(
      (tag) => !this.cache.has(TaxonomyService.key(tagType, tag, locale)),
    );
    if (missing.length > 0) {
      await this.fetchInto(tagType, missing, locale);
    }

    return tags.map(
      (tag) => this.cache.get(TaxonomyService.key(tagType, tag, locale)) || fallback(tag),
    );
  }

  private static key(tagType: TagType, tag: string, locale: Locale): string {
    return `${tagType}|${locale}|${tag}`;
  }

  private async fetchInto(tagType: TagType, tags: string[], locale: Locale): Promise<void> {
    const url = new URL('/api/v2/taxonomy', TAXONOMY_BASE_URL);
    url.searchParams.set('tagtype', tagType);
    url.searchParams.set('tags', tags.join(','));
    url.searchParams.set('lc', locale);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Taxonomy lookup responded with ${response.status}`);
      }

      const data = (await response.json()) as Record<string, TaxonomyEntry>;

      // Cache the misses too, so an untranslated tag is not re-requested on
      // every subsequent product that mentions it.
      tags.forEach((tag) => {
        this.cache.set(
          TaxonomyService.key(tagType, tag, locale),
          data[tag]?.name?.[locale]?.trim() || null,
        );
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Taxonomy lookup failed for ${tagType} (${locale}); using canonical names: ${reason}`,
      );
      // Deliberately not cached: a transient failure should not pin these
      // tags to English for the rest of the process's life.
    } finally {
      clearTimeout(timeout);
    }
  }
}
