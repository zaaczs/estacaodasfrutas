import { PrismaClient } from "@prisma/client";
import { corrigirAcentuacaoNome } from "../lib/ptBrAccents";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function tokens(value: string): string[] {
  return value.match(/[A-Za-zÀ-ÿ]+/g) ?? [];
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const changes = products
    .map((product) => ({
      id: product.id,
      from: product.name,
      to: corrigirAcentuacaoNome(product.name),
    }))
    .filter((change) => change.from !== change.to);

  const tokenCounts = new Map<string, number>();
  for (const change of changes) {
    const before = tokens(change.from);
    const after = tokens(change.to);
    const limit = Math.max(before.length, after.length);
    for (let index = 0; index < limit; index += 1) {
      if (before[index] === after[index]) continue;
      const key = `${before[index] ?? "?"} → ${after[index] ?? "?"}`;
      tokenCounts.set(key, (tokenCounts.get(key) ?? 0) + 1);
    }
  }

  console.log(`${apply ? "Aplicando" : "Simulação"}: ${changes.length} de ${products.length} produtos`);
  const substitutions = [...tokenCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [label, count] of substitutions) {
    console.log(`${count}\t${label}`);
  }

  if (!apply) {
    console.log("Nada foi gravado. Rode com --apply para atualizar os nomes.");
    return;
  }

  const chunkSize = 40;
  for (let index = 0; index < changes.length; index += chunkSize) {
    const chunk = changes.slice(index, index + chunkSize);
    await prisma.$transaction(
      chunk.map((change) =>
        prisma.product.update({
          where: { id: change.id },
          data: { name: change.to },
        })
      )
    );
  }

  console.log(`Nomes atualizados: ${changes.length}. IDs e vínculos preservados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
