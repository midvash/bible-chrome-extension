import { SUPPORTED_LOCALES, type Locale } from '../types';

export function detectPageLocale(): Locale {
  const htmlLang = document.documentElement.lang?.toLowerCase().trim() ?? '';
  return matchLocale(htmlLang) ?? 'en';
}

export function matchLocale(raw: string): Locale | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace('_', '-');
  if (SUPPORTED_LOCALES.includes(normalized as Locale)) {
    return normalized as Locale;
  }
  const base = normalized.split('-')[0];
  if (base === 'pt') return 'pt-br';
  if (base === 'zh') return 'zh';
  const direct = SUPPORTED_LOCALES.find((l) => l === base);
  return direct ?? null;
}

export function urlLocaleSegment(locale: Locale): string {
  // Inglês é locale padrão e NÃO leva prefixo /en em midvash.com
  return locale === 'en' ? '' : `/${locale}`;
}
