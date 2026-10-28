import { fetchBooks, fetchVersions } from './api';
import { hasPluginKey } from './plugin-key';
import {
  BOOKS_TTL_MS,
  STORAGE_KEYS,
  type BookEntry,
  type VersionEntry,
} from '../types';

interface Cached<T> {
  data: T;
  fetchedAt: number;
}

async function readCached<T>(key: string, tsKey: string): Promise<Cached<T> | null> {
  const result = await chrome.storage.local.get([key, tsKey]);
  const data = result[key] as T | undefined;
  const fetchedAt = result[tsKey] as number | undefined;
  if (!data || !fetchedAt) return null;
  return { data, fetchedAt };
}

export async function getBooks(forceRefresh = false): Promise<BookEntry[]> {
  if (!forceRefresh) {
    const cached = await readCached<BookEntry[]>(
      STORAGE_KEYS.books,
      STORAGE_KEYS.booksFetchedAt,
    );
    if (cached && Date.now() - cached.fetchedAt < BOOKS_TTL_MS) {
      return cached.data;
    }
  }
  const data = await fetchBooks();
  await chrome.storage.local.set({
    [STORAGE_KEYS.books]: data,
    [STORAGE_KEYS.booksFetchedAt]: Date.now(),
  });
  return data;
}

/**
 * Variante otimista: retorna o cache local imediatamente (sem checar TTL) e,
 * em paralelo, dispara um refresh em background se o TTL expirou.
 *
 * `cached` é null se não houver nada em chrome.storage.local — nesse caso,
 * `fresh` é a única fonte. Quando há cache e ele está fresco, `fresh`
 * resolve pra ele direto (não faz fetch desnecessário).
 *
 * Uso no content script: faz scan inicial com `cached` (instantâneo) e
 * registra `.then(fresh => maybeReScan(fresh))` pra re-scan se mudou.
 */
export async function getBooksOptimistic(): Promise<{
  cached: BookEntry[] | null;
  fresh: Promise<BookEntry[]>;
}> {
  const stored = await readCached<BookEntry[]>(
    STORAGE_KEYS.books,
    STORAGE_KEYS.booksFetchedAt,
  );
  const isFresh = stored && Date.now() - stored.fetchedAt < BOOKS_TTL_MS;
  if (isFresh && stored) {
    return { cached: stored.data, fresh: Promise.resolve(stored.data) };
  }
  // Cache stale ou ausente — dispara fetch em background; devolve o que tem.
  const fresh = (async () => {
    const data = await fetchBooks();
    await chrome.storage.local.set({
      [STORAGE_KEYS.books]: data,
      [STORAGE_KEYS.booksFetchedAt]: Date.now(),
    });
    return data;
  })();
  return { cached: stored?.data ?? null, fresh };
}

/**
 * Com a chave de plugin `/v1/versions` lista também as restritas: guarda em
 * outra chave do storage pra uma lista não servir no lugar da outra.
 */
function versionKeys(): { key: string; tsKey: string } {
  const suffix = hasPluginKey() ? ':key' : '';
  return {
    key: STORAGE_KEYS.versions + suffix,
    tsKey: STORAGE_KEYS.versionsFetchedAt + suffix,
  };
}

export async function getVersions(forceRefresh = false): Promise<VersionEntry[]> {
  const { key, tsKey } = versionKeys();
  if (!forceRefresh) {
    const cached = await readCached<VersionEntry[]>(key, tsKey);
    if (cached && Date.now() - cached.fetchedAt < BOOKS_TTL_MS) {
      return cached.data;
    }
  }
  const data = await fetchVersions();
  await chrome.storage.local.set({ [key]: data, [tsKey]: Date.now() });
  return data;
}
