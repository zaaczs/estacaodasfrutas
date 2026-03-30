import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFiadoOpenByCustomer } from "@/lib/services/orderService";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }

    const data = await listFiadoOpenByCustomer();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/fiado:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos fiado" }, { status: 500 });
  }
}
