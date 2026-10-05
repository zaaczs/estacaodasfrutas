import { NextRequest, NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/requireInternalUser";
import { DeliveryListError, setDeliveryItemRouteStatus } from "@/lib/services/deliveryListService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const { id, itemId } = await params;
    const body = await request.json();
    const list = await setDeliveryItemRouteStatus(id, itemId, String(body.routeStatus ?? ""));
    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof DeliveryListError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("PATCH /api/delivery-lists/[id]/items/[itemId]:", error);
    return NextResponse.json({ error: "Erro ao atualizar a entrega" }, { status: 500 });
  }
}
