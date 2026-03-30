/** Heurística simples quando a planilha não traz coluna de unidade. */
export function inferirUnidade(nome: string): string {
  const n = nome.toLowerCase();
  if (/\bkg\b/.test(n) || /\(kg\)/.test(n)) return "kg";
  if (/\b(g|gr)\b/.test(n) && !/\bkg\b/.test(n)) return "g";
  if (/\b(l|lt|litro)\b/.test(n)) return "L";
  if (/\b(ml)\b/.test(n)) return "ml";
  if (/\b(cx|caixa|pacote|pct|fardo)\b/.test(n)) return "un";
  return "un";
}
