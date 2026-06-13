import type { BookEntry, Locale, ParsedReference } from '../types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface BookLookup {
  pattern: RegExp;
  bookByMatch: Map<string, BookEntry>;
  locale: Locale;
}

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
function addRomanVariants(bookByMatch: Map<string, BookEntry>): void {
  const romanFor: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii' };
  for (const [key, book] of Array.from(bookByMatch.entries())) {
    const m = /^([123])\s+(.+)$/.exec(key);
    if (!m) continue;
    const roman = romanFor[m[1]];
    const variant = `${roman} ${m[2]}`;
    if (!bookByMatch.has(variant)) bookByMatch.set(variant, book);
  }
}

/**
 * Constrói regex e lookup table com nomes/abreviações de livros.
 * Inclui o locale primário + en (fallback comum em sites multilíngues).
 */
export function buildLookup(books: BookEntry[], locale: Locale): BookLookup {
  const bookByMatch = new Map<string, BookEntry>();
  const localesToInclude: Locale[] = locale === 'en' ? ['en'] : [locale, 'en'];

  for (const book of books) {
    for (const loc of localesToInclude) {
      const variants = [book.name[loc], book.abbrev[loc], book.slug[loc]];
      for (const variant of variants) {
        if (!variant) continue;
        const key = variant.toLowerCase();
        if (!bookByMatch.has(key)) bookByMatch.set(key, book);
      }
    }
  }
  addRomanVariants(bookByMatch);

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
        `${WS}*[:.\\u00b7]${WS}*([${VERSE_CHUNK_INNER}]+)` +
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
    const book = lookup.bookByMatch.get(bookStr.toLowerCase());
    if (!book) continue;
    const chapter = parseInt(chapterStr, 10);
    if (chapter < 1 || chapter > book.chapters) continue;

    const bookSlug = book.slug[lookup.locale] ?? book.slug.en;
    const bookName = book.name[lookup.locale] ?? book.name.en;
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
