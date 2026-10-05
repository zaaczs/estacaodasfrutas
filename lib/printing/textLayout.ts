/** Espaços que o Intl usa em "R$ 4,65" e que a bobina precisa tratar como espaço comum. */
const SPECIAL_SPACES = /[\u00A0\u202F\u2007\u2009]/g;

export function normalizeReceiptText(value: string): string {
  return value.replace(SPECIAL_SPACES, " ").replace(/\s+/g, " ").trim();
}

/** Quebra em palavras. Palavra maior que a linha é cortada no limite. */
export function wrapText(text: string, columns: number): string[] {
  const source = normalizeReceiptText(text);
  if (!source) return [];

  const width = Math.max(1, columns);
  const lines: string[] = [];
  let rest = source;

  while (rest.length > width) {
    let breakAt = rest.lastIndexOf(" ", width);
    if (breakAt <= 0) breakAt = width;

    const line = rest.slice(0, breakAt).trimEnd();
    if (!line) break;

    lines.push(line);
    rest = rest.slice(breakAt).trimStart();
  }

  if (rest) lines.push(rest);
  return lines;
}

/**
 * Uma linha com texto à esquerda e valor à direita.
 * Se o texto não cabe junto do valor, ele quebra antes e o valor
 * fica sozinho, encostado na margem direita.
 */
export function pairColumns(left: string, right: string, columns: number): string[] {
  const width = Math.max(1, columns);
  const rightText = normalizeReceiptText(right).slice(0, width);
  const leftText = normalizeReceiptText(left);

  if (!rightText) return wrapText(leftText, width);

  const budget = width - rightText.length - 1;
  if (budget < 1) {
    return [...wrapText(leftText, width), rightText.padStart(width)];
  }

  if (leftText.length <= budget) {
    const gap = width - leftText.length - rightText.length;
    return [leftText + " ".repeat(gap) + rightText];
  }

  const wrapped = wrapText(leftText, width);
  const last = wrapped[wrapped.length - 1] ?? "";
  const head = wrapped.slice(0, -1);

  if (last.length <= budget) {
    const gap = width - last.length - rightText.length;
    return [...head, last + " ".repeat(gap) + rightText];
  }

  return [...wrapped, rightText.padStart(width)];
}
