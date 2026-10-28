import { fetchVerse } from '../lib/api';
import { creditLine } from '../lib/credit';
import { readerUrl } from '../lib/url';
import tooltipCss from './tooltip.css?inline';
import { servedVersion, type Locale, type VerseResponse, type VersionEntry } from '../types';

interface TooltipDeps {
  locale: Locale;
  i18n: (key: string) => string;
  /** Versões disponíveis pro locale atual — usado pra popular o select de comparação. */
  versionsForLocale: VersionEntry[];
  /** Versão secundária inicialmente selecionada (vinda das prefs). */
  initialCompareVersion: string | null;
  /** Callback quando o usuário muda a versão de comparação no select. */
  onCompareVersionChange: (slug: string | null) => void;
}

const TOOLTIP_ID = 'midvash-tooltip';
const SHOW_DELAY = 250;
const HIDE_DELAY = 200;
const COPY_FEEDBACK_MS = 1500;
const SESSION_KEY_PREFIX = 'midvash:tooltipCache:';
const PREVIEW_VERSE_LIMIT = 4;

// L1: cache em memória (síncrono, hot path durante a sessão da aba).
// Key = `${version}|${book}|${chapter}|${vStart}|${vEnd}` — cobre primária e
// secundária naturalmente (chave diferente por versão).
const memCache = new Map<string, VerseResponse>();

let tooltipEl: HTMLDivElement | null = null;
/** Elemento na página que guarda o shadow root do tooltip. */
let tooltipHost: HTMLElement | null = null;
let activeAnchor: HTMLAnchorElement | null = null;
let showTimer: number | null = null;
let hideTimer: number | null = null;
let copyResetTimer: number | null = null;
let currentDeps: TooltipDeps | null = null;
let currentCompareVersion: string | null = null;

