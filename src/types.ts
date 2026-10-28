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
    /**
     * Aviso de copyright da versão servida (título, detentor, licença), uma
     * informação por linha. Versões CC BY exigem o crédito junto do texto.
     */
    copyright?: string;
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
  'pt-br': 'onbv',
  es: 'rvr1909',
  de: 'luth1912',
  fr: 'lsg',
  it: 'riveduta',
  zh: 'cuv',
  ru: 'synodal',
  ko: 'kor',
};

/**
 * Slugs que a API não serve mais → o que ela serve no lugar.
 *
 * Em outubro de 2026 a api.midvash.com parou de servir versões sem licença
 * livre (NVI, RVR1960, NVT…): o pedido ainda dá 200, mas com o texto de uma
 * versão livre, e `data.version` diz qual veio. `rivedut` e `krv` eram
 * erros de digitação dos padrões antigos e davam 404. Usado pra migrar as
 * preferências salvas e o select de versão, que pode ter um slug velho.
 */
export const RETIRED_VERSIONS: Readonly<Record<string, string>> = {
  // Erros de digitação dos padrões da v1.1.0 (404 na API)
  rivedut: 'riveduta',
  krv: 'kor',
  // Português
  naa: 'almeida-livre',
  ara: 'almeida-livre',
  arc: 'alm1911',
  acf: 'almeida-livre',
  nvi: 'onbv',
  nvt: 'onbv',
  ntlh: 'onbv',
  as21: 'almeida-livre',
  jfaa: 'almeida-livre',
  kja: 'onbv',
  kjf: 'onbv',
  msgpt: 'onbv',
  nbv: 'onbv',
  aa: 'almeida-livre',
  // Inglês
  esv: 'bsb',
  niv: 'bsb',
  nkjv: 'kjv',
  nlt: 'bsb',
  msg: 'bsb',
  // Espanhol
  rvr1960: 'rvr1909',
  nvies: 'pdt',
  ntv: 'onbv-es',
};

/** A versão que a API serve pra `slug`: a substituta livre se ela saiu. */
export function servedVersion(slug: string): string {
  const key = slug.toLowerCase();
  return RETIRED_VERSIONS[key] ?? key;
}

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
