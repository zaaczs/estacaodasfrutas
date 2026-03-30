import { NextResponse } from "next/server";
import { getActiveCategoryOptionsForStorefront } from "@/lib/services/productCategoryService";

export async function GET() {
  try {
    const categories = await getActiveCategoryOptionsForStorefront();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/product-categories/public:", error);
    return NextResponse.json(
      { error: "Erro ao listar categorias públicas" },
      { status: 500 }
    );
  }
}