function ensureTooltip(deps: TooltipDeps): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  const el = document.createElement('div');
  el.className = 'midvash-tooltip';
  el.setAttribute('role', 'tooltip');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="midvash-tooltip__header">
      <span class="midvash-tooltip__reference"></span>
      <span class="midvash-tooltip__version"></span>
    </div>
    <div class="midvash-tooltip__body">
      <section class="midvash-tooltip__section midvash-tooltip__section--primary">
        <p class="midvash-tooltip__text"></p>
      </section>
      <section class="midvash-tooltip__section midvash-tooltip__section--compare" hidden>
        <header class="midvash-tooltip__section-label"></header>
        <p class="midvash-tooltip__compare-text"></p>
      </section>
    </div>
    <p class="midvash-tooltip__credit" hidden></p>
    <div class="midvash-tooltip__compare-row">
      <label class="midvash-tooltip__compare-label" for="midvash-tooltip-compare"></label>
      <select id="midvash-tooltip-compare" class="midvash-tooltip__compare-select"></select>
    </div>
    <div class="midvash-tooltip__footer">
      <button type="button" class="midvash-tooltip__copy"></button>
      <a class="midvash-tooltip__more" target="_blank" rel="noopener noreferrer"></a>
    </div>
  `;
  el.addEventListener('mouseenter', cancelHide);
  el.addEventListener('mouseleave', scheduleHide);
  el.addEventListener('focusin', cancelHide);
  el.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Element | null;
    if (!next) {
      scheduleHide();
      return;
    }
    if (el.contains(next)) return;
    if (activeAnchor && next === activeAnchor) return;
    scheduleHide();
  });

  const copyBtn = el.querySelector<HTMLButtonElement>('.midvash-tooltip__copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      void handleCopy();
    });
  }

  // Popular select de comparação e ligar evento.
  populateCompareSelect(el, deps);
  const select = el.querySelector<HTMLSelectElement>('.midvash-tooltip__compare-select');
  if (select) {
    select.addEventListener('change', () => {
      const value = select.value || null;
      currentCompareVersion = value;
      deps.onCompareVersionChange(value);
      // Atualiza render se há anchor ativo.
      if (activeAnchor) void refreshCompareSection(activeAnchor, deps);
    });
  }

  // O tooltip mora num shadow root: o CSS do site (`a{color:red!important}`,
  // `section{display:flex}`) não chega nele, e o dele não vaza pro site. Tag
  // própria pra que seletores de `div` da página não peguem o host.
  const host = document.createElement('midvash-tooltip-host');
  host.id = TOOLTIP_ID;
  host.style.cssText =
    'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = tooltipCss;
  shadow.append(style, el);
  document.body.appendChild(host);
  tooltipHost = host;
  tooltipEl = el;
  return el;
}

function populateCompareSelect(el: HTMLDivElement, deps: TooltipDeps): void {
  const select = el.querySelector<HTMLSelectElement>('.midvash-tooltip__compare-select');
  const label = el.querySelector<HTMLLabelElement>('.midvash-tooltip__compare-label');
  if (!select || !label) return;
  label.textContent = deps.i18n('tooltipCompareLabel');

  // Mantém opção atual se já populado (evita rebuild constante).
  if (select.options.length > 0) {
    select.value = currentCompareVersion ?? '';
    return;
  }

  const none = document.createElement('option');
  none.value = '';
  none.textContent = deps.i18n('tooltipCompareNone');
  select.appendChild(none);

  for (const v of deps.versionsForLocale) {
    const opt = document.createElement('option');
    opt.value = v.slug;
    opt.textContent = `${v.shortName} — ${v.name}`;
    select.appendChild(opt);
  }
  select.value = currentCompareVersion ?? '';
}

function cancelHide() {
  if (hideTimer !== null) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function cancelShow() {
  if (showTimer !== null) {
    clearTimeout(showTimer);
    showTimer = null;
  }
}

function scheduleHide() {
  cancelHide();
  hideTimer = window.setTimeout(hideTooltip, HIDE_DELAY);
}

function hideTooltip() {
  cancelHide();
  cancelShow();
  if (!tooltipEl) return;
  tooltipEl.classList.remove('midvash-tooltip--visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
  if (activeAnchor) activeAnchor.removeAttribute('aria-describedby');
  activeAnchor = null;
}

function position(anchor: HTMLAnchorElement, el: HTMLDivElement) {
  const rect = anchor.getBoundingClientRect();
  el.classList.add('midvash-tooltip--measure');
  const tipRect = el.getBoundingClientRect();
  el.classList.remove('midvash-tooltip--measure');

  const margin = 8;
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  let top = rect.bottom + margin;
  let placement: 'below' | 'above' = 'below';
  if (top + tipRect.height > viewportH && rect.top - tipRect.height - margin > 0) {
    top = rect.top - tipRect.height - margin;
    placement = 'above';
  }
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(margin, Math.min(left, viewportW - tipRect.width - margin));

  el.style.top = `${top + window.scrollY}px`;
  el.style.left = `${left + window.scrollX}px`;
  el.classList.toggle('midvash-tooltip--above', placement === 'above');
  el.classList.toggle('midvash-tooltip--below', placement === 'below');
}

function cacheKeyFor(
  version: string,
  book: string,
  chapter: string,
  vStart?: string,
  vEnd?: string,
): string {
  return [version, book, chapter, vStart ?? '', vEnd ?? ''].join('|');
}

function cacheKeyFromAnchor(a: HTMLAnchorElement, overrideVersion?: string): string {
  return cacheKeyFor(
    overrideVersion ?? a.dataset.midvashVersion ?? '',
    a.dataset.midvashBook ?? '',
    a.dataset.midvashChapter ?? '',
    a.dataset.midvashVerseStart,
    a.dataset.midvashVerseEnd,
  );
}

/**
 * Cache L2 (chrome.storage.session) — volátil, limpa ao fechar o browser,
 * mas sobrevive a navegação entre abas/páginas. Falha silenciosa em frames
 * sem permissão (rara em MV3 com `storage` em permissions).
 */
async function getFromSession(key: string): Promise<VerseResponse | null> {
  try {
    const store = (chrome.storage as { session?: chrome.storage.StorageArea }).session;
    if (!store) return null;
    const result = await store.get(SESSION_KEY_PREFIX + key);
    return (result[SESSION_KEY_PREFIX + key] as VerseResponse | undefined) ?? null;
  } catch {
    return null;
  }
}

async function setInSession(key: string, value: VerseResponse): Promise<void> {
  try {
    const store = (chrome.storage as { session?: chrome.storage.StorageArea }).session;
    if (!store) return;
    await store.set({ [SESSION_KEY_PREFIX + key]: value });
  } catch {
    /* noop */
  }
}

function setLoading(el: HTMLDivElement, anchor: HTMLAnchorElement, deps: TooltipDeps) {
  const refLabel = anchorReference(anchor);
  el.querySelector<HTMLElement>('.midvash-tooltip__reference')!.textContent = refLabel;
  // Enquanto carrega, o selo já mostra a versão que a API vai servir (um
  // slug que saiu da API volta como a versão livre no lugar dele).
  el.querySelector<HTMLElement>('.midvash-tooltip__version')!.textContent = servedVersion(
    anchor.dataset.midvashVersion ?? '',
  ).toUpperCase();
  setCredit(el, undefined);
  el.querySelector<HTMLElement>('.midvash-tooltip__text')!.textContent =
    deps.i18n('tooltipLoading');
  // Reset compare section.
  const compareSection = el.querySelector<HTMLElement>('.midvash-tooltip__section--compare');
  if (compareSection) compareSection.hidden = !currentCompareVersion;
  if (compareSection && currentCompareVersion) {
    const label = compareSection.querySelector<HTMLElement>('.midvash-tooltip__section-label');
    if (label) label.textContent = servedVersion(currentCompareVersion).toUpperCase();
    const text = compareSection.querySelector<HTMLElement>('.midvash-tooltip__compare-text');
    if (text) text.textContent = deps.i18n('tooltipLoading');
  }
  const more = el.querySelector<HTMLAnchorElement>('.midvash-tooltip__more')!;
  more.href = anchor.href;
  more.textContent = deps.i18n('tooltipReadMore');
  const copy = el.querySelector<HTMLButtonElement>('.midvash-tooltip__copy')!;
  copy.textContent = deps.i18n('tooltipCopy');
  copy.disabled = true;
}

/** Renderiza o texto do verso numa <p> ou <p> com <sup>'s pra capítulo inteiro. */
function renderVerseText(
  textEl: HTMLElement,
  verse: VerseResponse,
  fallbackUnavailable: string,
): void {
  if (verse.data.text) {
    textEl.textContent = verse.data.text;
    return;
  }
  if (verse.data.verses?.length) {
    const limited = verse.data.verses.slice(0, PREVIEW_VERSE_LIMIT);
    textEl.innerHTML = '';
    limited.forEach((vText, i) => {
      const num = document.createElement('sup');
      num.className = 'midvash-tooltip__verse-num';
      num.textContent = String(i + 1);
      textEl.appendChild(num);
      textEl.appendChild(document.createTextNode(' ' + vText + ' '));
    });
    if (verse.data.verses.length > PREVIEW_VERSE_LIMIT) {
      const more = document.createElement('span');
      more.className = 'midvash-tooltip__truncated';
      more.textContent = ' …';
      textEl.appendChild(more);
    }
    return;
  }
  textEl.textContent = fallbackUnavailable;
}

function setVerse(
  el: HTMLDivElement,
  verse: VerseResponse,
  anchor: HTMLAnchorElement,
  deps: TooltipDeps,
) {
  // Usa o nome do livro no idioma do usuário (capturado no parsing) em vez
  // do meta.reference da API, que vem em inglês ("Judges" em vez de "Juízes").
  el.querySelector<HTMLElement>('.midvash-tooltip__reference')!.textContent =
    anchorReference(anchor);
  // `data.version` é a versão que veio de fato, não o slug pedido.
  el.querySelector<HTMLElement>('.midvash-tooltip__version')!.textContent =
    verse.data.version.toUpperCase();
  setCredit(el, verse.meta?.copyright);

  const textEl = el.querySelector<HTMLElement>('.midvash-tooltip__text')!;
  renderVerseText(textEl, verse, deps.i18n('tooltipUnavailable'));

  const more = el.querySelector<HTMLAnchorElement>('.midvash-tooltip__more')!;
  more.href = readerUrl(
    deps.locale,
    verse.data.version,
    // A API devolve o slug em inglês ("john"); o do idioma veio do parser.
    anchor.dataset.midvashBook ?? verse.data.book,
    verse.data.chapter,
    verse.data.verse,
    verse.data.verseEnd,
  );
  more.textContent = deps.i18n('tooltipReadMore');

  const copy = el.querySelector<HTMLButtonElement>('.midvash-tooltip__copy')!;
  copy.textContent = deps.i18n('tooltipCopy');
  copy.classList.remove('midvash-tooltip__copy--success');
  copy.disabled = false;
}

/** Mostra o crédito da versão no rodapé; o aviso inteiro aparece ao passar o mouse. */
function setCredit(el: HTMLDivElement, copyright: string | undefined) {
  const credit = el.querySelector<HTMLElement>('.midvash-tooltip__credit')!;
  const line = creditLine(copyright);
  credit.hidden = !line;
  credit.textContent = line ?? '';
  if (line && copyright) credit.title = copyright.trim();
  else credit.removeAttribute('title');
}

function setError(el: HTMLDivElement, deps: TooltipDeps) {
  el.querySelector<HTMLElement>('.midvash-tooltip__text')!.textContent =
    deps.i18n('tooltipUnavailable');
  const copy = el.querySelector<HTMLButtonElement>('.midvash-tooltip__copy')!;
  copy.disabled = true;
}

function anchorReference(a: HTMLAnchorElement): string {
  const book = a.dataset.midvashBookName ?? a.dataset.midvashBook ?? '';
  const chapter = a.dataset.midvashChapter ?? '';
  const v1 = a.dataset.midvashVerseStart;
  const v2 = a.dataset.midvashVerseEnd;
  if (!v1) return `${book} ${chapter}`;
  if (v2 && v2 !== v1) return `${book} ${chapter}:${v1}-${v2}`;
  return `${book} ${chapter}:${v1}`;
}

function buildCitation(verse: VerseResponse, anchor: HTMLAnchorElement): string {
  const ref = anchorReference(anchor);
  const version = verse.data.version.toUpperCase();
  const url = anchor.href;
  let body = url;
  if (verse.data.text) {
    body = verse.data.text.trim();
  } else if (verse.data.verses?.length) {
    const limited = verse.data.verses.slice(0, PREVIEW_VERSE_LIMIT);
    const truncated = verse.data.verses.length > PREVIEW_VERSE_LIMIT;
    body = limited.map((t, i) => `${i + 1} ${t.trim()}`).join(' ') + (truncated ? ` … (${url})` : '');
  }
  // O crédito vai junto do texto copiado: CC BY exige atribuição onde ele for colado.
  const credit = creditLine(verse.meta?.copyright);
  return `${ref} (${version}) — ${body}${credit ? `\n${credit}` : ''}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

