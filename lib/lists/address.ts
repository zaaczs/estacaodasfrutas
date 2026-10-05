import { normalizeSearchText } from "@/lib/searchText";

export function splitDeliveryLocation(raw?: string | null): { street: string; neighborhood: string } {
  const value = raw?.trim() ?? "";
  if (!value) return { street: "", neighborhood: "" };

  const separator = value.lastIndexOf(" - ");
  if (separator <= 0) return { street: value, neighborhood: "" };

  const neighborhood = value.slice(separator + 3).trim();
  const street = value.slice(0, separator).trim();
  if (!street || !neighborhood || neighborhood.length > 40 || neighborhood.includes(",")) {
    return { street: value, neighborhood: "" };
  }

  return { street, neighborhood };
}

export function visibleComplement(street: string, complement?: string | null): string {
  const extra = complement?.trim() ?? "";
  if (!extra) return "";
  if (normalizeSearchText(street).includes(normalizeSearchText(extra))) return "";
  return extra;
}

export function deliveryAddressKey(parts: {
  street: string;
  neighborhood: string;
  complement: string;
}): string {
  return normalizeSearchText(
    [parts.street, parts.neighborhood, parts.complement].filter(Boolean).join(" ")
  );
}
