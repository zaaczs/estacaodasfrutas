export type ProductComplementOption = {
  id: string;
  name: string;
  priceDelta?: number;
};

export type ProductComplementGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ProductComplementOption[];
};

export function parseProductComplements(raw: string | null | undefined): ProductComplementGroup[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((g) => normalizeGroup(g))
      .filter((g): g is ProductComplementGroup => g != null && g.options.length > 0);
  } catch {
    return [];
  }
}

export function stringifyProductComplements(groups: ProductComplementGroup[]): string | undefined {
  const normalized = groups
    .map((g) => normalizeGroup(g))
    .filter((g): g is ProductComplementGroup => g != null && g.options.length > 0);
  if (!normalized.length) return undefined;
  return JSON.stringify(normalized);
}

function normalizeGroup(input: unknown): ProductComplementGroup | null {
  if (!input || typeof input !== "object") return null;
  const g = input as Record<string, unknown>;
  const name = String(g.name ?? "").trim();
  if (!name) return null;
  const minSelect = toInt(g.minSelect, 0);
  const maxSelect = Math.max(minSelect, toInt(g.maxSelect, 1));
  const optionsRaw = Array.isArray(g.options) ? g.options : [];
  const options = optionsRaw
    .map((o) => normalizeOption(o))
    .filter((o): o is ProductComplementOption => o != null);
  return {
    id: String(g.id ?? cryptoLikeId()),
    name,
    minSelect,
    maxSelect,
    options,
  };
}

function normalizeOption(input: unknown): ProductComplementOption | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  return {
    id: String(o.id ?? cryptoLikeId()),
    name,
    priceDelta: toNumber(o.priceDelta, 0),
  };
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function cryptoLikeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
