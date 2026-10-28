/**
 * Uma linha de crédito a partir do `meta.copyright` da API: o título da
 * versão mais a licença, ex. "Biblica® Open Nova Bíblia Viva™ (ONBV) ·
 * CC BY-SA 4.0". Versões CC BY exigem esse crédito junto do texto. Mesma
 * regra do plugin do EmDash (`creditLine`).
 */
export function creditLine(copyright: string | undefined): string | undefined {
  const lines = String(copyright ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return undefined;
  const license = licenseOf(lines.slice(1));
  return license ? `${lines[0]} · ${license}` : lines[0];
}

/** A licença nas linhas do aviso: token CC, CC BY por extenso ou domínio público. */
function licenseOf(lines: string[]): string | undefined {
  for (const line of lines) {
    const token = /\b(CC0|CC BY(?:-[A-Z]{2})*(?: \d\.\d)?)(?![\w.])/.exec(line);
    if (token) return token[1];
    const words = /Creative Commons Atribui(?:ção|ción) (\d\.\d)/.exec(line);
    if (words) return `CC BY ${words[1]}`;
    const publicDomain = /^(Public Domain|Dom[ií]nio público)/i.exec(line);
    if (publicDomain) return publicDomain[1];
  }
  return undefined;
}
