import { DEFAULT_PREFS, STORAGE_KEYS, type ExtensionPrefs } from '../types';

export async function getPrefs(): Promise<ExtensionPrefs> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.prefs);
  const stored = result[STORAGE_KEYS.prefs] as Partial<ExtensionPrefs> | undefined;
  return {
    ...DEFAULT_PREFS,
    ...stored,
    versionByLocale: {
      ...DEFAULT_PREFS.versionByLocale,
      ...(stored?.versionByLocale ?? {}),
    },
    compareVersionByLocale: {
      ...(DEFAULT_PREFS.compareVersionByLocale ?? {}),
      ...(stored?.compareVersionByLocale ?? {}),
    },
  };
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
