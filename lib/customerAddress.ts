export function formatCustomerAddress(
  address?: string | null,
  complement?: string | null
): string {
  const line = address?.trim() ?? "";
  const extra = complement?.trim() ?? "";
  if (line && extra) return `${line}, ${extra}`;
  return line || extra;
}

/** Ex.: "Maria Silva - Rua João Pessoa, 150" */
export function formatCustomerSearchResult(
  name: string,
  address?: string | null,
  complement?: string | null
): string {
  const line = formatCustomerAddress(address, complement);
  return line ? `${name} - ${line}` : name;
}
