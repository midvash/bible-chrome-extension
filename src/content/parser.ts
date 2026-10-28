import type { BookEntry, Locale, ParsedReference } from '../types';
import { AMBIGUOUS_NAMES, BOOK_ALIASES } from './book-aliases';
import { maxVerse } from './verse-counts';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Como a chave entrou no lookup. `abbrev` curta (até 3 letras) e nome
 * ambíguo exigem mais do texto pra virar link (ver `needsVerse`).
 */
type MatchKind = 'name' | 'abbrev';

interface LookupEntry {
  book: BookEntry;
  kind: MatchKind;
}

interface BookLookup {
  pattern: RegExp;
  bookByMatch: Map<string, LookupEntry>;
  locale: Locale;
}

/**
 * Idiomas em que a vírgula separa capítulo e versículo ("Joh 3,16",
 * "Gv 3,16-18").
 */
const COMMA_SEPARATOR_LOCALES: ReadonlySet<Locale> = new Set(['de', 'it']);

// Whitespace estendido: espaço comum, NBSP ( ) e narrow NBSP ( ).
// Tipografia em pt-br/fr usa NBSP entre nome do livro e número do capítulo.
const WS_INNER = '\\s\\u00a0\\u202f';
const WS = `[${WS_INNER}]`;

// Caracteres aceitos dentro de uma lista de versos: dígitos, vírgulas, espaços
// (incl. NBSP) e traços (ASCII + en/em dash).
const VERSE_CHUNK_INNER = `\\d,${WS_INNER}\\u2013\\u2014\\-`;

// Traços aceitos como separador de intervalo (ASCII hyphen + en/em dash).
const DASH = '[\\u2013\\u2014\\-]';

// "Letra ou dígito" Unicode — usado em look-around pra simular `\b` que
// funcione com acentos. Chrome 88+ suporta look-behind variável.
const LETTER_OR_DIGIT = '[\\p{L}\\p{N}]';

