/** Converte células de preço (número Excel, texto BR "4,99", "R$ 1.234,56") em número. */
export function parsePreco(val: unknown): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number" && Number.isFinite(val)) return val >= 0 ? val : null;

  let s = String(val).trim().replace(/R\$\s?/gi, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
