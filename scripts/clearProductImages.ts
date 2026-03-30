import { prisma } from "@/lib/db";

async function main() {
  const result = await prisma.product.updateMany({
    data: { imageUrl: null },
  });

  console.log(
    JSON.stringify(
      {
        imagensRemovidas: result.count,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Falha ao limpar imagens dos produtos:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
