export type Locale =
  | 'en'
  | 'pt-br'
  | 'es'
  | 'de'
  | 'fr'
  | 'it'
  | 'zh'
  | 'ru'
  | 'ko';

export const SUPPORTED_LOCALES: Locale[] = [
  'en',
  'pt-br',
  'es',
  'de',
  'fr',
  'it',
  'zh',
  'ru',
  'ko',
];

export interface BookEntry {
  id: number;
  name: Record<Locale, string>;
  slug: Record<Locale, string>;
  abbrev: Record<Locale, string>;
  chapters: number;
  testament: 'old' | 'new';
  category: string;
}

export interface VersionEntry {
  slug: string;
  name: string;
  shortName: string;
  language: string;
  hasOldTestament: boolean;
  hasNewTestament: boolean;
  totalBooks: number;
  totalChapters: number;
}

export interface VerseResponse {
  data: {
    version: string;
    book: string;
    bookName: string;
    chapter: number;
    verse?: number;
    verseEnd?: number;
    text?: string;
    verses: string[];
  };
  meta: {
    reference: string;
    total: number;
    cached?: boolean;
  };
}

export interface ParsedReference {
  bookId: number;
  bookSlug: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  matchedText: string;
}

/** Onde os links da extensão abrem por padrão. */
export type OpenTarget = 'tab' | 'sidePanel';

export interface ExtensionPrefs {
  enabled: boolean;
  showTooltip: boolean;
  blacklist: string[];
  versionByLocale: Partial<Record<Locale, string>>;
  /**
   * Versão secundária mostrada lado a lado no tooltip pra comparação.
   * `null` (ou ausente) = sem comparação. Persistido por locale pra que
   * o usuário não precise reescolher entre páginas.
   */
  compareVersionByLocale?: Partial<Record<Locale, string | null>>;
  /**
   * Onde abrir as referências detectadas ao clicar.
   * - `tab` (default): nova aba no midvash.com.
   * - `sidePanel`: painel lateral do Chrome com mini-reader que consome a
   *   API pública (sem depender de iframe do midvash.com).
   * Modificadores no click sempre sobrescrevem: Shift = nova aba,
   * Alt = side panel.
   */
  openIn?: OpenTarget;
}

export const DEFAULT_VERSIONS: Record<Locale, string> = {
  en: 'kjv',
  'pt-br': 'nvi',
  es: 'rvr1960',
  de: 'luth1912',
  fr: 'lsg',
  it: 'rivedut',
  zh: 'cuv',
  ru: 'synodal',
  ko: 'krv',
};

export const DEFAULT_PREFS: ExtensionPrefs = {
  enabled: true,
  showTooltip: true,
  blacklist: [],
  versionByLocale: { ...DEFAULT_VERSIONS },
  compareVersionByLocale: {},
  openIn: 'tab',
};

export const STORAGE_KEYS = {
  books: 'midvash:books',
  booksFetchedAt: 'midvash:booksFetchedAt',
  versions: 'midvash:versions',
  versionsFetchedAt: 'midvash:versionsFetchedAt',
  prefs: 'midvash:prefs',
} as const;

export const API_BASE = 'https://api.midvash.com/v1';
export const SITE_BASE = 'https://midvash.com';
export const BOOKS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Domínios em que a extensão NUNCA deve rodar, mesmo que o usuário tente
 * remover do blacklist. São os próprios destinos do Midvash — a extensão
 * existe pra trazer pessoas pra eles, não pra rodar dentro.
 *
 * Combina match exato + subdomínios (`.midvash.com` cobre www, blog, api, etc).
 */
export const ALWAYS_BLOCKED_HOSTS: readonly string[] = [
  'midvash.com',
  'midvash.app',
];
