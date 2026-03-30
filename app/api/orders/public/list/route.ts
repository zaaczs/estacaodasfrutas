import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrdersByCustomerUserId,
  getPublicOrdersByPhone,
} from "@/lib/services/orderService";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const phoneQuery = request.nextUrl.searchParams.get("phone") ?? "";

    if (session?.user?.id) {
      const orders = await getOrdersByCustomerUserId(session.user.id);
      return NextResponse.json(orders);
    }

    const phoneDigits = normalizePhoneDigits(phoneQuery);
    if (!isValidPhoneDigits(phoneDigits)) {
      return NextResponse.json(
        {
          error:
            "Informe telefone com DDD para consultar pedidos sem login.",
        },
        { status: 400 }
      );
    }

    const orders = await getPublicOrdersByPhone(phoneDigits);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/orders/public/list:", error);
    return NextResponse.json(
      { error: "Erro ao listar pedidos" },
      { status: 500 }
    );
  }
}
