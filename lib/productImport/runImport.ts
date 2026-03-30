import type { PrismaClient } from "@prisma/client";
import { detectarCategoria } from "./detectarCategoria";
import { parseProdutosXlsxBuffer, type SheetProductRow } from "./parseProdutosXlsx";

export type ProductImportSummary = {
  totalLinhasPlanilha: number;
  criados: number;
  ignoradosDuplicados: number;
  erros: { linha: number; mensagem: string }[];
};

function chaveNome(nome: string): string {
  return nome.trim().toLowerCase();
}

export async function importProductsFromXlsxBuffer(
  prisma: PrismaClient,
  buffer: Buffer
): Promise<ProductImportSummary> {
  const parsed = parseProdutosXlsxBuffer(buffer);
  return importProductsFromRows(prisma, parsed);
}

export async function importProductsFromRows(
  prisma: PrismaClient,
  rows: SheetProductRow[]
): Promise<ProductImportSummary> {
  const existentes = await prisma.product.findMany({ select: { name: true } });
  const visto = new Set(existentes.map((p) => chaveNome(p.name)));

  let criados = 0;
  let ignoradosDuplicados = 0;
  const erros: ProductImportSummary["erros"] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const linhaPlanilha = i + 2;
    const key = chaveNome(row.name);

    if (visto.has(key)) {
      ignoradosDuplicados++;
      continue;
    }

    if (!Number.isFinite(row.price) || row.price < 0) {
      erros.push({ linha: linhaPlanilha, mensagem: "Preço inválido" });
      continue;
    }

    const categoria = row.category?.trim() || detectarCategoria(row.name);
    const unidade = row.unit?.trim() || "un";

    try {
      await prisma.product.create({
        data: {
          name: row.name.trim(),
          description: row.description?.trim() || null,
          imageUrl: null,
          category: categoria,
          unit: unidade,
          price: row.price,
          cost: 0,
          stock: 0,
          minStock: 0,
          active: true,
        },
      });
      visto.add(key);
      criados++;
    } catch (e) {
      erros.push({
        linha: linhaPlanilha,
        mensagem: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    totalLinhasPlanilha: rows.length,
    criados,
    ignoradosDuplicados,
    erros,
  };
}
