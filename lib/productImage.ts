/** Gera miniatura local (data URL) — não depende de Unsplash/CDN. */
export function buildProductPlaceholderDataUrl(
  productName: string,
  width = 400,
  height = 300
): string {
  const label = productName
    .trim()
    .slice(0, width < 120 ? 12 : 28)
    .replace(/[<>&'"]/g, "")
    .replace(/\s+/g, " ");
  const safe = escapeXml(label || "Produto");
  const fs = Math.max(9, Math.min(16, Math.round(width / 14)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#e8f5e9"/><text x="${width / 2}" y="${height / 2}" dominant-baseline="middle" text-anchor="middle" fill="#2e7d32" font-family="system-ui,Segoe UI,sans-serif" font-size="${fs}" font-weight="600">${safe}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Domínios que costumam falhar ou redirecionar de forma que quebra em img. */
const BROKEN_HOSTS = ["source.unsplash.com"];

export function getProductDisplayImageUrl(
  imageUrl: string | null | undefined,
  productName: string,
  placeholderW?: number,
  placeholderH?: number
): string {
  const u = imageUrl?.trim();
  if (!u)
    return buildProductPlaceholderDataUrl(
      productName,
      placeholderW ?? 400,
      placeholderH ?? 300
    );
  // Caminho do próprio app: /api/product-images/:id ou arquivo estático já publicado.
  if (u.startsWith("/")) return u;
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (BROKEN_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return buildProductPlaceholderDataUrl(
        productName,
        placeholderW ?? 400,
        placeholderH ?? 300
      );
    }
  } catch {
    return buildProductPlaceholderDataUrl(
      productName,
      placeholderW ?? 400,
      placeholderH ?? 300
    );
  }
  return u;
}
