import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { resolveProdutosXlsxPath } from "../lib/productImport/resolveProdutosXlsxPath";
import { importProductsFromXlsxBuffer } from "../lib/productImport/runImport";

async function main() {
  const caminho = resolveProdutosXlsxPath();
  if (!caminho) {
    console.error(
      "Arquivo não encontrado. Coloque produtos.xlsx (ou PRODUTOS.xlsx) na raiz do projeto."
    );
    process.exit(1);
  }

  console.log("Lendo:", caminho);
  const buffer = readFileSync(caminho);
  const prisma = new PrismaClient();

  try {
    const resumo = await importProductsFromXlsxBuffer(prisma, buffer);
    console.log("— Importação concluída —");
    console.log("Linhas válidas na planilha:", resumo.totalLinhasPlanilha);
    console.log("Produtos criados:", resumo.criados);
    console.log("Ignorados (já existiam pelo nome):", resumo.ignoradosDuplicados);
    if (resumo.erros.length) {
      console.log("Erros:", resumo.erros.length);
      resumo.erros.slice(0, 20).forEach((e) =>
        console.log(`  Linha ${e.linha}: ${e.mensagem}`)
      );
      if (resumo.erros.length > 20) console.log("  …");
    }
  } catch (e) {
    console.error("Falha na importação:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
