import { prisma } from "@/lib/db";
import { sumLineAmounts } from "@/lib/quantity";
import {
  OrderStatus,
  MovementType,
  OrderType,
  PaymentCategory,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/constants";

export type OrderItemInput = {
  productId: string;
  quantity: number;
  price: number;
  notes?: string;
};

export type CreateOrderInput = {
  customerId: string;
  items: OrderItemInput[];
  paymentMethod?: string;
  orderType: string;
  deliveryAddress?: string;
  customerPhoneSnapshot?: string;
};

export type UpdateOrderInput = {
  customerId: string;
  items: OrderItemInput[];
  paymentMethod?: string;
  orderType: string;
  deliveryAddress?: string;
  customerPhoneSnapshot?: string;
};

export type CreateOrderWithCustomerInput = {
  customer: { name: string; phone: string; address?: string; cpfCnpj?: string };
  items: OrderItemInput[];
  customerUserId?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  orderType?: string;
};

type OrderWithItemsAndCosts = {
  id: string;
  total: number;
  createdAt: Date;
  paidAt: Date | null;
  paymentCategory: string;
  paymentStatus: string;
  items: Array<{ quantity: number; product: { cost: number | null } | null }>;
};

function isFiadoPayment(paymentMethod?: string) {
  return (
    paymentMethod === PaymentMethod.FIADO_SIGN ||
    paymentMethod === PaymentMethod.FIADO_WRITE_DOWN
  );
}

function getPaymentMeta(paymentMethod?: string) {
  if (isFiadoPayment(paymentMethod)) {
    return {
      paymentCategory: PaymentCategory.FIADO,
      paymentStatus: PaymentStatus.PENDING,
      paidAt: null,
    };
  }

  return {
    paymentCategory: PaymentCategory.NORMAL,
    paymentStatus: PaymentStatus.PAID,
    paidAt: new Date(),
  };
}

export function getOrderAccountingDate(order: {
  paymentCategory?: string | null;
  paymentStatus?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
}) {
  const isPaidFiado =
    order.paymentCategory === PaymentCategory.FIADO &&
    order.paymentStatus === PaymentStatus.PAID &&
    order.paidAt;
  return isPaidFiado ? order.paidAt! : order.createdAt;
}

export function shouldCountOrderInFinancials(order: {
  paymentCategory?: string | null;
  paymentStatus?: string | null;
}) {
  return !(
    order.paymentCategory === PaymentCategory.FIADO &&
    order.paymentStatus === PaymentStatus.PENDING
  );
}

export async function createOrderWithCustomer(data: CreateOrderWithCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      name: data.customer.name,
      phone: data.customer.phone,
      address: data.customer.address,
      cpfCnpj: data.customer.cpfCnpj,
    },
  });

  const total = sumLineAmounts(data.items);

  const paymentMeta = getPaymentMeta(data.paymentMethod);
  const orderType = data.orderType ?? OrderType.PICKUP;

  if (orderType === OrderType.DELIVERY && !(data.deliveryAddress ?? data.customer.address)?.trim()) {
    throw new Error("Endereço é obrigatório para entrega");
  }

  return prisma.order.create({
    data: {
      customerId: customer.id,
      customerUserId: data.customerUserId,
      total,
      status: OrderStatus.RECEIVED,
      paymentMethod: data.paymentMethod,
      paymentCategory: paymentMeta.paymentCategory,
      paymentStatus: paymentMeta.paymentStatus,
      paidAt: paymentMeta.paidAt,
      orderType,
      customerPhoneSnapshot: data.customer.phone,
      deliveryAddress: data.deliveryAddress ?? data.customer.address,
      source: "CATALOG",
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
      },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function getOrders(options?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: { status?: string; createdAt?: { gte?: Date; lte?: Date } } = {};

  if (options?.status) where.status = options.status;

  if (options?.dateFrom || options?.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      const d = new Date(options.dateFrom);
      d.setHours(0, 0, 0, 0);
      where.createdAt.gte = d;
    }
    if (options.dateTo) {
      const d = new Date(options.dateTo);
      d.setHours(23, 59, 59, 999);
      where.createdAt.lte = d;
    }
  }

  return prisma.order.findMany({
    where,
    include: {
      items: { include: { product: true } },
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function createOrder(data: CreateOrderInput) {
  if (!data.customerId) {
    throw new Error("Cliente é obrigatório");
  }
  if (data.orderType === OrderType.DELIVERY && !data.deliveryAddress?.trim()) {
    throw new Error("Endereço é obrigatório para entrega");
  }

  const total = sumLineAmounts(data.items);
  const paymentMeta = getPaymentMeta(data.paymentMethod);

  return prisma.order.create({
    data: {
      customerId: data.customerId,
      total,
      status: OrderStatus.RECEIVED,
      paymentMethod: data.paymentMethod,
      paymentCategory: paymentMeta.paymentCategory,
      paymentStatus: paymentMeta.paymentStatus,
      paidAt: paymentMeta.paidAt,
      orderType: data.orderType,
      deliveryAddress: data.deliveryAddress,
      customerPhoneSnapshot: data.customerPhoneSnapshot,
      source: "INTERNAL",
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
      },
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function updateOrder(id: string, data: UpdateOrderInput) {
  if (!data.customerId) {
    throw new Error("Cliente é obrigatório");
  }
  if (data.orderType === OrderType.DELIVERY && !data.deliveryAddress?.trim()) {
    throw new Error("Endereço é obrigatório para entrega");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) throw new Error("Pedido não encontrado");
  if (order.status === OrderStatus.CANCELED) {
    throw new Error("Pedido cancelado não pode ser editado");
  }

  const total = sumLineAmounts(data.items);
  const paymentMeta = getPaymentMeta(data.paymentMethod);

  if (order.status === OrderStatus.FINISHED) {
    const previousByProduct = new Map<string, number>();
    for (const item of order.items) {
      previousByProduct.set(
        item.productId,
        (previousByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    const nextByProduct = new Map<string, number>();
    for (const item of data.items) {
      nextByProduct.set(item.productId, (nextByProduct.get(item.productId) ?? 0) + item.quantity);
    }

    const allProductIds = new Set([...previousByProduct.keys(), ...nextByProduct.keys()]);
    const stockChanges = [...allProductIds].map((productId) => {
      const previous = previousByProduct.get(productId) ?? 0;
      const next = nextByProduct.get(productId) ?? 0;
      return { productId, delta: next - previous };
    });

    const products = await prisma.product.findMany({
      where: { id: { in: [...allProductIds] } },
      select: { id: true, name: true, stock: true },
    });
    const stockByProduct = new Map(products.map((p) => [p.id, p]));

    for (const change of stockChanges) {
      if (change.delta <= 0) continue;
      const product = stockByProduct.get(change.productId);
      if (!product) throw new Error("Produto do pedido não encontrado");
      if (product.stock < change.delta) {
        throw new Error(
          `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      for (const change of stockChanges) {
        if (change.delta === 0) continue;
        await tx.product.update({
          where: { id: change.productId },
          data: { stock: { increment: -change.delta } },
        });
        await tx.stockMovement.create({
          data: {
            productId: change.productId,
            type: MovementType.ADJUSTMENT,
            quantity: -change.delta,
          },
        });
      }

      await tx.orderItem.deleteMany({ where: { orderId: id } });

      return tx.order.update({
        where: { id },
        data: {
          customerId: data.customerId,
          total,
          paymentMethod: data.paymentMethod,
          paymentCategory: paymentMeta.paymentCategory,
          paymentStatus: paymentMeta.paymentStatus,
          paidAt: paymentMeta.paidAt,
          orderType: data.orderType,
          deliveryAddress: data.deliveryAddress,
          customerPhoneSnapshot: data.customerPhoneSnapshot,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });

    return tx.order.update({
      where: { id },
      data: {
        customerId: data.customerId,
        total,
        paymentMethod: data.paymentMethod,
        paymentCategory: paymentMeta.paymentCategory,
        paymentStatus: paymentMeta.paymentStatus,
        paidAt: paymentMeta.paidAt,
        orderType: data.orderType,
        deliveryAddress: data.deliveryAddress,
        customerPhoneSnapshot: data.customerPhoneSnapshot,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  });
}

export async function finishOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new Error("Pedido não encontrado");
  if (order.status === OrderStatus.FINISHED || order.status === OrderStatus.CANCELED) {
    throw new Error("Pedido já finalizado ou cancelado");
  }

  for (const item of order.items) {
    const newStock = item.product.stock - item.quantity;
    if (newStock < 0) {
      throw new Error(
        `Estoque insuficiente para ${item.product.name}. Disponível: ${item.product.stock}`
      );
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: MovementType.SALE,
          quantity: -item.quantity,
        },
      }),
    ]);
  }

  return prisma.order.update({
    where: { id },
    data: {
      status: OrderStatus.FINISHED,
      paidAt:
        order.paymentCategory === PaymentCategory.FIADO
          ? order.paidAt
          : order.paidAt ?? new Date(),
    },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function cancelOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new Error("Pedido não encontrado");
  if (order.status === OrderStatus.FINISHED || order.status === OrderStatus.CANCELED) {
    throw new Error("Apenas pedidos não finalizados podem ser cancelados");
  }

  for (const item of order.items) {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      }),
      prisma.stockMovement.create({
        data: {
          productId: item.productId,
          type: MovementType.ADJUSTMENT,
          quantity: item.quantity,
        },
      }),
    ]);
  }

  return prisma.order.update({
    where: { id },
    data: { status: OrderStatus.CANCELED },
    include: {
      items: { include: { product: true } },
      customer: true,
    },
  });
}

export async function updateOrderStatus(
  id: string,
  status: "RECEIVED" | "PREPARING" | "OUT_FOR_DELIVERY"
) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Pedido não encontrado");
  if (order.status === OrderStatus.FINISHED || order.status === OrderStatus.CANCELED) {
    throw new Error("Pedido já finalizado ou cancelado");
  }
  return prisma.order.update({
    where: { id },
    data: { status },
    include: { items: { include: { product: true } }, customer: true },
  });
}

export async function getOrdersByCustomerUserId(userId: string) {
  return prisma.order.findMany({
    where: { customerUserId: userId },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listFiadoOpenByCustomer() {
  const orders = await prisma.order.findMany({
    where: {
      paymentCategory: PaymentCategory.FIADO,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.FINISHED,
      customerId: { not: null },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const grouped = new Map<
    string,
    {
      customerId: string;
      customerName: string;
      customerPhone: string;
      orders: typeof orders;
      totalOpen: number;
    }
  >();

  for (const order of orders) {
    if (!order.customerId || !order.customer) continue;
    const entry = grouped.get(order.customerId) ?? {
      customerId: order.customerId,
      customerName: order.customer.name,
      customerPhone: order.customerPhoneSnapshot ?? order.customer.phone,
      orders: [],
      totalOpen: 0,
    };
    entry.orders.push(order);
    entry.totalOpen += order.total;
    grouped.set(order.customerId, entry);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.customerName.localeCompare(b.customerName, "pt-BR")
  );
}

export async function markFiadoOrderAsPaid(id: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error("Pedido não encontrado");
  if (order.paymentCategory !== PaymentCategory.FIADO) {
    throw new Error("Pedido não é do tipo fiado");
  }
  if (order.paymentStatus === PaymentStatus.PAID) {
    throw new Error("Pedido já foi marcado como pago");
  }
  return prisma.order.update({
    where: { id },
    data: {
      paymentStatus: PaymentStatus.PAID,
      paidAt: new Date(),
    },
  });
}

export function computeFinancialTotals(orders: OrderWithItemsAndCosts[]) {
  const valid = orders.filter(shouldCountOrderInFinancials);
  const grossRevenue = valid.reduce((sum, order) => sum + order.total, 0);
  const soldCost = valid.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (orderSum, item) => orderSum + (item.product?.cost ?? 0) * item.quantity,
        0
      ),
    0
  );
  return {
    validOrders: valid,
    grossRevenue,
    soldCost,
    profitSales: grossRevenue - soldCost,
  };
}

export async function getPublicOrdersByPhone(phoneDigits: string) {
  return prisma.order.findMany({
    where: {
      customer: {
        phone: phoneDigits,
      },
    },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}
