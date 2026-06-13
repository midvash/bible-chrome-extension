/**
 * Bateria de testes manual pro parser. Rodar com:
 *   npm run test:parser
 *
 * Sem framework — saída humana, exit code 1 se algo falhar.
 */
import { buildLookup, findMatches, parseVerseList } from '../src/content/parser.ts';
import type { BookEntry, Locale } from '../src/types.ts';

function makeBook(
  id: number,
  pt: { name: string; abbrev: string; slug: string },
  en: { name: string; abbrev: string; slug: string },
  chapters: number,
): BookEntry {
  const empty = { en: '', 'pt-br': '', es: '', de: '', fr: '', it: '', zh: '', ru: '', ko: '' };
  return {
    id,
    chapters,
    testament: 'new',
    category: 'gospel',
    name: { ...empty, en: en.name, 'pt-br': pt.name },
    abbrev: { ...empty, en: en.abbrev, 'pt-br': pt.abbrev },
    slug: { ...empty, en: en.slug, 'pt-br': pt.slug },
  } as BookEntry;
}

// Livros suficientes pra cobrir os casos
const BOOKS: BookEntry[] = [
  makeBook(43, { name: 'João', abbrev: 'Jo', slug: 'joao' }, { name: 'John', abbrev: 'Jn', slug: 'john' }, 21),
  makeBook(2, { name: 'Êxodo', abbrev: 'Êx', slug: 'exodo' }, { name: 'Exodus', abbrev: 'Ex', slug: 'exodus' }, 40),
  makeBook(1, { name: 'Gênesis', abbrev: 'Gn', slug: 'genesis' }, { name: 'Genesis', abbrev: 'Gn', slug: 'genesis' }, 50),
  makeBook(12, { name: '2 Reis', abbrev: '2Rs', slug: '2-reis' }, { name: '2 Kings', abbrev: '2Ki', slug: '2-kings' }, 25),
  makeBook(46, { name: '1 Coríntios', abbrev: '1Co', slug: '1-corintios' }, { name: '1 Corinthians', abbrev: '1Co', slug: '1-corinthians' }, 16),
  makeBook(63, { name: '2 João', abbrev: '2Jo', slug: '2-joao' }, { name: '2 John', abbrev: '2Jn', slug: '2-john' }, 1),
  makeBook(64, { name: '3 João', abbrev: '3Jo', slug: '3-joao' }, { name: '3 John', abbrev: '3Jn', slug: '3-john' }, 1),
  makeBook(18, { name: 'Jó', abbrev: 'Jó', slug: 'jo' }, { name: 'Job', abbrev: 'Job', slug: 'job' }, 42),
  makeBook(45, { name: 'Romanos', abbrev: 'Rm', slug: 'romanos' }, { name: 'Romans', abbrev: 'Rom', slug: 'romans' }, 16),
  makeBook(7, { name: 'Juízes', abbrev: 'Jz', slug: 'juizes' }, { name: 'Judges', abbrev: 'Jdg', slug: 'judges' }, 21),
];

interface Case {
  name: string;
  text: string;
  locale: Locale;
  expect: Array<{ bookSlug: string; chapter: number; verseStart?: number; verseEnd?: number }>;
}

