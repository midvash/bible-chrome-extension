import {
  DEFAULT_PREFS,
  STORAGE_KEYS,
  servedVersion,
  type ExtensionPrefs,
  type Locale,
} from '../types';

/**
 * Troca os slugs que a API não serve mais pelos que ela serve no lugar
 * (ver `RETIRED_VERSIONS`). Quem instalou a v1.1.0 tem `nvi`, `rvr1960`,
 * `rivedut` ou `krv` salvos: os dois últimos davam 404 no tooltip.
 */
function migrateVersionMap<T extends string | null>(
  map: Partial<Record<Locale, T>> | undefined,
): Partial<Record<Locale, T>> {
  const out: Partial<Record<Locale, T>> = {};
  for (const [loc, slug] of Object.entries(map ?? {}) as [Locale, T][]) {
    out[loc] = (slug ? servedVersion(slug) : slug) as T;
  }
  return out;
}

export async function getPrefs(): Promise<ExtensionPrefs> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.prefs);
  const stored = result[STORAGE_KEYS.prefs] as Partial<ExtensionPrefs> | undefined;
  return {
    ...DEFAULT_PREFS,
    ...stored,
    versionByLocale: {
      ...DEFAULT_PREFS.versionByLocale,
      ...migrateVersionMap(stored?.versionByLocale),
    },
    compareVersionByLocale: {
      ...(DEFAULT_PREFS.compareVersionByLocale ?? {}),
      ...migrateVersionMap(stored?.compareVersionByLocale),
    },
  };
}

/**
 * Regrava as prefs já migradas, pra que o storage não guarde mais slug
 * velho. Chamado no `onInstalled` (instalação e atualização da extensão).
 * Sem prefs salvas, não grava nada: os padrões valem.
 */
export async function migrateStoredPrefs(): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.prefs);
  if (!result[STORAGE_KEYS.prefs]) return;
  await setPrefs(await getPrefs());
}

export async function setPrefs(prefs: ExtensionPrefs): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.prefs]: prefs });
}

export async function updatePrefs(
  partial: Partial<ExtensionPrefs>,
): Promise<ExtensionPrefs> {
  const current = await getPrefs();
  const next = { ...current, ...partial };
  await setPrefs(next);
  return next;
}
