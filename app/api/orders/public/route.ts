import { NextRequest, NextResponse } from "next/server";
import { createOrderWithCustomer } from "@/lib/services/orderService";
import { isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OrderType, PaymentMethod } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const items = body.items as {
      productId: string;
      quantity: number;
      price: number;
      notes?: string;
    }[];
    const customer = body.customer as { name: string; phone: string; address?: string; cpfCnpj?: string };
    const paymentMethod = body.paymentMethod ? String(body.paymentMethod) : undefined;
    const orderType = String(body.orderType ?? OrderType.PICKUP);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "É necessário ao menos um item no pedido" },
        { status: 400 }
      );
    }

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }
    if (
      paymentMethod === PaymentMethod.FIADO_SIGN ||
      paymentMethod === PaymentMethod.FIADO_WRITE_DOWN
    ) {
      return NextResponse.json(
        { error: "Forma de pagamento indisponível neste canal" },
        { status: 400 }
      );
    }
    if (orderType !== OrderType.DELIVERY && orderType !== OrderType.PICKUP) {
      return NextResponse.json({ error: "Tipo de pedido inválido" }, { status: 400 });
    }

    const phone = normalizePhoneDigits(customer.phone);
    if (!isValidPhoneDigits(phone)) {
      return NextResponse.json(
        { error: "Telefone inválido. Use DDD + número (10 ou 11 dígitos)." },
        { status: 400 }
      );
    }

    const validItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      price: Number(item.price),
      notes: item.notes ? String(item.notes) : undefined,
    }));

    const order = await createOrderWithCustomer({
      customer: {
        name: customer.name,
        phone,
        address: customer.address,
        cpfCnpj: customer.cpfCnpj,
      },
      items: validItems,
      customerUserId: session?.user?.role === "CUSTOMER" ? session.user.id : undefined,
      paymentMethod,
      deliveryAddress: body.deliveryAddress,
      orderType,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("POST /api/orders/public:", error);
    return NextResponse.json(
      { error: "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
