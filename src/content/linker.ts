import type { Locale, OpenTarget, ParsedReference } from '../types';
import { readerUrl } from '../lib/url';
import { findMatches, buildLookup, type Match } from './parser';

interface LinkContext {
  lookup: ReturnType<typeof buildLookup>;
  locale: Locale;
  version: string;
  /** Preferência atual de destino — mutável via closure pra refletir mudanças em runtime. */
  openIn: { current: OpenTarget };
}

/**
 * Pede ao service worker pra abrir o side panel com a referência.
 * Falha silenciosa (com warning) — caller deve ter tratado fallback antes.
 */
function requestSidePanel(ref: ParsedReference, ctx: LinkContext): void {
  void chrome.runtime
    .sendMessage({
      type: 'OPEN_SIDE_PANEL',
      version: ctx.version,
      bookSlug: ref.bookSlug,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd,
      locale: ctx.locale,
      bookName: ref.bookName,
    })
    .catch((err) => console.warn('[Midvash] sidePanel request failed', err));
}

export function linkifyTextNode(node: Text, ctx: LinkContext): number {
  const text = node.nodeValue ?? '';
  if (!text) return 0;
  const matches = findMatches(text, ctx.lookup);
  if (matches.length === 0) return 0;

  const parent = node.parentNode;
  if (!parent) return 0;

  const frag = document.createDocumentFragment();
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      frag.appendChild(document.createTextNode(text.slice(cursor, match.start)));
    }
    frag.appendChild(buildLink(text.slice(match.start, match.end), match.ref, ctx));
    cursor = match.end;
  }
  if (cursor < text.length) {
    frag.appendChild(document.createTextNode(text.slice(cursor)));
  }
  parent.replaceChild(frag, node);
  return matches.length;
}

function buildLink(text: string, ref: ParsedReference, ctx: LinkContext): HTMLAnchorElement {
  const a = document.createElement('a');
  a.className = 'midvash-ref';
  a.href = readerUrl(
    ctx.locale,
    ctx.version,
    ref.bookSlug,
    ref.chapter,
    ref.verseStart,
    ref.verseEnd,
  );
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = text;
  a.dataset.midvashBook = ref.bookSlug;
  a.dataset.midvashChapter = String(ref.chapter);
  if (ref.verseStart) a.dataset.midvashVerseStart = String(ref.verseStart);
  if (ref.verseEnd) a.dataset.midvashVerseEnd = String(ref.verseEnd);
  a.dataset.midvashVersion = ctx.version;
  a.dataset.midvashLocale = ctx.locale;
  a.dataset.midvashBookName = ref.bookName;

  // Click handler com modificadores:
  //   Shift = sempre nova aba
  //   Alt = sempre side panel
  //   default = pref do usuário (ctx.openIn.current)
  // Botão do meio / cmd+click / ctrl+click: deixa o browser tratar (nova aba).
  a.addEventListener('click', (e) => {
    if (e.button !== 0) return; // só left-click
    if (e.metaKey || e.ctrlKey) return; // cmd/ctrl click → browser handle
    if (e.shiftKey) return; // Shift = força nova aba (comportamento default)
    const target = e.altKey ? 'sidePanel' : ctx.openIn.current;
    if (target !== 'sidePanel') return; // 'tab' = comportamento default
    e.preventDefault();
    requestSidePanel(ref, ctx);
  });

  return a;
}

export function linkifyNodes(nodes: Text[], ctx: LinkContext): number {
  let count = 0;
  for (const node of nodes) {
    count += linkifyTextNode(node, ctx);
  }
  return count;
}

/**
 * Versão não-bloqueante de `linkifyNodes` — processa em chunks de N nós e
 * agenda os próximos via `requestIdleCallback` (fallback `setTimeout(0)`).
 *
 * Pra coleções pequenas (< IDLE_THRESHOLD), processa síncrono — o overhead
 * do agendamento não compensa.
 *
 * Resolve quando todos os nós foram processados.
 */
const IDLE_THRESHOLD = 50;
const IDLE_CHUNK = 50;

type IdleSchedule = (cb: () => void) => void;

const scheduleIdle: IdleSchedule =
  typeof (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback === 'function'
    ? (cb) => {
        (globalThis as unknown as { requestIdleCallback: (cb: () => void) => void })
          .requestIdleCallback(cb);
      }
    : (cb) => {
        setTimeout(cb, 0);
      };

export function linkifyNodesIdle(nodes: Text[], ctx: LinkContext): Promise<number> {
  if (nodes.length < IDLE_THRESHOLD) {
    return Promise.resolve(linkifyNodes(nodes, ctx));
  }
  return new Promise((resolve) => {
    let i = 0;
    let count = 0;
    const tick = () => {
      const end = Math.min(i + IDLE_CHUNK, nodes.length);
      for (; i < end; i++) {
        // Nó pode ter sido removido/substituído entre chunks. Checa se ainda
        // está no DOM antes de processar.
        const node = nodes[i];
        if (node.isConnected) count += linkifyTextNode(node, ctx);
      }
      if (i < nodes.length) {
        scheduleIdle(tick);
      } else {
        resolve(count);
      }
    };
    scheduleIdle(tick);
  });
}

// re-export type helper
export type { Match };
