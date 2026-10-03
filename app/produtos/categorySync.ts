export const PRODUCT_CATEGORIES_UPDATED = "product-categories-updated";

export function publishProductCategories(names: string[]) {
  window.dispatchEvent(
    new CustomEvent<string[]>(PRODUCT_CATEGORIES_UPDATED, { detail: names })
  );
}

export function mergeCategoryNames(current: string[], incoming: string[]) {
  const names = new Set(current.map((name) => name.trim()).filter(Boolean));
  for (const name of incoming) {
    const trimmed = name.trim();
    if (trimmed) names.add(trimmed);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
