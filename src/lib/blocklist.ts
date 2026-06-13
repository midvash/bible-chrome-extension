import { ALWAYS_BLOCKED_HOSTS } from '../types';

/**
 * Verifica se um host bate com uma entrada de blocklist.
 * Match exato + subdomínios: "midvash.com" cobre "www.midvash.com",
 * "blog.midvash.com", etc — mas não "midvashfake.com".
 */
function hostMatches(host: string, entry: string): boolean {
  const h = host.toLowerCase().trim();
  const e = entry.toLowerCase().trim();
  if (!h || !e) return false;
  return h === e || h.endsWith(`.${e}`);
}

/** Domínios que a extensão nunca pode rodar — não removível pelo usuário. */
export function isAlwaysBlocked(host: string): boolean {
  return ALWAYS_BLOCKED_HOSTS.some((entry) => hostMatches(host, entry));
}

/** Verifica blacklist do usuário (entradas vindas das prefs). */
export function isUserBlocked(host: string, userBlacklist: string[]): boolean {
  return userBlacklist.some((entry) => hostMatches(host, entry));
}

/** Verdadeiro se a extensão NÃO deve rodar nesse host. */
export function isHostBlocked(host: string, userBlacklist: string[]): boolean {
  return isAlwaysBlocked(host) || isUserBlocked(host, userBlacklist);
}

/**
 * Normaliza input do usuário (URL completa, domínio, com ou sem `www`) pra
 * um host limpo no formato `example.com`. Retorna string vazia se inválido.
 */
export function normalizeHostInput(raw: string): string {
  let v = raw.trim().toLowerCase();
  if (!v) return '';
  try {
    const withScheme = v.startsWith('http') ? v : `https://${v}`;
    v = new URL(withScheme).host;
  } catch {
    v = v
      .replace(/^[a-z]+:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^www\./, '');
  }
  return v.replace(/^www\./, '');
}
