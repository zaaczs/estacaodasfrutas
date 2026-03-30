import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrders, createOrder, OrderItemInput } from "@/lib/services/orderService";
import { OrderType, PaymentMethod } from "@/lib/constants";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;

    const orders = await getOrders({ status: status ?? undefined, dateFrom, dateTo });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/orders:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pedidos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const items = body.items as OrderItemInput[];
    const customerId = String(body.customerId ?? "");
    const orderType = String(body.orderType ?? OrderType.PICKUP);
    const deliveryAddress = body.deliveryAddress ? String(body.deliveryAddress) : undefined;
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod) : undefined;
    const customerPhoneSnapshot = body.customerPhoneSnapshot
      ? normalizePhoneDigits(String(body.customerPhoneSnapshot))
      : undefined;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "É necessário ao menos um item no pedido" },
        { status: 400 }
      );
    }
    if (!customerId) {
      return NextResponse.json({ error: "Cliente é obrigatório" }, { status: 400 });
    }
    if (orderType !== OrderType.DELIVERY && orderType !== OrderType.PICKUP) {
      return NextResponse.json({ error: "Tipo de pedido inválido" }, { status: 400 });
    }
    if (orderType === OrderType.DELIVERY && !deliveryAddress?.trim()) {
      return NextResponse.json(
        { error: "Endereço é obrigatório para entrega" },
        { status: 400 }
      );
    }
    if (customerPhoneSnapshot && !isValidPhoneDigits(customerPhoneSnapshot)) {
      return NextResponse.json({ error: "Telefone do cliente inválido" }, { status: 400 });
    }
    if (
      (paymentMethod === PaymentMethod.FIADO_SIGN ||
        paymentMethod === PaymentMethod.FIADO_WRITE_DOWN) &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Apenas administradores podem criar pedido fiado" },
        { status: 403 }
      );
    }

    const validItems = items.map(
      (item: { productId: string; quantity: number; price: number; notes?: string }) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
        notes: item.notes ? String(item.notes) : undefined,
      })
    );

    const order = await createOrder({
      customerId,
      items: validItems,
      paymentMethod,
      orderType,
      deliveryAddress,
      customerPhoneSnapshot,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("POST /api/orders:", error);
    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
