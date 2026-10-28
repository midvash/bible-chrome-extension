import { getBooks, getVersions } from './lib/books-cache';
import { migrateStoredPrefs } from './lib/storage';

const REFRESH_ALARM = 'midvash:refresh-books';
const SIDEPANEL_BASE_PATH = 'src/sidepanel/index.html';

async function refreshAll() {
  try {
    await Promise.all([getBooks(true), getVersions(true)]);
  } catch (err) {
    console.warn('[Midvash] background refresh failed', err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await migrateStoredPrefs();
  } catch (err) {
    console.warn('[Midvash] prefs migration failed', err);
  }
  await refreshAll();
  await chrome.alarms.create(REFRESH_ALARM, {
    periodInMinutes: 60 * 24 * 7, // semanal
  });
});

chrome.runtime.onStartup.addListener(() => {
  refreshAll();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    refreshAll();
  }
});

/**
 * Mensagem do content script pedindo pra abrir o side panel com um verso
 * específico. O service worker é o contexto autorizado a chamar
 * `chrome.sidePanel.open()` (gesto do usuário propagado via `sender.tab.id`).
 */
interface OpenSidePanelMessage {
  type: 'OPEN_SIDE_PANEL';
  version: string;
  bookSlug: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  locale: string;
  bookName: string;
}

function buildSidePanelPath(msg: OpenSidePanelMessage): string {
  const params = new URLSearchParams({
    version: msg.version,
    book: msg.bookSlug,
    chapter: String(msg.chapter),
    locale: msg.locale,
    bookName: msg.bookName,
  });
  if (msg.verseStart) params.set('v1', String(msg.verseStart));
  if (msg.verseEnd && msg.verseEnd !== msg.verseStart) {
    params.set('v2', String(msg.verseEnd));
  }
  return `${SIDEPANEL_BASE_PATH}?${params.toString()}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;
  const msg = message as { type?: string };
  if (msg.type !== 'OPEN_SIDE_PANEL') return;

  const tabId = sender.tab?.id;
  if (typeof tabId !== 'number') {
    sendResponse({ ok: false, error: 'no tab id' });
    return;
  }

  const path = buildSidePanelPath(message as OpenSidePanelMessage);
  // `open()` só vale dentro do gesto do usuário: um `await` antes dele (como
  // esperar o `setOptions`) já perde o gesto e o Chrome recusa. As duas
  // chamadas saem na mesma volta, na ordem em que o Chrome as executa.
  const setOptions = chrome.sidePanel.setOptions({ tabId, path, enabled: true });
  const open = chrome.sidePanel.open({ tabId });
  Promise.all([setOptions, open]).then(
    () => sendResponse({ ok: true }),
    (err) => {
      console.warn('[Midvash] failed to open side panel', err);
      sendResponse({ ok: false, error: String(err) });
    },
  );
  return true; // async response
});
