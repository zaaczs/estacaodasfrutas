import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markFiadoOrderAsPaid } from "@/lib/services/orderService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const { id } = await params;
    const order = await markFiadoOrderAsPaid(id);
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao marcar pedido como pago";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
