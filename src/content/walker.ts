const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'INPUT',
  'CODE',
  'PRE',
  'KBD',
  'SAMP',
  'A',
  'BUTTON',
  'SVG',
  'CANVAS',
  'IFRAME',
  'OBJECT',
  'EMBED',
]);

const MARKER_CLASS = 'midvash-ref';

function shouldSkipElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.classList.contains(MARKER_CLASS)) return true;
  if (el.hasAttribute('data-midvash-ignore')) return true;
  return false;
}

/** Algum ancestral de `node` (inclusive) já manda pular? Só pro root do scan. */
function insideSkipped(node: Node): boolean {
  let cursor: Element | null = node instanceof Element ? node : node.parentElement;
  while (cursor) {
    if (shouldSkipElement(cursor)) return true;
    cursor = cursor.parentElement;
  }
  return false;
}

export function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  if (insideSkipped(root)) return nodes;
  // O TreeWalker não devolve o próprio root: um texto que o MutationObserver
  // pegou solto (não dentro de um elemento novo) ficaria sem link.
  if (root.nodeType === Node.TEXT_NODE) {
    if ((root.nodeValue ?? '').trim().length >= 3) nodes.push(root as Text);
    return nodes;
  }
  // Elemento a pular devolve FILTER_REJECT, que poda a subárvore inteira:
  // o walker nem desce num <pre> ou <script>, em vez de subir a cadeia de
  // ancestrais pra cada nó de texto.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return shouldSkipElement(node as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      const value = node.nodeValue ?? '';
      if (value.trim().length < 3) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}
