import { NextResponse } from "next/server";
import { getActiveProductCategories } from "@/lib/services/productService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getActiveProductCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/products/categories:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}
