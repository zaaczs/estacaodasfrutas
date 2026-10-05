import { NextRequest, NextResponse } from "next/server";
import { businessTodayInput } from "@/lib/lists/businessDate";
import { requireInternalUser } from "@/lib/requireInternalUser";
import { DeliveryListError, listDeliveryOrders } from "@/lib/services/deliveryListService";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const date = request.nextUrl.searchParams.get("date") || businessTodayInput();
    const orders = await listDeliveryOrders(date);
    return NextResponse.json({ date, orders });
  } catch (error) {
    if (error instanceof DeliveryListError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/delivery-lists/orders:", error);
    return NextResponse.json({ error: "Erro ao buscar pedidos do dia" }, { status: 500 });
  }
}
