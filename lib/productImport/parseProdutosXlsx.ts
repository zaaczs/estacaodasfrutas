import * as XLSX from "xlsx";
import { detectarCategoria } from "./detectarCategoria";
import { inferirUnidade } from "./inferirUnidade";
import { limparNomeProdutoPlanilha } from "./limparNomeProduto";
import { parsePreco } from "./parsePreco";

export type SheetProductRow = {
  name: string;
  price: number;
  category: string;
  unit: string;
  description?: string;
};

type RawRow = Record<string, unknown>;

type FieldKey = "name" | "price" | "category" | "unit" | "description";

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  name: ["nome", "produto", "item", "mercadoria", "merchandise"],
  price: [
    "preco",
    "preço",
    "valor",
    "venda",
    "p venda",
    "pvenda",
    "preco venda",
    "vlr",
    "tabela",
    "oferta",
  ],
  category: ["categoria", "tipo", "grupo", "familia", "família", "setor", "secao", "seção"],
  unit: ["unidade", "uni", "medida", "um", "und", "unid"],
  description: ["obs", "observacao", "observação", "detalhes", "complemento"],
};

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function headerMatchesField(normalizedHeader: string, field: FieldKey): boolean {
  const aliases = FIELD_ALIASES[field];
  return aliases.some(
    (a) =>
      normalizedHeader === a ||
      normalizedHeader.startsWith(`${a} `) ||
      normalizedHeader.includes(a)
  );
}

function mapHeaders(rawHeaders: string[]): Record<FieldKey, string | undefined> {
  const out: Record<FieldKey, string | undefined> = {
    name: undefined,
    price: undefined,
    category: undefined,
    unit: undefined,
    description: undefined,
  };

  const fields: FieldKey[] = ["name", "price", "category", "unit", "description"];
  for (const field of fields) {
    for (const h of rawHeaders) {
      if (!h || String(h).trim() === "") continue;
      const n = normalizeHeader(String(h));
      if (field === "price" && n.includes("tribut")) continue;
      if (headerMatchesField(n, field)) {
        out[field] = String(h);
        break;
      }
    }
  }

  return out;
}

function sheetHasProdutoColumn(headers: string[]): boolean {
  return headers.some((h) => normalizeHeader(h).includes("produto"));
}

function resolverCategoria(
  valorCelula: string,
  nomeLimpo: string
): string {
  const detectada = detectarCategoria(nomeLimpo);
  if (detectada === "Bebidas" || detectada === "Polpas") return detectada;
  const v = valorCelula.trim();
  if (v && !/^\d+([.,]\d+)?$/.test(v)) return v;
  return detectada;
}

function parseRowsFromSheet(rows: RawRow[], colMap: Record<FieldKey, string | undefined>): SheetProductRow[] {
  if (!colMap.name) return [];

  const out: SheetProductRow[] = [];
  const headers = Object.keys(rows[0] ?? {});

  for (const row of rows) {
    const nameRaw = String(row[colMap.name] ?? "").trim();
    if (!nameRaw) continue;

    const name = limparNomeProdutoPlanilha(nameRaw);
    if (!name) continue;

    const priceRaw = colMap.price != null ? row[colMap.price] : undefined;
    let price = parsePreco(priceRaw);
    if (price == null) {
      const tabelaCol = headers.find(
        (h) =>
          normalizeHeader(h).includes("tabela") && normalizeHeader(h).includes("1")
      );
      if (tabelaCol) price = parsePreco(row[tabelaCol]);
    }
    if (price == null) continue;

    let unit = colMap.unit != null ? String(row[colMap.unit] ?? "").trim() : "";
    if (!unit) unit = inferirUnidade(name);
    else unit = unit.toLowerCase() === "un" ? "un" : unit;

    const catCell =
      colMap.category != null ? String(row[colMap.category] ?? "").trim() : "";
    const category = resolverCategoria(catCell, name);

    const description =
      colMap.description != null
        ? String(row[colMap.description] ?? "").trim()
        : "";

    out.push({
      name,
      price,
      category,
      unit,
      description: description || undefined,
    });
  }

  return out;
}

/**
 * Lê todas as abas com coluna de produto (planilhas exportadas com várias "Table N").
 */
export function parseProdutosXlsxBuffer(buffer: Buffer): SheetProductRow[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const visto = new Set<string>();
  const merged: SheetProductRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);
    if (!sheetHasProdutoColumn(headers)) continue;

    const colMap = mapHeaders(headers);

    if (!colMap.name) {
      const h0 = normalizeHeader(headers[0] ?? "");
      if (h0.includes("produto")) colMap.name = headers[0];
    }

    if (!colMap.name) continue;

    const slice = parseRowsFromSheet(rows, colMap);
    for (const item of slice) {
      const k = item.name.trim().toLowerCase();
      if (visto.has(k)) continue;
      visto.add(k);
      merged.push(item);
    }
  }

  return merged;
}
