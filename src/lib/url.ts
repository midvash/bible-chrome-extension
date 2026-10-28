import { SITE_BASE, type Locale } from '../types';
import { urlLocaleSegment } from './locale';

/**
 * URL canônica do leitor no midvash.com.
 *
 * Já no formato final, sem 301 no caminho (`/3/16` redireciona pra `/3#v=16`):
 *   - capítulo inteiro:        /{loc}/{ver}/{book}/{chapter}
 *   - versículo único:         /{loc}/{ver}/{book}/{chapter}#v={verse}
 *   - intervalo de versículos: /{loc}/{ver}/{book}/{chapter}#v={start}-{end}
 *
 * `bookSlug` é o slug do livro no idioma (`joao`, não `john`), senão o site
 * redireciona. Inglês é locale padrão, sem prefixo.
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
  let hash = '';
  if (verseStart) {
    hash =
      verseEnd && verseEnd !== verseStart
        ? `#v=${verseStart}-${verseEnd}`
        : `#v=${verseStart}`;
  }
  return `${SITE_BASE}${seg}/${version}/${bookSlug}/${chapter}${hash}`;
}
