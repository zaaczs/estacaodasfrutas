import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { finishOrder } from "@/lib/services/orderService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const order = await finishOrder(id);

    return NextResponse.json(order);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao finalizar pedido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
