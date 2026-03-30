import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProducts,
  createProduct,
  CreateProductInput,
} from "@/lib/services/productService";

export async function GET(request: NextRequest) {
  try {
    // GET produtos é público (para a tela do cliente)
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const session = await getServerSession(authOptions);
    const maxLimit = session ? 5000 : 400;
    const defaultLimit = session ? 2000 : 250;
    const limitRaw = Number(searchParams.get("limit") ?? String(defaultLimit));
    const skipRaw = Number(searchParams.get("skip") ?? "0");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(maxLimit, Math.max(1, Math.floor(limitRaw)))
      : defaultLimit;
    const skip = Number.isFinite(skipRaw) ? Math.max(0, Math.floor(skipRaw)) : 0;

    const products = await getProducts({
      search,
      category,
      activeOnly,
      take: limit,
      skip,
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json(
      { error: "Erro ao buscar produtos" },
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

    const body = (await request.json()) as CreateProductInput;

    if (!body.name || !body.category || !body.unit || body.price == null || body.cost == null) {
      return NextResponse.json(
        { error: "Campos obrigatórios: name, category, unit, price, cost" },
        { status: 400 }
      );
    }

    const product = await createProduct({
      name: body.name,
      description: body.description,
      imageUrl: body.imageUrl,
      complements: body.complements,
      category: body.category,
      unit: body.unit,
      price: Number(body.price),
      cost: Number(body.cost),
      stock: body.stock != null ? Number(body.stock) : 0,
      minStock: body.minStock != null ? Number(body.minStock) : 0,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json(
      { error: "Erro ao criar produto" },
      { status: 500 }
    );
  }
}