/** Quantas letras a chave tem (dígito e espaço não contam): "1 Co" = 2. */
function letterCount(key: string): number {
  return (key.match(/\p{L}/gu) ?? []).length;
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Regex compartilhado pra reconhecer um item da lista de versos: "16" ou "16-18". */
const ITEM_RE = new RegExp(`^(\\d{1,3})(?:${WS}*${DASH}${WS}*(\\d{1,3}))?$`);

/** Regex pra encontrar o primeiro item dentro do chunk (com WS opcional na frente). */
const FIRST_ITEM_RE = new RegExp(`^${WS}*(\\d{1,3}(?:${WS}*${DASH}${WS}*\\d{1,3})?)`);

/** Regex pra encontrar próximo item após vírgula. */
const NEXT_ITEM_RE = new RegExp(`^${WS}*,${WS}*(\\d{1,3}(?:${WS}*${DASH}${WS}*\\d{1,3})?)`);

/**
 * Adiciona variantes com algarismos romanos (I/II/III) pros livros que começam
 * com "1 " / "2 " / "3 " — cobre "I Reis", "II Coríntios", "III João" etc.
 * O regex principal é case-insensitive, então pega "II", "ii", "Ii".
 */
function addNumberedVariants(bookByMatch: Map<string, LookupEntry>): void {
  const romanFor: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii' };
  for (const [key, entry] of Array.from(bookByMatch.entries())) {
    // "1co" → "1 co": a API abrevia colado, o texto costuma ter espaço.
    const glued = /^([123])(\p{L}.*)$/u.exec(key);
    const m = /^([123])\s+(.+)$/.exec(key) ?? glued;
    if (!m) continue;
    const variants = [`${romanFor[m[1]]} ${m[2]}`, `${m[1]}. ${m[2]}`];
    if (glued) variants.push(`${m[1]} ${m[2]}`);
    for (const variant of variants) {
      if (!bookByMatch.has(variant)) bookByMatch.set(variant, entry);
    }
  }
}

/**
 * Constrói regex e lookup table com nomes/abreviações de livros.
 * Inclui o locale primário + en (fallback comum em sites multilíngues).
 */
export function buildLookup(books: BookEntry[], locale: Locale): BookLookup {
  const bookByMatch = new Map<string, LookupEntry>();
  const localesToInclude: Locale[] = locale === 'en' ? ['en'] : [locale, 'en'];
  const byId = new Map(books.map((b) => [b.id, b]));

  // A primeira chave registrada ganha, então a ordem é a prioridade: nome,
  // apelido e abreviação antes do nome sem acento e do slug. Em pt-br o slug
  // de Jó é "jo", que é a abreviação de João: "Jo 3:16" tem que ser João.
  const add = (variant: string | undefined, book: BookEntry, kind: MatchKind) => {
    if (!variant) return;
    const key = variant.toLowerCase();
    if (bookByMatch.has(key)) return;
    bookByMatch.set(key, { book, kind });
  };
  for (const loc of localesToInclude) for (const b of books) add(b.name[loc], b, 'name');
  for (const loc of localesToInclude) {
    for (const [alias, id] of Object.entries(BOOK_ALIASES[loc] ?? {})) {
      const b = byId.get(id);
      if (b) add(alias, b, letterCount(alias) <= 3 ? 'abbrev' : 'name');
    }
  }
  for (const loc of localesToInclude) for (const b of books) add(b.abbrev[loc], b, 'abbrev');
  for (const loc of localesToInclude) for (const b of books) add(stripAccents(b.name[loc] ?? ''), b, 'name');
  for (const loc of localesToInclude) {
    for (const b of books) {
      const slug = b.slug[loc];
      // Slug com hífen ("1-corintios") nunca aparece assim no texto.
      if (slug && !slug.includes('-')) add(slug, b, letterCount(slug) <= 3 ? 'abbrev' : 'name');
    }
  }
  addNumberedVariants(bookByMatch);
  const separators = COMMA_SEPARATOR_LOCALES.has(locale) ? ':.\\u00b7,' : ':.\\u00b7';

  // Mais longos primeiro pra evitar match parcial (ex: "1 João" antes de "João")
  const alternatives = Array.from(bookByMatch.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');

  // Estrutura:
  //   <book>[.?]<WS+>(cap.|ch.|chap. opcional)<chapter>
  //     (?:
  //         <WS*[:.·]WS*><verseChunk>     ← lista/range de versos
  //       |
  //         <WS*<dash>WS*><chapterEnd>    ← intervalo cap-cap (sem `:`)
  //     )?
  //
  // Alternation mutuamente exclusiva evita o backtrack que rouba o último
  // dígito do verseChunk pro grupo de intervalo de capítulo (ex: "3:16-18"
  // não deve virar chapter=3, verseStart=16, chapterEnd=18).
  //
  // Boundary Unicode via look-around (substitui `\b` ASCII-only com flag `u`).
  // Flag `d` habilita `m.indices` pra extrair posição exata de cada grupo.
  const pattern = new RegExp(
    `(?<!${LETTER_OR_DIGIT})(${alternatives})\\.?${WS}+` +
      `(?:(?:cap\\.|ch\\.|chap\\.)${WS}*)?(\\d{1,3})` +
      `(?:` +
        `${WS}*[${separators}]${WS}*(\\d(?:[${VERSE_CHUNK_INNER}]*\\d)?)` +
      `|` +
        `${WS}*${DASH}${WS}*(\\d{1,3})` +
      `)?` +
      `(?!${LETTER_OR_DIGIT})`,
    'gidu',
  );

  return { pattern, bookByMatch, locale };
}

export interface Match {
  ref: ParsedReference;
  start: number;
  end: number;
}

/**
 * Parseia o "chunk" de versos depois do `:` em pares start/end.
 * Aceita: "16", "16-18", "16,17", "16, 19-21", "16,17,19-21".
 * Ignora itens malformados silenciosamente.
 */
export function parseVerseList(raw: string): Array<{ start: number; end: number }> {
  const items = raw.split(/,/).map((s) => s.trim()).filter(Boolean);
  const ranges: Array<{ start: number; end: number }> = [];
  for (const item of items) {
    const m = ITEM_RE.exec(item);
    if (!m) continue;
    const start = parseInt(m[1], 10);
    const end = m[2] ? parseInt(m[2], 10) : start;
    if (start < 1 || end < start) continue;
    ranges.push({ start, end });
  }
  return ranges;
}

export function findMatches(text: string, lookup: BookLookup): Match[] {
  const matches: Match[] = [];
  lookup.pattern.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = lookup.pattern.exec(text)) !== null) {
    const [full, bookStr, chapterStr, verseChunk] = m;
    const entry = lookup.bookByMatch.get(bookStr.toLowerCase());
    if (!entry) continue;
    const { book } = entry;
    const chapter = parseInt(chapterStr, 10);
    if (chapter < 1 || chapter > book.chapters) continue;
    if (!verseChunk && needsVerse(entry, bookStr)) continue;
    if (entry.kind === 'abbrev' && !startsUpper(bookStr)) continue;

    const bookSlug = book.slug[lookup.locale] || book.slug.en;
    const bookName = book.name[lookup.locale] || book.name.en;
    const indices = (m as unknown as { indices?: Array<[number, number] | undefined> })
      .indices;

    // Sem verseChunk = capítulo inteiro (com ou sem intervalo cap-cap).
    if (!verseChunk) {
      matches.push({
        ref: {
          bookId: book.id,
          bookSlug,
          bookName,
          chapter,
          verseStart: undefined,
          verseEnd: undefined,
          matchedText: full,
        },
        start: m.index,
        end: m.index + full.length,
      });
      continue;
    }

    const ranges = parseVerseList(verseChunk);
    if (ranges.length === 0) continue;
    // "Gn 50:999": versículo que o capítulo não tem não vira link.
    const limit = maxVerse(book.id, chapter);
    if (limit !== undefined && ranges.some((r) => r.end > limit)) continue;

    // Posição do verseChunk no texto bruto (grupo 3 do regex).
    const verseChunkIndices = indices?.[3];
    const verseChunkStart = verseChunkIndices?.[0] ?? -1;

    if (ranges.length === 1 || verseChunkStart < 0) {
      // 1 range OU sem indices — comportamento clássico: 1 anchor cobrindo tudo.
      const r = ranges[0];
      matches.push({
        ref: {
          bookId: book.id,
          bookSlug,
          bookName,
          chapter,
          verseStart: r.start,
          verseEnd: r.end !== r.start ? r.end : r.start,
          matchedText: full,
        },
        start: m.index,
        end: m.index + full.length,
      });
      continue;
    }

    // 2+ ranges: anchor #1 cobre "<book> <ch>:<range[0]>", os demais cobrem
    // só seu próprio range dentro de verseChunk.
    const firstRange = ranges[0];
    const firstItemEndInChunk = findFirstItemEnd(verseChunk);
    const firstAnchorEnd =
      firstItemEndInChunk >= 0 ? verseChunkStart + firstItemEndInChunk : m.index + full.length;

    matches.push({
      ref: {
        bookId: book.id,
        bookSlug,
        bookName,
        chapter,
        verseStart: firstRange.start,
        verseEnd: firstRange.end !== firstRange.start ? firstRange.end : firstRange.start,
        matchedText: text.slice(m.index, firstAnchorEnd),
      },
      start: m.index,
      end: firstAnchorEnd,
    });

    let cursor = firstItemEndInChunk;
    for (let i = 1; i < ranges.length; i++) {
      const itemRange = findNextItem(verseChunk, cursor);
      if (!itemRange) break;
      const r = ranges[i];
      const itemStart = verseChunkStart + itemRange.start;
      const itemEnd = verseChunkStart + itemRange.end;
      matches.push({
        ref: {
          bookId: book.id,
          bookSlug,
          bookName,
          chapter,
          verseStart: r.start,
          verseEnd: r.end !== r.start ? r.end : r.start,
          matchedText: text.slice(itemStart, itemEnd),
        },
        start: itemStart,
        end: itemEnd,
      });
      cursor = itemRange.end;
    }
  }
  return matches;
}

