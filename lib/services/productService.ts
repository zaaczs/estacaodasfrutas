import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
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

async function buildProductWhere(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {};
  const and: Prisma.ProductWhereInput[] = [];

  if (options?.search) {
    const q = options.search.trim();
    where.OR = [{ name: { contains: q } }, { category: { contains: q } }];
  }

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

export async function getProducts(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  take?: number;
  skip?: number;
}) {
  const where = await buildProductWhere(options);

  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    take: options?.take,
    skip: options?.skip,
  });
}

export async function countProducts(options?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
}) {
  const where = await buildProductWhere(options);
  return prisma.product.count({
    where,
  });
}

export async function getActiveProductCategories(): Promise<string[]> {
  const rows = await getActiveCategoryOptionsForStorefront();
  return rows.map((r) => r.name);
}

export async function getProductCategories(options?: {
  activeOnly?: boolean;
}): Promise<string[]> {
  const inactiveNames =
    options?.activeOnly === false ? [] : await getInactiveCategoryNames();
  const rows = await prisma.product.findMany({
    where: {
      ...(options?.activeOnly === false ? {} : { active: true }),
      ...(inactiveNames.length > 0 ? { category: { notIn: inactiveNames } } : {}),
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  if (options?.activeOnly === false) {
    const managed = await listProductCategories();
    const merged = new Set<string>(managed.map((c) => c.name));
    for (const row of rows) merged.add(row.category);
    return Array.from(merged).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  return rows.map((r) => r.category);
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

export async function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  });
}

export async function getProductsLowStock() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { stock: "asc" },
  });
  return products.filter((p) => p.stock <= p.minStock);
}
