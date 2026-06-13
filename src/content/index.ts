import { getBooksOptimistic, getVersions } from '../lib/books-cache';
import { detectPageLocale, matchLocale } from '../lib/locale';
import { getPrefs, updatePrefs } from '../lib/storage';
import { isHostBlocked } from '../lib/blocklist';
import { DEFAULT_VERSIONS, type BookEntry, type VersionEntry } from '../types';
import { buildLookup } from './parser';
import { linkifyNodesIdle } from './linker';
import { collectTextNodes } from './walker';
import { attachTooltip } from './tooltip';
import './content.css';

// Tempo de debounce do MutationObserver. Em condição de backpressure
// (queue cresce além de QUEUE_BACKPRESSURE) sobe pra DEBOUNCE_BACKPRESSURE_MS.
const DEBOUNCE_MS = 300;
const DEBOUNCE_BACKPRESSURE_MS = 800;

// Teto do que processamos por flush. Se queue passar de QUEUE_MAX, descarta
// excesso (com warning) — SPAs muito vivas (Twitter, Discord) não devem travar.
const QUEUE_MAX = 1000;
const QUEUE_BACKPRESSURE = 200;

// Hash determinístico (e barato) dos livros — usado pra detectar se o set
// mudou após um refresh e justificar re-scan.
function booksHash(books: BookEntry[]): string {
  return books.map((b) => b.id).join(',');
}

async function main() {
  const prefs = await getPrefs();
  if (!prefs.enabled) return;
  if (isHostBlocked(window.location.host.toLowerCase(), prefs.blacklist)) return;

  const locale = detectPageLocale();
  const version = prefs.versionByLocale[locale] ?? DEFAULT_VERSIONS[locale];

  let cached: BookEntry[] | null;
  let fresh: Promise<BookEntry[]>;
  try {
    ({ cached, fresh } = await getBooksOptimistic());
  } catch (err) {
    console.warn('[Midvash] failed to load books index', err);
    return;
  }

  // Se não há cache local algum, precisamos esperar o fresh — primeira execução.
  let initialBooks = cached;
  if (!initialBooks) {
    try {
      initialBooks = await fresh;
    } catch (err) {
      console.warn('[Midvash] initial books fetch failed', err);
      return;
    }
  }

  let lookup = buildLookup(initialBooks, locale);
  let currentHash = booksHash(initialBooks);
  // openIn fica num objeto mutável pra que mudanças nas prefs (via popup)
  // sejam refletidas sem precisar re-scan/re-attach.
  const openIn = { current: prefs.openIn ?? 'tab' };
  const ctx = { lookup, locale, version, openIn };

  // Observa mudança de prefs em outras abas/popups e atualiza openIn ao vivo.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const prefsChange = changes['midvash:prefs'];
    if (!prefsChange) return;
    const next = prefsChange.newValue as { openIn?: 'tab' | 'sidePanel' } | undefined;
    if (next?.openIn) openIn.current = next.openIn;
  });

  const i18n = (key: string): string => {
    try {
      return chrome.i18n.getMessage(key) || key;
    } catch {
      return key;
    }
  };

  const scan = (root: Node): Promise<void> => {
    const nodes = collectTextNodes(root);
    if (nodes.length === 0) return Promise.resolve();
    return linkifyNodesIdle(nodes, ctx).then(() => undefined);
  };

  // Scan inicial — não bloqueia a render.
  void scan(document.body);

  if (prefs.showTooltip) {
    // Carrega versões em paralelo — falha silenciosa volta lista vazia (select
    // de comparação fica sem opções mas tooltip funciona normal).
    const versions: VersionEntry[] = await getVersions().catch(() => []);
    const versionsForLocale = versions.filter(
      (v) => matchLocale(v.language) === locale && v.slug !== version,
    );
    const initialCompareVersion = prefs.compareVersionByLocale?.[locale] ?? null;

    attachTooltip({
      locale,
      i18n,
      versionsForLocale,
      initialCompareVersion,
      onCompareVersionChange: (slug) => {
        void updatePrefs({
          compareVersionByLocale: {
            ...(prefs.compareVersionByLocale ?? {}),
            [locale]: slug,
          },
        });
      },
    });
  }

  // Quando o refresh terminar, se mudou o set de livros, reconstrói o lookup
  // e re-scaneia o documento — links que ficaram errados (livros novos,
  // slugs renomeados) corrigem; já-linkados ficam (walker pula `.midvash-ref`).
  fresh
    .then((freshBooks) => {
      const newHash = booksHash(freshBooks);
      if (newHash === currentHash) return;
      currentHash = newHash;
      lookup = buildLookup(freshBooks, locale);
      // Mutação direta do objeto ctx pra propagar — `linkifyNodesIdle` lê via
      // closure no `tick`, então basta atualizar a referência.
      (ctx as { lookup: typeof lookup }).lookup = lookup;
      void scan(document.body);
    })
    .catch((err) => console.warn('[Midvash] background refresh failed', err));

  // MutationObserver com backpressure e teto.
  let pending = false;
  let queue: Node[] = [];
  let droppedWarned = false;

  const flush = () => {
    pending = false;
    const batch = queue;
    queue = [];
    for (const node of batch) void scan(node);
  };

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE && n.nodeType !== Node.TEXT_NODE) return;
        // Filtra ruído — só vale a pena enfileirar se tem texto significativo.
        const text = (n as Element | Text).textContent ?? '';
        if (text.trim().length < 3) return;
        if (queue.length >= QUEUE_MAX) {
          if (!droppedWarned) {
            console.warn('[Midvash] mutation queue at cap, dropping further nodes this tick');
            droppedWarned = true;
          }
          return;
        }
        queue.push(n);
      });
    }
    droppedWarned = false;
    if (queue.length === 0) return;
    if (!pending) {
      pending = true;
      const delay = queue.length >= QUEUE_BACKPRESSURE ? DEBOUNCE_BACKPRESSURE_MS : DEBOUNCE_MS;
      window.setTimeout(flush, delay);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

main().catch((err) => console.warn('[Midvash] content script error', err));