const CASES: Case[] = [
  {
    name: 'João 3:16 simples',
    text: 'Leia João 3:16 hoje.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 }],
  },
  {
    name: 'Lista 16,17',
    text: 'Conferir João 3:16,17.',
    locale: 'pt-br',
    expect: [
      { bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 },
      { bookSlug: 'joao', chapter: 3, verseStart: 17, verseEnd: 17 },
    ],
  },
  {
    name: 'Lista com range "16, 19-21"',
    text: 'João 3:16, 19-21 é interessante.',
    locale: 'pt-br',
    expect: [
      { bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 },
      { bookSlug: 'joao', chapter: 3, verseStart: 19, verseEnd: 21 },
    ],
  },
  {
    name: 'Romano II Reis 5:1',
    text: 'II Reis 5:1 conta a história de Naamã.',
    locale: 'pt-br',
    expect: [{ bookSlug: '2-reis', chapter: 5, verseStart: 1, verseEnd: 1 }],
  },
  {
    name: 'Romano "I Coríntios 13"',
    text: 'O capítulo do amor é I Coríntios 13.',
    locale: 'pt-br',
    expect: [{ bookSlug: '1-corintios', chapter: 13 }],
  },
  {
    name: 'Romano "III João 1"',
    text: 'III João 1 é curto.',
    locale: 'pt-br',
    expect: [{ bookSlug: '3-joao', chapter: 1 }],
  },
  {
    name: 'NBSP entre nome e cap',
    text: 'Veja Êxodo 3:14 agora.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'exodo', chapter: 3, verseStart: 14, verseEnd: 14 }],
  },
  {
    name: 'Narrow NBSP',
    text: 'Veja Êxodo 3:14 agora.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'exodo', chapter: 3, verseStart: 14, verseEnd: 14 }],
  },
  {
    name: 'Prefixo "cap."',
    text: 'João cap. 3:16 fala disso.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 }],
  },
  {
    name: 'Prefixo "ch."',
    text: 'See John ch. 3:16 today.',
    locale: 'en',
    expect: [{ bookSlug: 'john', chapter: 3, verseStart: 16, verseEnd: 16 }],
  },
  {
    name: 'Negativo: João colado a número',
    text: 'rejoão12 não é referência.',
    locale: 'pt-br',
    expect: [],
  },
  {
    name: 'Negativo: capítulo inválido',
    text: 'João 99:1 não existe.',
    locale: 'pt-br',
    expect: [],
  },
  {
    name: 'Boundary unicode — não pega "Sãojo 3"',
    text: 'Sãojo 3:1 não é referência.',
    locale: 'pt-br',
    expect: [],
  },
  {
    name: 'Capítulo sem versículo',
    text: 'Jó 1 começa com Satanás.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'jo', chapter: 1 }],
  },
  {
    name: 'Fallback inglês em página pt-br',
    text: 'Em pt-br: John 3:16 ainda funciona.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 }],
  },
  {
    name: 'Intervalo cap-cap "Romanos 8 – 12"',
    text: 'Estude Romanos 8 – 12 nesta semana.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'romanos', chapter: 8 }],
  },
  {
    name: 'Range simples 16-18',
    text: 'João 3:16-18 é o trecho.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 18 }],
  },
  {
    name: 'Vários matches no mesmo texto',
    text: 'João 3:16 e Romanos 8:28 conversam.',
    locale: 'pt-br',
    expect: [
      { bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 },
      { bookSlug: 'romanos', chapter: 8, verseStart: 28, verseEnd: 28 },
    ],
  },
];

// Testes do parseVerseList isolado
interface ParseCase {
  raw: string;
  expect: Array<{ start: number; end: number }>;
}
const PARSE_CASES: ParseCase[] = [
  { raw: '16', expect: [{ start: 16, end: 16 }] },
  { raw: '16-18', expect: [{ start: 16, end: 18 }] },
  { raw: '16,17', expect: [{ start: 16, end: 16 }, { start: 17, end: 17 }] },
  {
    raw: '16, 19-21',
    expect: [
      { start: 16, end: 16 },
      { start: 19, end: 21 },
    ],
  },
  { raw: 'lixo', expect: [] },
  { raw: '16, lixo, 18', expect: [{ start: 16, end: 16 }, { start: 18, end: 18 }] },
];

let failed = 0;
let passed = 0;

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function run(): void {
  console.log('parseVerseList:');
  for (const c of PARSE_CASES) {
    const got = parseVerseList(c.raw);
    if (eq(got, c.expect)) {
      passed++;
      console.log(`  ✓ "${c.raw}" → ${JSON.stringify(got)}`);
    } else {
      failed++;
      console.error(`  ✗ "${c.raw}"`);
      console.error(`     esperado: ${JSON.stringify(c.expect)}`);
      console.error(`     obtido:   ${JSON.stringify(got)}`);
    }
  }

  console.log('\nfindMatches:');
  for (const c of CASES) {
    const lookup = buildLookup(BOOKS, c.locale);
    const got = findMatches(c.text, lookup).map((m) => ({
      bookSlug: m.ref.bookSlug,
      chapter: m.ref.chapter,
      ...(m.ref.verseStart !== undefined ? { verseStart: m.ref.verseStart } : {}),
      ...(m.ref.verseEnd !== undefined ? { verseEnd: m.ref.verseEnd } : {}),
    }));
    if (eq(got, c.expect)) {
      passed++;
      console.log(`  ✓ ${c.name}`);
    } else {
      failed++;
      console.error(`  ✗ ${c.name}`);
      console.error(`     texto:    "${c.text}"`);
      console.error(`     esperado: ${JSON.stringify(c.expect)}`);
      console.error(`     obtido:   ${JSON.stringify(got)}`);
    }
  }

  console.log(`\n${passed} OK · ${failed} falhou`);
  if (failed > 0) process.exit(1);
}

run();
