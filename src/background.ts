import { getBooks, getVersions } from './lib/books-cache';

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
  void (async () => {
    try {
      await chrome.sidePanel.setOptions({ tabId, path, enabled: true });
      await chrome.sidePanel.open({ tabId });
      sendResponse({ ok: true });
    } catch (err) {
      console.warn('[Midvash] failed to open side panel', err);
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true; // async response
});
