import { prisma } from "@/lib/db";
import { detectarCategoria } from "@/lib/productImport/detectarCategoria";

async function main() {
  const rows = await prisma.product.findMany({
    select: { id: true, name: true, category: true },
  });

  const targets = rows
    .map((p) => ({
      id: p.id,
      from: p.category,
      to: detectarCategoria(p.name),
      name: p.name,
    }))
    .filter((p) => (p.to === "Bebidas" || p.to === "Polpas") && p.from !== p.to);

  for (const item of targets) {
    await prisma.product.update({
      where: { id: item.id },
      data: { category: item.to },
    });
  }

  const totalBebidas = await prisma.product.count({ where: { category: "Bebidas", active: true } });
  const totalPolpas = await prisma.product.count({ where: { category: "Polpas", active: true } });

  console.log(
    JSON.stringify(
      {
        atualizados: targets.length,
        bebidasAtivos: totalBebidas,
        polpasAtivos: totalPolpas,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Falha ao recategorizar produtos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
