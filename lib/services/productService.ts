import { prisma } from "@/lib/db";
import { normalizeSearchText } from "@/lib/searchText";
import { Prisma, type Product } from "@prisma/client";
import {
  ensureCategoryExists,
  getActiveCategoryOptionsForStorefront,
  getInactiveCategoryNames,
  listProductCategories,
} from "./productCategoryService";

export type CreateProductInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  complements?: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
};

export type UpdateProductInput = Partial<CreateProductInput> & { active?: boolean };

function matchesProductSearch(
  product: { name: string; category: string },
  search: string
): boolean {
  const query = normalizeSearchText(search);
  if (!query) return true;
  return (
    normalizeSearchText(product.name).includes(query) ||
    normalizeSearchText(product.category).includes(query)
  );
}

async function buildProductWhere(options?: {
  category?: string;
  activeOnly?: boolean;
}): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (options?.category) {
    and.push({ category: options.category });
  }

  if (options?.activeOnly !== false) {
    where.active = true;
    const inactiveNames = await getInactiveCategoryNames();
    if (inactiveNames.length > 0) {
      and.push({ category: { notIn: inactiveNames } });
    }
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

async function listSearchCandidates(where: Prisma.ProductWhereInput) {
  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true },
  });
}

export async function getProducts(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  take?: number;
  skip?: number;
}) {
  const where = await buildProductWhere(options);
  const search = options?.search?.trim() ?? "";

  if (!search) {
    return prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: options?.take,
      skip: options?.skip,
    });
  }

  const matches = (await listSearchCandidates(where)).filter((product) =>
    matchesProductSearch(product, search)
  );
  const skip = options?.skip ?? 0;
  const page = options?.take == null ? matches.slice(skip) : matches.slice(skip, skip + options.take);
  const ids = page.map((product) => product.id);
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
  });
  const order = new Map(ids.map((id, index) => [id, index]));
  products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return products;
}

export async function countProducts(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}) {
  const where = await buildProductWhere(options);
  const search = options?.search?.trim() ?? "";
  if (!search) {
    return prisma.product.count({ where });
  }

  const products = await listSearchCandidates(where);
  return products.filter((product) => matchesProductSearch(product, search)).length;
}

export async function getActiveProductCategories(): Promise<
  Array<{ name: string; description: string | null }>
> {
  const rows = await getActiveCategoryOptionsForStorefront();
  return rows.map((row) => ({
    name: row.name,
    description: row.description?.trim() || null,
  }));
}

export async function getProductCategories(options?: {
  activeOnly?: boolean;
}): Promise<string[]> {
  const activeOnly = options?.activeOnly !== false;
  const [managed, inactiveNames, rows] = await Promise.all([
    listProductCategories({ activeOnly }),
    activeOnly ? getInactiveCategoryNames() : Promise.resolve([]),
    prisma.product.findMany({
      where: activeOnly ? { active: true } : {},
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const names = new Set<string>();
  for (const category of managed) {
    const name = category.name?.trim();
    if (name) names.add(name);
  }
  for (const row of rows) {
    const name = row.category?.trim();
    if (!name || inactiveNames.includes(name)) continue;
    names.add(name);
  }

  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function countActiveProducts(whereExtra?: Prisma.ProductWhereInput) {
  return prisma.product.count({
    where: { active: true, ...whereExtra },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { stockMovements: { take: 10, orderBy: { createdAt: "desc" } } },
  });
}

export async function createProduct(data: CreateProductInput) {
  await ensureCategoryExists(data.category);
  return prisma.product.create({
    data: {
      ...data,
      stock: data.stock ?? 0,
      minStock: data.minStock ?? 0,
    },
  });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  if (typeof data.category === "string" && data.category.trim()) {
    await ensureCategoryExists(data.category);
  }
  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function moveProductsToCategory(ids: string[], category: string) {
  const name = category.trim();
  if (!name) throw new Error("Categoria é obrigatória");

  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) throw new Error("Selecione ao menos um produto");
  if (uniqueIds.length > 200) throw new Error("Selecione no máximo 200 produtos por vez");

  await ensureCategoryExists(name);
  const result = await prisma.product.updateMany({
    where: { id: { in: uniqueIds } },
    data: { category: name },
  });

  return { updated: result.count, category: name };
}

export type DeleteProductResult =
  | { mode: "deleted" }
  | { mode: "inactivated"; product: Product };

/**
 * Exclui o produto se nunca tiver entrado em pedidos.
 * Caso existam itens de pedido (histórico), apenas inativa — pedidos antigos
 * precisam manter a referência ao registro.
 */
export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  return prisma.$transaction(async (tx) => {
    const orderItemCount = await tx.orderItem.count({ where: { productId: id } });
    if (orderItemCount > 0) {
      const product = await tx.product.update({
        where: { id },
        data: { active: false },
      });
      return { mode: "inactivated" as const, product };
    }

    await tx.stockMovement.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
    return { mode: "deleted" as const };
  });
}

export async function getProductsLowStock() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { stock: "asc" },
  });
  return products.filter((p) => p.stock <= p.minStock);
}
