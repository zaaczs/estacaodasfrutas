import { NextRequest, NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/requireInternalUser";
import {
  createDeliveryList,
  DeliveryListError,
  listDeliveryLists,
} from "@/lib/services/deliveryListService";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof DeliveryListError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const params = request.nextUrl.searchParams;
    const lists = await listDeliveryLists({
      date: params.get("date") || undefined,
      type: params.get("type") || undefined,
      status: params.get("status") || undefined,
    });
    return NextResponse.json({ lists });
  } catch (error) {
    return errorResponse(error, "Erro ao buscar listas");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInternalUser();
    if (auth.error) return auth.error;

    const body = await request.json();
    const result = await createDeliveryList(auth.session.user.id, {
      name: String(body.name ?? ""),
      type: String(body.type ?? ""),
      status: body.status ? String(body.status) : undefined,
      serviceDate: String(body.serviceDate ?? ""),
      orderIds: Array.isArray(body.orderIds) ? body.orderIds.map(String) : [],
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Erro ao criar lista");
  }
}
