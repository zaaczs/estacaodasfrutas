import { normalizeProductUnit } from "@/lib/productUnit";

export function isWeightUnit(unit: string | null | undefined): boolean {
  return normalizeProductUnit(unit) === "kg";
}

/** Aceita "0,5", "1", "1,250" e "2.5". A vírgula é o separador decimal. */
export function parseQuantityInput(
  raw: string,
  unit: string | null | undefined
): number | null {
  const trimmed = raw.trim().replace(/\s/g, "");
  if (!trimmed || /[.,]$/.test(trimmed)) return null;

  let normalized = trimmed;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    const decimalIsComma = normalized.lastIndexOf(",") > normalized.lastIndexOf(".");
    normalized = decimalIsComma
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  if (isWeightUnit(unit)) {
    const rounded = Math.round(value * 1000) / 1000;
    return rounded > 0 ? rounded : null;
  }

  return Number.isInteger(value) ? value : null;
}

export function formatQuantity(value: number, unit?: string | null): string {
  const decimals = isWeightUnit(unit) || !Number.isInteger(value) ? 3 : 0;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function sumLineAmounts(
  items: Array<{ quantity: number; price: number }>
): number {
  const total = items.reduce((sum, item) => sum + lineAmount(item.quantity, item.price), 0);
  return Math.round(total * 100) / 100;
}
