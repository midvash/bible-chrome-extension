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
  if (el.closest(`.${MARKER_CLASS}`)) return true;
  if (el.closest('[data-midvash-ignore]')) return true;
  return false;
}

export function collectTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      // Sobe a cadeia procurando ancestral skip
      let cursor: Element | null = parent;
      while (cursor) {
        if (shouldSkipElement(cursor)) return NodeFilter.FILTER_REJECT;
        cursor = cursor.parentElement;
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
