import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/services/orderService";

const ALLOWED = new Set(["RECEIVED", "PREPARING", "OUT_FOR_DELIVERY"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = (await request.json()) as { status?: string };
    if (!body?.status || !ALLOWED.has(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const { id } = await params;
    const order = await updateOrderStatus(
      id,
      body.status as "RECEIVED" | "PREPARING" | "OUT_FOR_DELIVERY"
    );
    return NextResponse.json(order);
  } catch (error) {
    console.error("POST /api/orders/[id]/status:", error);
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
  }
}
