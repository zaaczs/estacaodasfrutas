import { formatPhoneDisplay } from "@/lib/phone";

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

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function includesText(value: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!value) return false;
  return normalizeText(value).includes(query);
}

function includesDigits(value: string | null | undefined, digits: string): boolean {
  if (!digits) return false;
  if (!value) return false;
  return digitsOnly(value).includes(digits);
}

function matchesName(customer: CustomerSearchFields, query: string): boolean {
  return includesText(customer.name, normalizeText(query));
}

function matchesPhone(customer: CustomerSearchFields, query: string): boolean {
  const text = normalizeText(query);
  if (!text) return true;

  const digits = digitsOnly(query);
  if (digits && includesDigits(customer.phone, digits)) return true;

  return includesText(formatPhoneDisplay(customer.phone), text);
}

function matchesDocument(customer: CustomerSearchFields, query: string): boolean {
  const text = normalizeText(query);
  if (!text) return true;

  const digits = digitsOnly(query);
  if (digits && includesDigits(customer.cpfCnpj, digits)) return true;

  return includesText(customer.cpfCnpj, text);
}

function matchesAddress(customer: CustomerSearchFields, query: string): boolean {
  const text = normalizeText(query);
  if (!text) return true;
  return includesText(customer.address, text) || includesText(customer.complement, text);
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
