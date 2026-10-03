import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { moveProductsToCategory } from "@/lib/services/productService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as { ids?: string[]; category?: string };
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const category = body.category?.trim() ?? "";

    if (!category || ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a categoria e ao menos um produto" },
        { status: 400 }
      );
    }

    const result = await moveProductsToCategory(ids, category);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/products/bulk-category:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao mover produtos" },
      { status: 500 }
    );
  }
}