async function handleCopy(): Promise<void> {
  if (!tooltipEl || !activeAnchor || !currentDeps) return;
  const copy = tooltipEl.querySelector<HTMLButtonElement>('.midvash-tooltip__copy');
  if (!copy || copy.disabled) return;

  const primaryKey = cacheKeyFromAnchor(activeAnchor);
  const primary = memCache.get(primaryKey);
  if (!primary) return;

  let citation = buildCitation(primary, activeAnchor);

  // Inclui versão secundária na citação se ativa e em cache.
  if (currentCompareVersion) {
    const compareKey = cacheKeyFromAnchor(activeAnchor, currentCompareVersion);
    const compare = memCache.get(compareKey);
    if (compare) {
      citation += `\n\n${buildCitation(compare, activeAnchor)}`;
    }
  }

  const ok = await copyToClipboard(citation);
  if (!ok) return;

  const original = currentDeps.i18n('tooltipCopy');
  copy.textContent = currentDeps.i18n('tooltipCopied');
  copy.classList.add('midvash-tooltip__copy--success');
  if (copyResetTimer !== null) clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    if (copy.classList.contains('midvash-tooltip__copy--success')) {
      copy.textContent = original;
      copy.classList.remove('midvash-tooltip__copy--success');
    }
  }, COPY_FEEDBACK_MS);
}

