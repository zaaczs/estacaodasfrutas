import { prisma } from "@/lib/db";

async function main() {
  const rows = await prisma.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      imageUrl: true,
      description: true,
      stock: true,
      minStock: true,
    },
  });

  let changedImages = 0;
  let changedDescriptions = 0;
  let changedStock = 0;

  const brokenImage = (url: string | null) =>
    !url || url.includes("source.unsplash.com") || url.trim() === "";

  const tasks = rows.map((p) => async () => {
    const data: {
      imageUrl?: string | null;
      description?: string;
      stock?: number;
      minStock?: number;
    } = {};

    if (brokenImage(p.imageUrl)) {
      data.imageUrl = null;
      changedImages++;
    }

    if (!p.description || !p.description.trim()) {
      data.description = `Produto da categoria ${p.category}. Unidade: ${p.unit}.`;
      changedDescriptions++;
    }

    if (p.stock <= 0) {
      data.stock = 25;
      if (p.minStock <= 0) data.minStock = 5;
      changedStock++;
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data,
      });
    }
  });

  const batchSize = 50;
  for (let i = 0; i < tasks.length; i += batchSize) {
    await Promise.all(tasks.slice(i, i + batchSize).map((fn) => fn()));
  }

  const withStock = await prisma.product.count({
    where: { active: true, stock: { gt: 0 } },
  });

  console.log(
    JSON.stringify(
      {
        totalProdutos: rows.length,
        imagensAtualizadas: changedImages,
        descricoesAtualizadas: changedDescriptions,
        estoquesAtualizados: changedStock,
        ativosComEstoque: withStock,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Falha ao popular dados de teste dos produtos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
