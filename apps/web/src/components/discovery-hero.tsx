'use client';

import { useLocale } from '@/lib/locale-context';

interface DiscoveryHeroProps {
  // Once results are on screen the hero shrinks to a heading: the spec asks
  // for the full pitch on arrival only, so results are not pushed below the
  // fold on every subsequent search.
  compact: boolean;
}

export function DiscoveryHero({ compact }: DiscoveryHeroProps) {
  const { t } = useLocale();

  if (compact) {
    return (
      <h1 className="type-section text-balance">
        {t.heroHeadingLead}
        {' '}
        <span className="text-brand">{t.heroHeadingAccent}</span>
      </h1>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="type-hero text-balance">
        {t.heroHeadingLead}
        {' '}
        {/* The one emphasised phrase on the page. Colour alone is not
            carrying meaning here -- it is emphasis, and the sentence reads
            identically without it. */}
        <span className="text-brand">{t.heroHeadingAccent}</span>
      </h1>
      <p className="max-w-[52ch] text-pretty text-base leading-relaxed text-muted-foreground">
        {t.heroDescription}
      </p>
    </div>
  );
}