/**
 * Busca um verso (com cache L1 + L2) pra uma versão específica.
 * Retorna null se falhar ou se faltar dado essencial.
 */
async function fetchVerseFor(
  anchor: HTMLAnchorElement,
  version: string,
): Promise<VerseResponse | null> {
  const book = anchor.dataset.midvashBook;
  const chapterRaw = anchor.dataset.midvashChapter;
  if (!book || !chapterRaw) return null;

  const key = cacheKeyFromAnchor(anchor, version);
  const cached = memCache.get(key) ?? (await getFromSession(key));
  if (cached) {
    memCache.set(key, cached);
    return cached;
  }

  const chapter = parseInt(chapterRaw, 10);
  const v1 = anchor.dataset.midvashVerseStart
    ? parseInt(anchor.dataset.midvashVerseStart, 10)
    : undefined;
  const v2 = anchor.dataset.midvashVerseEnd
    ? parseInt(anchor.dataset.midvashVerseEnd, 10)
    : undefined;

  try {
    const verse = await fetchVerse(version, book, chapter, v1, v2);
    memCache.set(key, verse);
    void setInSession(key, verse);
    return verse;
  } catch (err) {
    console.warn('[Midvash] failed to fetch verse', { version, key }, err);
    return null;
  }
}

/**
 * Atualiza a seção de comparação sem refetch da primária — chamado quando o
 * usuário muda o select. Esconde a seção se compareVersion = null.
 */