/**
 * Abreviação curta ("Os", "Am", "Mar") e nome que também é palavra comum
 * ("Job", "Mark") só viram link com `:versículo`: "os 13 alunos", "Am 5. Mai"
 * e "Job 2 offer" ficam como estão. Mesma regra do plugin WordPress.
 */
function needsVerse(entry: LookupEntry, matched: string): boolean {
  if (entry.kind === 'abbrev') return letterCount(matched) <= 3;
  return AMBIGUOUS_NAMES.has(matched.toLowerCase());
}

/**
 * Abreviação só vale com a primeira letra maiúscula ("at 10:30" não é Atos).
 * Escrita sem caixa (chinês, coreano) passa direto.
 */
function startsUpper(matched: string): boolean {
  const first = /\p{L}/u.exec(matched)?.[0];
  return !first || first === first.toUpperCase();
}

/** Acha o fim (exclusivo) do primeiro item de lista de versos, no chunk. */
function findFirstItemEnd(chunk: string): number {
  const m = FIRST_ITEM_RE.exec(chunk);
  if (!m) return -1;
  return m[0].length;
}

/**
 * Encontra o próximo item (após vírgula) no chunk a partir de `fromIndex`.
 * Retorna {start, end} relativos ao chunk, ou null se não houver.
 */
function findNextItem(chunk: string, fromIndex: number): { start: number; end: number } | null {
  const rest = chunk.slice(fromIndex);
  const m = NEXT_ITEM_RE.exec(rest);
  if (!m) return null;
  const itemOffset = m[0].indexOf(m[1]);
  return {
    start: fromIndex + itemOffset,
    end: fromIndex + itemOffset + m[1].length,
  };
}
