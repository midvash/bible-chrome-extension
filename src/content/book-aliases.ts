import type { Locale } from '../types';

/**
 * Formas de escrever um livro que não são o `name` nem o `abbrev` da API.
 * Chave = como aparece no texto; valor = id do livro.
 *
 * Base: `BOOK_NAME_ALIASES` do `@midvash/data` no monorepo do Midvash
 * (`packages/data/src/book-aliases.ts`, levantado do conteúdo real em
 * out/2026), mais as abreviações SBL mais comuns em inglês ("Matt", "1 Cor",
 * "Phil"…), que a API não lista. Forma curta (até 3 letras) segue a regra de
 * abreviação do parser: só com maiúscula e com `:versículo`.
 */
export const BOOK_ALIASES: Partial<Record<Locale, Record<string, number>>> = {
  en: {
    Ps: 19,
    Psalm: 19,
    Pss: 19,
    Ex: 2,
    Exod: 2,
    Deut: 5,
    Josh: 6,
    Judg: 7,
    '1 Sam': 9,
    '2 Sam': 10,
    '1 Kgs': 11,
    '2 Kgs': 12,
    '1 Chr': 13,
    '2 Chr': 14,
    Esth: 17,
    Prov: 20,
    Eccl: 21,
    Song: 22,
    'Song of Songs': 22,
    Ezek: 26,
    Obad: 31,
    Zeph: 36,
    Zech: 38,
    Matt: 40,
    Mk: 41,
    Lk: 42,
    Jn: 43,
    '1 Cor': 46,
    '2 Cor': 47,
    Phil: 50,
    '1 Thess': 52,
    '2 Thess': 53,
    '1 Tim': 54,
    '2 Tim': 55,
    Phlm: 57,
    Jas: 59,
    '1 Pet': 60,
    '2 Pet': 61,
  },
  'pt-br': {
    Ex: 2,
    Salmo: 19,
    Oséias: 28,
  },
  es: {
    Gn: 1,
    Ex: 2,
    Nm: 4,
    Lev: 3,
    Heb: 58,
    Rom: 45,
    Rm: 45,
    Mc: 41,
    Jr: 24,
    Salmo: 19,
    Génesis: 1,
  },
  fr: {
    He: 58,
    Ep: 49,
    Es: 23,
    Ez: 26,
    Isaïe: 23,
    Psaume: 19,
  },
  de: {
    '1 Mose': 1,
    '2 Mose': 2,
    '3 Mose': 3,
    '4 Mose': 4,
    '5 Mose': 5,
    Psalm: 19,
  },
  it: {
    Salmo: 19,
    Num: 4,
    Lev: 3,
    Mal: 39,
    '1 Ts': 52,
    '2 Ts': 53,
    Obadia: 31,
  },
  ru: {
    // Genitivo ("Евангелие от Матфея") e preposicional ("в Псалме").
    Матфея: 40,
    Марка: 41,
    Луки: 42,
    Иоанна: 43,
    Псалом: 19,
    Псалме: 19,
    Псалмах: 19,
    Псалмы: 19,
    Псалтири: 19,
    Бытии: 1,
    Исходе: 2,
    Левите: 3,
    Числах: 4,
    Второзаконии: 5,
    Навина: 6,
    'Иисуса Навина': 6,
    Судей: 7,
    Руфи: 8,
    Ездры: 15,
    Неемии: 16,
    Есфири: 17,
    Иова: 18,
    Притчах: 20,
    Екклесиаста: 21,
    Исаии: 23,
    Иеремии: 24,
    Иезекииля: 26,
    Даниила: 27,
    Осии: 28,
    Иоиля: 29,
    Амоса: 30,
    Авдия: 31,
    Ионы: 32,
    Михея: 33,
    Наума: 34,
    Аввакума: 35,
    Софонии: 36,
    Аггея: 37,
    Захарии: 38,
    Малахии: 39,
    Деяний: 44,
    Деяниях: 44,
    Иакова: 59,
    Иуды: 65,
    Откровении: 66,
  },
  ko: {
    요한일서: 62,
    요한이서: 63,
    요한삼서: 64,
  },
  zh: {
    約翰福音: 43,
    創世記: 1,
    约壹: 62,
  },
};

/**
 * Nomes de livro que também são palavra comum ou nome de pessoa ("Job 2
 * offer", "Mark 2 times", "Números 3"). Só viram link com `:versículo`.
 * Comparados em minúsculas.
 */
export const AMBIGUOUS_NAMES: ReadonlySet<string> = new Set([
  // en
  'job', 'mark', 'acts', 'numbers', 'judges', 'ruth', 'james', 'jude', 'song',
  // pt-br / es
  'atos', 'números', 'numeros', 'juízes', 'juizes', 'hechos', 'jueces',
  // fr
  'nombres', 'actes', 'juges',
  // de
  'richter',
  // it
  'numeri', 'atti', 'giudici',
]);
