import { normalizeSearchText, searchTextIncludes } from "@/lib/searchText";
import type { DeliveryOrderSummary } from "@/lib/lists/types";

export function orderMatchesQuery(order: DeliveryOrderSummary, query: string): boolean {
  const term = query.trim();
  if (!term) return true;

  const fields = [
    order.customerName,
    order.phone,
    order.address,
    order.street,
    order.neighborhood,
    order.complement,
    order.number,
    order.id,
  ];
  if (fields.some((field) => searchTextIncludes(field, term))) return true;

  const digits = term.replace(/\D/g, "");
  if (digits.length >= 3) {
    const phoneDigits = order.phone.replace(/\D/g, "");
    if (phoneDigits.includes(digits)) return true;
  }

  return normalizeSearchText(order.number).includes(normalizeSearchText(term));
}

export function repeatedAddressKeys(orders: DeliveryOrderSummary[]): Set<string> {
  const unique = new Map<string, DeliveryOrderSummary>();
  for (const order of orders) unique.set(order.id, order);

  const counts = new Map<string, number>();
  for (const order of unique.values()) {
    if (!order.addressKey) continue;
    counts.set(order.addressKey, (counts.get(order.addressKey) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
}
