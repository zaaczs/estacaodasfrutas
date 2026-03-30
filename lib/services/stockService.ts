import { prisma } from "@/lib/db";
import { MovementType } from "@/lib/constants";

export type CreateMovementInput = {
  productId: string;
  type: string;
  quantity: number;
};

export async function getMovements(options?: {
  productId?: string;
  type?: string;
  limit?: number;
}) {
  const where: { productId?: string; type?: string } = {};

  if (options?.productId) where.productId = options.productId;
  if (options?.type) where.type = options.type;

  return prisma.stockMovement.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
  });
}

export async function createMovement(data: CreateMovementInput) {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
  });

  if (!product) throw new Error("Produto não encontrado");

  let newStock = product.stock;

  if (data.type === MovementType.ENTRY) {
    newStock += data.quantity;
  } else if (data.type === MovementType.ADJUSTMENT) {
    newStock += data.quantity;
  } else if (data.type === MovementType.SALE) {
    newStock += data.quantity; // quantity here is typically negative for sale
    if (newStock < 0) throw new Error("Estoque não pode ficar negativo");
  }

  if (newStock < 0) throw new Error("Estoque não pode ficar negativo");

  const [movement] = await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
      },
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: { stock: newStock },
    }),
  ]);

  return movement;
}

export async function addStock(productId: string, quantity: number) {
  return createMovement({
    productId,
    type: MovementType.ENTRY,
    quantity,
  });
}

export async function adjustStock(productId: string, quantity: number) {
  return createMovement({
    productId,
    type: MovementType.ADJUSTMENT,
    quantity,
  });
}

export async function removeStock(productId: string, quantity: number) {
  return createMovement({
    productId,
    type: MovementType.SALE,
    quantity: -Math.abs(quantity),
  });
}
