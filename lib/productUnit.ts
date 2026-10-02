export const PRODUCT_UNITS = [
  { value: "kg", label: "kg (quilograma)" },
  { value: "un", label: "un (unidade)" },
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

export function normalizeProductUnit(
  value: string | undefined | null
): ProductUnit {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "kg" || v === "kilo" || v === "quilo" || v === "kilograma") {
    return "kg";
  }
  return "un";
}

export function calcProductProfit(price: string | number, cost: string | number) {
  const priceValue = Number(price);
  const costValue = Number(cost);
  const sale = Number.isFinite(priceValue) ? priceValue : 0;
  const purchase = Number.isFinite(costValue) ? costValue : 0;
  const profit = sale - purchase;
  const margin = sale > 0 ? (profit / sale) * 100 : null;
  return { sale, purchase, profit, margin };
}
