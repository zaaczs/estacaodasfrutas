/** Remove código de barras / SKU no início do nome (ex.: "00789072648755 -  BOMBRIL"). */
export function limparNomeProdutoPlanilha(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  const m = s.match(/^\d{8,}\s*[-–—]\s*(.+)$/);
  if (m) return m[1].trim();
  return s;
}
