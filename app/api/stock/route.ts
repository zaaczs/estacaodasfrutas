import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMovements,
  addStock,
  adjustStock,
  removeStock,
  CreateMovementInput,
} from "@/lib/services/stockService";
import { MovementType } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const movements = await getMovements({ productId, type, limit });
    return NextResponse.json(movements);
  } catch (error) {
    console.error("GET /api/stock:", error);
    return NextResponse.json(
      { error: "Erro ao buscar movimentações" },
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

    const body = (await request.json()) as CreateMovementInput;

    if (!body.productId || !body.type || body.quantity == null) {
      return NextResponse.json(
        { error: "Campos obrigatórios: productId, type, quantity" },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity);
    const movement = await (body.type === MovementType.ENTRY
      ? addStock(body.productId, quantity)
      : body.type === MovementType.SALE
      ? removeStock(body.productId, quantity)
      : adjustStock(body.productId, quantity));

    return NextResponse.json(movement);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao registrar movimentação";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
