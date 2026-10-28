/**
 * Bateria de testes manual pro parser. Rodar com:
 *   npm run test:parser
 *
 * Sem framework — saída humana, exit code 1 se algo falhar.
 */
import { buildLookup, findMatches, parseVerseList } from '../src/content/parser.ts';
import { creditLine } from '../src/lib/credit.ts';
import { apiHeaders, cacheScope, MIDVASH_PLUGIN_KEY } from '../src/lib/plugin-key.ts';
import { DEFAULT_VERSIONS, servedVersion, versionLabel, type BookEntry, type Locale } from '../src/types.ts';

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
// Jó vem antes de João de propósito: o slug pt-br de Jó é "jo", a mesma
// chave da abreviação de João. "Jo 3:16" tem que ser João.
const BOOKS: BookEntry[] = [
  makeBook(18, { name: 'Jó', abbrev: 'Jó', slug: 'jo' }, { name: 'Job', abbrev: 'Job', slug: 'job' }, 42),
  makeBook(43, { name: 'João', abbrev: 'Jo', slug: 'joao' }, { name: 'John', abbrev: 'Jn', slug: 'john' }, 21),
  makeBook(2, { name: 'Êxodo', abbrev: 'Êx', slug: 'exodo' }, { name: 'Exodus', abbrev: 'Ex', slug: 'exodus' }, 40),
  makeBook(1, { name: 'Gênesis', abbrev: 'Gn', slug: 'genesis' }, { name: 'Genesis', abbrev: 'Gn', slug: 'genesis' }, 50),
  makeBook(12, { name: '2 Reis', abbrev: '2Rs', slug: '2-reis' }, { name: '2 Kings', abbrev: '2Ki', slug: '2-kings' }, 25),
  makeBook(46, { name: '1 Coríntios', abbrev: '1Co', slug: '1-corintios' }, { name: '1 Corinthians', abbrev: '1Co', slug: '1-corinthians' }, 16),
  makeBook(63, { name: '2 João', abbrev: '2Jo', slug: '2-joao' }, { name: '2 John', abbrev: '2Jn', slug: '2-john' }, 1),
  makeBook(64, { name: '3 João', abbrev: '3Jo', slug: '3-joao' }, { name: '3 John', abbrev: '3Jn', slug: '3-john' }, 1),
  makeBook(28, { name: 'Oseias', abbrev: 'Os', slug: 'oseias' }, { name: 'Hosea', abbrev: 'Hos', slug: 'hosea' }, 14),
  makeBook(44, { name: 'Atos', abbrev: 'At', slug: 'atos' }, { name: 'Acts', abbrev: 'Act', slug: 'acts' }, 28),
  makeBook(19, { name: 'Salmos', abbrev: 'Sl', slug: 'salmos' }, { name: 'Psalms', abbrev: 'Psa', slug: 'psalms' }, 150),
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
  {
    name: 'Bug: "Jo 3:16" é João, não Jó (slug "jo")',
    text: 'Leia Jo 3:16.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'joao', chapter: 3, verseStart: 16, verseEnd: 16 }],
  },
  {
    name: 'Abreviação curta sem versículo não vira link ("os 13 alunos", "Jo 3")',
    text: 'Os 13 alunos leram Jo 3 ontem.',
    locale: 'pt-br',
    expect: [],
  },
  {
    name: 'Abreviação minúscula não vira link ("at 10:30")',
    text: 'Chegamos at 10:30 e saímos.',
    locale: 'pt-br',
    expect: [],
  },
  {
    name: 'Abreviação maiúscula com versículo vira link ("Os 13:4")',
    text: 'Veja Os 13:4.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'oseias', chapter: 13, verseStart: 4, verseEnd: 4 }],
  },
  {
    name: 'Nome ambíguo sem versículo não vira link ("Job 2 offer")',
    text: 'I got a Job 2 offer.',
    locale: 'en',
    expect: [],
  },
  {
    name: 'Nome ambíguo com versículo vira link ("Job 2:3")',
    text: 'Read Job 2:3.',
    locale: 'en',
    expect: [{ bookSlug: 'job', chapter: 2, verseStart: 3, verseEnd: 3 }],
  },
  {
    name: 'Vírgula separa capítulo e versículo em alemão ("John 3,16")',
    text: 'Siehe John 3,16-18.',
    locale: 'de',
    expect: [{ bookSlug: 'john', chapter: 3, verseStart: 16, verseEnd: 18 }],
  },
  {
    name: 'Vírgula não separa versículo em inglês ("John 3, 16 people")',
    text: 'John 3, 16 people came.',
    locale: 'en',
    expect: [{ bookSlug: 'john', chapter: 3 }],
  },
  {
    name: 'Versículo além do capítulo é descartado ("Genesis 50:999")',
    text: 'Genesis 50:999 does not exist.',
    locale: 'en',
    expect: [],
  },
  {
    name: 'Apelido "1 Cor 13:4" (inglês)',
    text: 'Love is patient, 1 Cor 13:4.',
    locale: 'en',
    expect: [{ bookSlug: '1-corinthians', chapter: 13, verseStart: 4, verseEnd: 4 }],
  },
  {
    name: 'Apelido "Salmo 23" (pt-br)',
    text: 'Leia o Salmo 23 hoje.',
    locale: 'pt-br',
    expect: [{ bookSlug: 'salmos', chapter: 23 }],
  },
  {
    name: 'Abreviação colada ganha espaço ("1 Co 13:4")',
    text: 'Leia 1 Co 13:4.',
    locale: 'pt-br',
    expect: [{ bookSlug: '1-corintios', chapter: 13, verseStart: 4, verseEnd: 4 }],
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

  console.log('\nversões e crédito:');
  const checks: { name: string; got: unknown; expect: unknown }[] = [
    { name: 'rivedut (typo da v1.1.0) → riveduta', got: servedVersion('rivedut'), expect: 'riveduta' },
    { name: 'krv (typo da v1.1.0) → kor', got: servedVersion('krv'), expect: 'kor' },
    { name: 'nvi saiu da API → onbv', got: servedVersion('nvi'), expect: 'onbv' },
    { name: 'RVR1960 (maiúsculo) → rvr1909', got: servedVersion('RVR1960'), expect: 'rvr1909' },
    { name: 'kjv segue kjv', got: servedVersion('kjv'), expect: 'kjv' },
    { name: 'nri → riveduta', got: servedVersion('nri'), expect: 'riveduta' },
    { name: 'ol → onbv', got: servedVersion('ol'), expect: 'onbv' },
    {
      name: 'padrões não usam slug aposentado',
      got: Object.values(DEFAULT_VERSIONS).filter((v) => servedVersion(v) !== v),
      expect: [],
    },
    {
      name: 'crédito CC BY-SA (ONBV)',
      got: creditLine(
        'Biblica® Open Nova Bíblia Viva™ (ONBV)\n© 2007, 2010 Biblica, Inc.\nLicença Creative Commons Atribuição-CompartilhaIgual 4.0 (CC BY-SA 4.0).',
      ),
      expect: 'Biblica® Open Nova Bíblia Viva™ (ONBV) · CC BY-SA 4.0',
    },
    {
      name: 'crédito domínio público (KJV)',
      got: creditLine('King James Version (KJV)\nPublic Domain.\nFirst published in 1611.'),
      expect: 'King James Version (KJV) · Public Domain',
    },
    { name: 'sem copyright → sem crédito', got: creditLine(undefined), expect: undefined },
    { name: 'chave de plugin vazia no código aberto', got: MIDVASH_PLUGIN_KEY, expect: '' },
    { name: 'sem chave, nenhum header X-Midvash-Plugin-Key', got: apiHeaders(), expect: { Accept: 'application/json' } },
    { name: 'sem chave, cache no escopo aberto', got: cacheScope(), expect: 'open' },
    {
      name: 'versão restrita ganha © no seletor',
      got: versionLabel({ shortName: 'NVI', name: 'Nova Versão Internacional', restricted: true }),
      expect: '© NVI — Nova Versão Internacional',
    },
    {
      name: 'versão livre fica sem ©',
      got: versionLabel({ shortName: 'ONBV', name: 'Open Nova Bíblia Viva' }),
      expect: 'ONBV — Open Nova Bíblia Viva',
    },
  ];
  for (const c of checks) {
    if (eq(c.got, c.expect)) {
      passed++;
      console.log(`  ✓ ${c.name}`);
    } else {
      failed++;
      console.error(`  ✗ ${c.name}`);
      console.error(`     esperado: ${JSON.stringify(c.expect)}`);
      console.error(`     obtido:   ${JSON.stringify(c.got)}`);
    }
  }

}

/** Migração das prefs salvas, com um `chrome.storage.local` de mentira. */
async function runMigration(): Promise<void> {
  console.log('\nmigração das prefs:');
  const store: Record<string, unknown> = {};
  (globalThis as { chrome?: unknown }).chrome = {
    storage: {
      local: {
        get: async (k: string) => ({ [k]: store[k] }),
        set: async (o: Record<string, unknown>) => Object.assign(store, o),
      },
    },
  };
  const { migrateStoredPrefs } = await import('../src/lib/storage.ts');
  store['midvash:prefs'] = {
    enabled: true,
    showTooltip: true,
    blacklist: [],
    versionByLocale: { 'pt-br': 'nvi', es: 'RVR1960', it: 'rivedut', ko: 'krv', de: 'luth1912', en: 'esv' },
    compareVersionByLocale: { 'pt-br': 'ol', es: null, it: 'nri', en: 'nkjv' },
  };
  await migrateStoredPrefs();
  const prefs = store['midvash:prefs'] as {
    versionByLocale: Record<string, string>;
    compareVersionByLocale: Record<string, string | null>;
  };
  delete store['midvash:prefs'];
  await migrateStoredPrefs();
  const checks: { name: string; got: unknown; expect: unknown }[] = [
    {
      name: 'versão principal migrada',
      got: [prefs.versionByLocale['pt-br'], prefs.versionByLocale.es, prefs.versionByLocale.it, prefs.versionByLocale.ko],
      expect: ['onbv', 'rvr1909', 'riveduta', 'kor'],
    },
    { name: 'comparação igual à principal zera (ol → onbv)', got: prefs.compareVersionByLocale['pt-br'], expect: null },
    { name: 'comparação igual à principal zera (nri → riveduta)', got: prefs.compareVersionByLocale.it, expect: null },
    { name: 'comparação diferente da principal fica (esv → bsb, nkjv → kjv)', got: prefs.compareVersionByLocale.en, expect: 'kjv' },
    { name: 'sem prefs salvas não grava nada', got: 'midvash:prefs' in store, expect: false },
  ];
  for (const c of checks) {
    if (eq(c.got, c.expect)) {
      passed++;
      console.log(`  ✓ ${c.name}`);
    } else {
      failed++;
      console.error(`  ✗ ${c.name}`);
      console.error(`     esperado: ${JSON.stringify(c.expect)}`);
      console.error(`     obtido:   ${JSON.stringify(c.got)}`);
    }
  }
}

run();
await runMigration();
console.log(`\n${passed} OK · ${failed} falhou`);
if (failed > 0) process.exit(1);
