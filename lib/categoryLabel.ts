export type CategoryOption = {
  name: string;
  description?: string | null;
};

/** O pedido exibe a descrição quando ela foi preenchida; senão, o nome da categoria. */
export function categoryOptionLabel(category: CategoryOption): string {
  const description = category.description?.trim();
  return description || category.name;
}

export function parseCategoryOptions(data: unknown): CategoryOption[] {
  if (!Array.isArray(data)) return [];
  const options: CategoryOption[] = [];
  for (const item of data) {
    if (typeof item === "string") {
      const name = item.trim();
      if (name) options.push({ name, description: null });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const raw = item as { name?: unknown; description?: unknown };
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) continue;
    options.push({
      name,
      description: typeof raw.description === "string" ? raw.description : null,
    });
  }
  return options;
}
