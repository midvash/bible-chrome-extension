/**
 * Chave de plugin da API do Midvash (header `X-Midvash-Plugin-Key`), a mesma
 * que o plugin WordPress usa. Com ela a api.midvash.com serve também as
 * versões com direitos reservados (vêm com `"restricted": true` em
 * `/v1/versions`); sem ela, só as de licença livre, e um slug restrito volta
 * como a versão livre no lugar (ver `RETIRED_VERSIONS`).
 *
 * Fica VAZIA no código aberto: a chave dentro de uma extensão de navegador é
 * pública pra quem abrir o pacote. Vazia, nenhum header sai e a extensão
 * funciona só com as versões livres.
 */
export const MIDVASH_PLUGIN_KEY = '';

export function hasPluginKey(): boolean {
  return MIDVASH_PLUGIN_KEY.length > 0;
}

/** Headers de toda chamada à API: a chave só entra quando existe. */
export function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasPluginKey()) headers['X-Midvash-Plugin-Key'] = MIDVASH_PLUGIN_KEY;
  return headers;
}

/**
 * Marca que separa caches com e sem chave: a mesma URL devolve versões
 * diferentes nos dois casos, e uma resposta não pode servir no lugar da outra.
 */
export function cacheScope(): string {
  return hasPluginKey() ? 'key' : 'open';
}
