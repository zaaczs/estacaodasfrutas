/**
 * Comparação de busca: ignora maiúsculas/minúsculas, acentos e pontuação.
 * "MAMÃO", "mamão", "mamao" e "MAMãO" viram a mesma chave.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTextIncludes(
  value: string | null | undefined,
  query: string
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || !value) return false;
  return normalizeSearchText(value).includes(normalizedQuery);
}
