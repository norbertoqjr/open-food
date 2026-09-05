'use client';

import { useEffect } from 'react';
import { useLocale } from './locale-context';

// Keeps <html lang> in step with the selected language. The locale lives in
// localStorage, so the server cannot know it and renders the default; without
// this the attribute would stay "en" while the page displayed French, and a
// screen reader would pronounce it with English phonetics.
//
// Renders nothing -- it exists only for the side effect.
export function HtmlLang() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
