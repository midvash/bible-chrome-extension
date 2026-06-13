import { SITE_BASE, type Locale } from '../types';
import { urlLocaleSegment } from './locale';

/**
 * URL canônica do leitor no midvash.com.
 *
 * Formato suportado pelo route `[locale]/[version]/[book]/[chapter]/[[...verse]]`:
 *   - capítulo inteiro:        /{loc}/{ver}/{book}/{chapter}
 *   - versículo único:         /{loc}/{ver}/{book}/{chapter}/{verse}
 *   - intervalo de versículos: /{loc}/{ver}/{book}/{chapter}/{start}-{end}
 *
 * Inglês é locale padrão, sem prefixo.
 */
export function readerUrl(
  locale: Locale,
  version: string,
  bookSlug: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): string {
  const seg = urlLocaleSegment(locale);
  let versePath = '';
  if (verseStart) {
    versePath =
      verseEnd && verseEnd !== verseStart
        ? `/${verseStart}-${verseEnd}`
        : `/${verseStart}`;
  }
  return `${SITE_BASE}${seg}/${version}/${bookSlug}/${chapter}${versePath}`;
}
