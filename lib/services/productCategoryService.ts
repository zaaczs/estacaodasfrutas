import { prisma } from "@/lib/db";

type CategoryPayload = {
  name: string;
  description?: string;
  active?: boolean;
};

function normalizeCategoryName(name: string) {
  return name.trim();
}

function getCategoryDelegate() {
  const prismaAny = prisma as unknown as {
    productCategory?: {
      findUnique: (...args: unknown[]) => Promise<unknown>;
      findMany: (...args: unknown[]) => Promise<unknown[]>;
      create: (...args: unknown[]) => Promise<unknown>;
      update: (...args: unknown[]) => Promise<unknown>;
      delete: (...args: unknown[]) => Promise<unknown>;
    };
  };
  return prismaAny.productCategory;
}

export async function syncManagedCategoriesFromProducts() {
  const delegate = getCategoryDelegate();
  if (!delegate) return;

  const productRows = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  for (const row of productRows) {
    const name = row.category.trim();
    if (!name) continue;
    await ensureCategoryExists(name);
  }
}

export async function ensureCategoryExists(name: string, description = "") {
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) return null;
  const delegate = getCategoryDelegate();
  if (!delegate) return null;

  const existing = await delegate.findUnique({
    where: { name: normalizedName },
  });
  if (existing) return existing;

  return delegate.create({
    data: {
      name: normalizedName,
      description: description || undefined,
      active: true,
    },
  });
}

export async function getInactiveCategoryNames() {
  const delegate = getCategoryDelegate();
  if (!delegate) return [];
  const rows = (await delegate.findMany({
    where: { active: false },
    select: { name: true },
  })) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export async function listProductCategories(options?: { activeOnly?: boolean }) {
  const delegate = getCategoryDelegate();
  if (!delegate) {
    const rows = await prisma.product.findMany({
      where: options?.activeOnly ? { active: true } : undefined,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r, idx) => ({
      id: `legacy-${idx}-${r.category}`,
      name: r.category,
      description: null,
      active: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }));
  }
  return (await delegate.findMany({
    where: options?.activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  })) as Array<{
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export async function createProductCategory(data: CategoryPayload) {
  const normalizedName = normalizeCategoryName(data.name);
  if (!normalizedName) throw new Error("Nome da categoria é obrigatório.");
  const delegate = getCategoryDelegate();
  if (!delegate) {
    throw new Error(
      "Categorias avançadas indisponíveis. Execute db:push e db:generate para atualizar o banco."
    );
  }

  return delegate.create({
    data: {
      name: normalizedName,
      description: data.description?.trim() || undefined,
      active: data.active ?? true,
    },
  });
}

export async function updateProductCategory(
  id: string,
  data: Partial<CategoryPayload>
) {
  const delegate = getCategoryDelegate();
  if (!delegate) {
    throw new Error(
      "Categorias avançadas indisponíveis. Execute db:push e db:generate para atualizar o banco."
    );
  }

  const existing = (await delegate.findUnique({
    where: { id },
    select: { name: true },
  })) as { name: string } | null;
  if (!existing) throw new Error("Categoria não encontrada.");

  const payload: {
    name?: string;
    description?: string | null;
    active?: boolean;
  } = {};

  if (data.name != null) {
    const normalizedName = normalizeCategoryName(data.name);
    if (!normalizedName) throw new Error("Nome da categoria é obrigatório.");
    payload.name = normalizedName;
  }
  if (data.description != null) {
    payload.description = data.description.trim() || null;
  }
  if (data.active != null) {
    payload.active = data.active;
  }

  if (payload.name && payload.name !== existing.name) {
    const updatedCategory = await delegate.update({
      where: { id },
      data: payload,
    });
    await prisma.product.updateMany({
      where: { category: existing.name },
      data: { category: payload.name },
    });
    return updatedCategory;
  }

  return delegate.update({
    where: { id },
    data: payload,
  });
}

export async function deleteProductCategory(id: string) {
  const delegate = getCategoryDelegate();
  if (!delegate) {
    throw new Error(
      "Categorias avançadas indisponíveis. Execute db:push e db:generate para atualizar o banco."
    );
  }

  const category = (await delegate.findUnique({
    where: { id },
    select: { id: true, name: true },
  })) as { id: string; name: string } | null;
  if (!category) throw new Error("Categoria não encontrada.");

  const products = await prisma.product.findMany({
    where: { category: category.name },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    if (productIds.length > 0) {
      await tx.stockMovement.deleteMany({
        where: { productId: { in: productIds } },
      });
      await tx.orderItem.deleteMany({
        where: { productId: { in: productIds } },
      });
      await tx.product.deleteMany({
        where: { id: { in: productIds } },
      });
    }
    await tx.productCategory.delete({
      where: { id },
    });
  });

  return { success: true, deletedProducts: productIds.length };
}

export async function getActiveCategoryOptionsForStorefront() {
  const delegate = getCategoryDelegate();
  const managed = delegate
    ? ((await delegate.findMany({
        where: { active: true },
        select: { name: true, description: true },
        orderBy: { name: "asc" },
      })) as Array<{ name: string; description: string | null }>)
    : [];
  const inactiveNames = await getInactiveCategoryNames();
  const productRows = await prisma.product.findMany({
    where: {
      active: true,
      ...(inactiveNames.length > 0 ? { category: { notIn: inactiveNames } } : {}),
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const map = new Map<string, { name: string; description: string | null }>();
  for (const row of managed) {
    map.set(row.name, { name: row.name, description: row.description ?? null });
  }
  for (const row of productRows) {
    const name = row.category.trim();
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, { name, description: null });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

