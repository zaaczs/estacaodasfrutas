import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrderById, updateOrder, OrderItemInput } from "@/lib/services/orderService";
import { OrderType, PaymentMethod } from "@/lib/constants";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Erro ao buscar pedido" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
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
        { error: "Apenas administradores podem editar pedido fiado" },
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

    const order = await updateOrder(id, {
      customerId,
      items: validItems,
      paymentMethod,
      orderType,
      deliveryAddress,
      customerPhoneSnapshot,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("PUT /api/orders/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar pedido" },
      { status: 500 }
    );
  }
}
