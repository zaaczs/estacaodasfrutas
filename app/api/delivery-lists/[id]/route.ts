import { NextRequest, NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/requireInternalUser";
import {
  DeliveryListError,
  getDeliveryList,
  updateDeliveryList,
} from "@/lib/services/deliveryListService";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof DeliveryListError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const list = await getDeliveryList(id);
    return NextResponse.json(list);
  } catch (error) {
    return errorResponse(error, "Erro ao buscar lista");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const result = await updateDeliveryList(id, {
      name: String(body.name ?? ""),
      type: String(body.type ?? ""),
      status: body.status ? String(body.status) : undefined,
      serviceDate: String(body.serviceDate ?? ""),
      orderIds: Array.isArray(body.orderIds) ? body.orderIds.map(String) : [],
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Erro ao salvar lista");
  }
}
