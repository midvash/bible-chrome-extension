import { API_BASE, type BookEntry, type VerseResponse, type VersionEntry } from '../types';

interface ApiEnvelope<T> {
  data: T;
  meta?: unknown;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} — ${url}`);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

export function fetchBooks(): Promise<BookEntry[]> {
  return getJson<BookEntry[]>(`${API_BASE}/books`);
}

export function fetchVersions(): Promise<VersionEntry[]> {
  return getJson<VersionEntry[]>(`${API_BASE}/versions`);
}

export async function fetchVerse(
  version: string,
  bookSlug: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number,
): Promise<VerseResponse> {
  const verses =
    verseStart && verseEnd && verseEnd !== verseStart
      ? `/${verseStart}-${verseEnd}`
      : verseStart
        ? `/${verseStart}`
        : '';
  const url = `${API_BASE}/${version}/${bookSlug}/${chapter}${verses}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} — ${url}`);
  }
  return (await res.json()) as VerseResponse;
}
