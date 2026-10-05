import { NextRequest, NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/requireInternalUser";
import { DeliveryListError, markDeliveryListPrinted } from "@/lib/services/deliveryListService";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const list = await markDeliveryListPrinted(id);
    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof DeliveryListError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/delivery-lists/[id]/printed:", error);
    return NextResponse.json({ error: "Erro ao registrar impressão" }, { status: 500 });
  }
}
