import { formatCustomerAddress } from "@/lib/customerAddress";
import { formatPhoneDisplay } from "@/lib/phone";
import { normalizeSearchText } from "@/lib/searchText";

export type CustomerSearchFields = {
  name: string;
  phone: string;
  cpfCnpj?: string | null;
  address?: string | null;
  complement?: string | null;
};

export type CustomerSearchFilters = {
  name: string;
  phone: string;
  document: string;
  address: string;
};

export const emptyCustomerSearchFilters: CustomerSearchFilters = {
  name: "",
  phone: "",
  document: "",
  address: "",
};

const ADDRESS_TOKEN_ALIASES: Record<string, string> = {
  r: "rua",
  av: "avenida",
  trav: "travessa",
  tv: "travessa",
  al: "alameda",
  pc: "praca",
  pca: "praca",
  rod: "rodovia",
  est: "estrada",
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Endereço comparável: sem acento, sem caixa e com abreviações comuns expandidas. */
export function normalizeAddressSearch(value: string): string {
  return normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .map((token) => ADDRESS_TOKEN_ALIASES[token] ?? token)
    .join(" ");
}

function includesText(value: string | null | undefined, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  if (!value) return false;
  return normalizeSearchText(value).includes(normalizedQuery);
}

function includesDigits(value: string | null | undefined, digits: string): boolean {
  if (!digits) return false;
  if (!value) return false;
  return digitsOnly(value).includes(digits);
}

function addressHaystack(customer: CustomerSearchFields): string {
  return normalizeAddressSearch(formatCustomerAddress(customer.address, customer.complement));
}

function addressContains(customer: CustomerSearchFields, query: string): boolean {
  const normalizedQuery = normalizeAddressSearch(query);
  const haystack = addressHaystack(customer);
  if (!normalizedQuery || !haystack) return false;
  if (haystack.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(" ").filter((token) => token.length >= 2);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function matchesName(customer: CustomerSearchFields, query: string): boolean {
  return includesText(customer.name, query);
}

function matchesPhone(customer: CustomerSearchFields, query: string): boolean {
  const text = normalizeSearchText(query);
  if (!text) return true;

  const digits = digitsOnly(query);
  if (digits && includesDigits(customer.phone, digits)) return true;

  return includesText(formatPhoneDisplay(customer.phone), query);
}

function matchesDocument(customer: CustomerSearchFields, query: string): boolean {
  const text = normalizeSearchText(query);
  if (!text) return true;

  const digits = digitsOnly(query);
  if (digits && includesDigits(customer.cpfCnpj, digits)) return true;

  return includesText(customer.cpfCnpj, query);
}

function matchesAddress(customer: CustomerSearchFields, query: string): boolean {
  if (!normalizeAddressSearch(query)) return true;
  return addressContains(customer, query);
}

export function hasActiveCustomerFilters(filters: CustomerSearchFilters): boolean {
  return Boolean(
    filters.name.trim() ||
      filters.phone.trim() ||
      filters.document.trim() ||
      filters.address.trim()
  );
}

export function customerMatchesFilters(
  customer: CustomerSearchFields,
  filters: CustomerSearchFilters
): boolean {
  return (
    matchesName(customer, filters.name) &&
    matchesPhone(customer, filters.phone) &&
    matchesDocument(customer, filters.document) &&
    matchesAddress(customer, filters.address)
  );
}

export function filterCustomers<T extends CustomerSearchFields>(
  customers: T[],
  filters: CustomerSearchFilters
): T[] {
  if (!hasActiveCustomerFilters(filters)) return customers;
  return customers.filter((customer) => customerMatchesFilters(customer, filters));
}

/** Busca livre do pedido: nome, telefone ou endereço, sem diferenciar acento e caixa. */
export function customerMatchesFreeText(
  customer: CustomerSearchFields,
  query: string
): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;

  const text = normalizeSearchText(trimmed);
  const digits = digitsOnly(trimmed);
  const nameMatches = text.length > 0 && normalizeSearchText(customer.name).includes(text);
  const addressMatches = addressContains(customer, trimmed);
  const phoneMatches = digits.length >= 3 && includesDigits(customer.phone, digits);

  return nameMatches || addressMatches || phoneMatches;
}