async function refreshCompareSection(anchor: HTMLAnchorElement, deps: TooltipDeps): Promise<void> {
  if (!tooltipEl) return;
  const section = tooltipEl.querySelector<HTMLElement>('.midvash-tooltip__section--compare');
  if (!section) return;

  if (!currentCompareVersion) {
    section.hidden = true;
    position(anchor, tooltipEl);
    return;
  }

  section.hidden = false;
  const label = section.querySelector<HTMLElement>('.midvash-tooltip__section-label');
  if (label) label.textContent = servedVersion(currentCompareVersion).toUpperCase();
  const text = section.querySelector<HTMLElement>('.midvash-tooltip__compare-text');
  if (text) text.textContent = deps.i18n('tooltipLoading');
  position(anchor, tooltipEl);

  const verse = await fetchVerseFor(anchor, currentCompareVersion);
  if (activeAnchor !== anchor) return;
  if (!text) return;
  if (!verse) {
    text.textContent = deps.i18n('tooltipUnavailable');
  } else {
    if (label) label.textContent = verse.data.version.toUpperCase();
    renderVerseText(text, verse, deps.i18n('tooltipUnavailable'));
  }
  position(anchor, tooltipEl);
}

async function showFor(anchor: HTMLAnchorElement, deps: TooltipDeps) {
  const el = ensureTooltip(deps);
  activeAnchor = anchor;
  currentDeps = deps;
  anchor.setAttribute('aria-describedby', TOOLTIP_ID);
  setLoading(el, anchor, deps);
  el.classList.add('midvash-tooltip--visible');
  el.setAttribute('aria-hidden', 'false');
  position(anchor, el);

  const version = anchor.dataset.midvashVersion;
  if (!version) {
    setError(el, deps);
    return;
  }

  // Busca primária e secundária em paralelo (se houver compare ativo).
  const primaryPromise = fetchVerseFor(anchor, version);
  const comparePromise = currentCompareVersion
    ? fetchVerseFor(anchor, currentCompareVersion)
    : Promise.resolve(null);

  const primary = await primaryPromise;
  if (activeAnchor !== anchor) return;
  if (!primary) {
    setError(el, deps);
    return;
  }
  setVerse(el, primary, anchor, deps);
  position(anchor, el);

  if (currentCompareVersion) {
    const section = el.querySelector<HTMLElement>('.midvash-tooltip__section--compare');
    if (section) section.hidden = false;
    const compare = await comparePromise;
    if (activeAnchor !== anchor) return;
    const text = section?.querySelector<HTMLElement>('.midvash-tooltip__compare-text');
    if (text) {
      if (compare) {
        const label = section?.querySelector<HTMLElement>('.midvash-tooltip__section-label');
        if (label) label.textContent = compare.data.version.toUpperCase();
        renderVerseText(text, compare, deps.i18n('tooltipUnavailable'));
      } else {
        text.textContent = deps.i18n('tooltipUnavailable');
      }
    }
    position(anchor, el);
  }
}

export function attachTooltip(deps: TooltipDeps): () => void {
  currentDeps = deps;
  currentCompareVersion = deps.initialCompareVersion;

  const onOver = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      'a.midvash-ref',
    );
    if (!target) return;
    cancelHide();
    cancelShow();
    showTimer = window.setTimeout(() => showFor(target, deps), SHOW_DELAY);
  };
  const onOut = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      'a.midvash-ref',
    );
    if (!target) return;
    cancelShow();
    scheduleHide();
  };

  const onFocusIn = (event: FocusEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      'a.midvash-ref',
    );
    if (!target) return;
    cancelHide();
    cancelShow();
    void showFor(target, deps);
  };
  const onFocusOut = (event: FocusEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
      'a.midvash-ref',
    );
    if (!target) return;
    const next = event.relatedTarget as Element | null;
    // Foco que entra no tooltip chega aqui como o host (o shadow root
    // reapresenta o alvo), então compara com ele também.
    if (next && (next === tooltipHost || tooltipEl?.contains(next))) return;
    scheduleHide();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!tooltipEl?.classList.contains('midvash-tooltip--visible')) return;
    const toReturn = activeAnchor;
    hideTooltip();
    if (toReturn) toReturn.focus();
  };

  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('mouseout', onOut, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('mouseover', onOver, true);
    document.removeEventListener('mouseout', onOut, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    document.removeEventListener('keydown', onKeyDown, true);
    hideTooltip();
  };
}
