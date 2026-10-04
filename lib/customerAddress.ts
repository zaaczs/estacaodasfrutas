export function formatCustomerAddress(
  address?: string | null,
  complement?: string | null
): string {
  const line = address?.trim() ?? "";
  const extra = complement?.trim() ?? "";
  if (line && extra) return `${line}, ${extra}`;
  return line || extra;
}
