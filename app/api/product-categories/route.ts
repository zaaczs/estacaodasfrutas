import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createProductCategory,
  listProductCategories,
  syncManagedCategoriesFromProducts,
} from "@/lib/services/productCategoryService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const activeOnly = request.nextUrl.searchParams.get("activeOnly") === "true";
    await syncManagedCategoriesFromProducts();
    const categories = await listProductCategories({ activeOnly });
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        active: true,
      },
      orderBy: { name: "asc" },
    });

    const byCategory = new Map<
      string,
      Array<{ id: string; name: string; active: boolean }>
    >();
    for (const product of products) {
      const key = product.category?.trim();
      if (!key) continue;
      const list = byCategory.get(key) ?? [];
      list.push({ id: product.id, name: product.name, active: product.active });
      byCategory.set(key, list);
    }

    const payload = categories.map((category) => {
      const categoryProducts = byCategory.get(category.name) ?? [];
      return {
        ...category,
        productCount: categoryProducts.length,
        products: categoryProducts,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/product-categories:", error);
    return NextResponse.json(
      { error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Somente administradores podem criar categorias" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      active?: boolean;
    };
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      );
    }

    const created = await createProductCategory({
      name: body.name,
      description: body.description,
      active: body.active,
    });
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST /api/product-categories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}

