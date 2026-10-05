import { prisma } from "@/lib/db";
import { OrderStatus } from "@/lib/constants";
import {
  businessDayBounds,
  formatBusinessDateInput,
  isBusinessDateInput,
} from "@/lib/lists/businessDate";
import {
  deliveryListStatusLabel,
  deliveryListTypeLabel,
  deliveryRouteStatusLabel,
  isDeliveryListStatus,
  isDeliveryListType,
  isDeliveryRouteStatus,
  DeliveryListStatus,
  DeliveryRouteStatus,
} from "@/lib/lists/constants";
import { mapDeliveryOrder, type OrderForList } from "@/lib/lists/mapOrder";
import type { DeliveryListDto, DeliveryListWarning, DeliveryOrderSummary } from "@/lib/lists/types";

const MAX_NAME_LENGTH = 80;
const MAX_ORDERS = 300;

const orderSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  source: true,
  customerUserId: true,
  orderType: true,
  deliveryAddress: true,
  customerPhoneSnapshot: true,
  customer: {
    select: { name: true, phone: true, address: true, complement: true },
  },
} as const;

export class DeliveryListError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type SaveDeliveryListInput = {
  name: string;
  type: string;
  status?: string;
  serviceDate: string;
  orderIds: string[];
};

type ListRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  serviceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  printedAt: Date | null;
  createdBy: { id: string; name: string };
  items: Array<{
    id: string;
    position: number;
    routeStatus: string;
    order: OrderForList;
  }>;
};

function normalizeOrderIds(orderIds: string[]): string[] {
  if (!Array.isArray(orderIds)) {
    throw new DeliveryListError("Selecione os pedidos da lista");
  }
  const ids = orderIds.map((id) => String(id).trim()).filter(Boolean);
  if (ids.length > MAX_ORDERS) {
    throw new DeliveryListError("A lista passou do limite de pedidos");
  }
  if (new Set(ids).size !== ids.length) {
    throw new DeliveryListError("Este pedido já está nesta lista");
  }
  return ids;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new DeliveryListError("Informe o nome da lista");
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new DeliveryListError("O nome da lista é longo demais");
  }
  return trimmed;
}

async function activeListsByOrder(orderIds: string[], exceptListId?: string) {
  if (orderIds.length === 0) return new Map<string, { id: string; name: string }[]>();

  const rows = await prisma.deliveryListItem.findMany({
    where: {
      orderId: { in: orderIds },
      list: {
        status: DeliveryListStatus.ACTIVE,
        ...(exceptListId ? { id: { not: exceptListId } } : {}),
      },
    },
    select: {
      orderId: true,
      list: { select: { id: true, name: true } },
    },
  });

  const grouped = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const current = grouped.get(row.orderId) ?? [];
    if (!current.some((list) => list.id === row.list.id)) {
      current.push(row.list);
    }
    grouped.set(row.orderId, current);
  }
  return grouped;
}

function toDto(list: ListRecord, memberships: Map<string, { id: string; name: string }[]>): DeliveryListDto {
  const items = list.items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      position: item.position,
      routeStatus: item.routeStatus,
      routeStatusLabel: deliveryRouteStatusLabel(item.routeStatus),
      changedAfterPrint: Boolean(list.printedAt && item.order.updatedAt > list.printedAt),
      order: mapDeliveryOrder(item.order, memberships.get(item.order.id) ?? []),
    }));

  return {
    id: list.id,
    name: list.name,
    type: list.type,
    typeLabel: deliveryListTypeLabel(list.type),
    status: list.status,
    statusLabel: deliveryListStatusLabel(list.status),
    serviceDate: formatBusinessDateInput(list.serviceDate),
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    printedAt: list.printedAt?.toISOString() ?? null,
    createdBy: list.createdBy,
    deliveryCount: items.length,
    activeDeliveryCount: items.filter((item) => item.order.status !== OrderStatus.CANCELED).length,
    onRouteCount: items.filter(
      (item) => item.order.status !== OrderStatus.CANCELED && item.routeStatus !== DeliveryRouteStatus.FINISHED
    ).length,
    finishedCount: items.filter(
      (item) => item.order.status !== OrderStatus.CANCELED && item.routeStatus === DeliveryRouteStatus.FINISHED
    ).length,
    items,
  };
}

async function loadList(id: string): Promise<ListRecord | null> {
  return prisma.deliveryList.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      items: {
        orderBy: { position: "asc" },
        include: { order: { select: orderSelect } },
      },
    },
  });
}

async function presentList(list: ListRecord): Promise<DeliveryListDto> {
  const memberships = await activeListsByOrder(
    list.items.map((item) => item.order.id),
    list.id
  );
  return toDto(list, memberships);
}

function warningsFor(list: DeliveryListDto): DeliveryListWarning[] {
  const warnings: DeliveryListWarning[] = [];
  for (const item of list.items) {
    for (const other of item.order.activeLists) {
      warnings.push({
        orderId: item.order.id,
        orderNumber: item.order.number,
        listId: other.id,
        listName: other.name,
      });
    }
  }
  return warnings;
}

export async function listDeliveryOrders(dateInput: string): Promise<DeliveryOrderSummary[]> {
  if (!isBusinessDateInput(dateInput)) {
    throw new DeliveryListError("Data inválida");
  }
  const { start, end } = businessDayBounds(dateInput);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    select: orderSelect,
    orderBy: { createdAt: "asc" },
  });
  const memberships = await activeListsByOrder(orders.map((order) => order.id));
  return orders.map((order) => mapDeliveryOrder(order, memberships.get(order.id) ?? []));
}

export async function listDeliveryLists(filters: {
  date?: string;
  type?: string;
  status?: string;
}): Promise<DeliveryListDto[]> {
  const where: {
    serviceDate?: { gte: Date; lte: Date };
    type?: string;
    status?: string;
  } = {};

  if (filters.date) {
    if (!isBusinessDateInput(filters.date)) throw new DeliveryListError("Data inválida");
    const bounds = businessDayBounds(filters.date);
    where.serviceDate = { gte: bounds.start, lte: bounds.end };
  }
  if (filters.type) {
    if (!isDeliveryListType(filters.type)) throw new DeliveryListError("Tipo de lista inválido");
    where.type = filters.type;
  }
  if (filters.status) {
    if (!isDeliveryListStatus(filters.status)) throw new DeliveryListError("Status da lista inválido");
    where.status = filters.status;
  }

  const lists = await prisma.deliveryList.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      items: {
        orderBy: { position: "asc" },
        include: { order: { select: orderSelect } },
      },
    },
    orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
  });

  const presented = await Promise.all(lists.map((list) => presentList(list)));
  return presented;
}

export async function getDeliveryList(id: string): Promise<DeliveryListDto> {
  const list = await loadList(id);
  if (!list) throw new DeliveryListError("Lista não encontrada", 404);
  return presentList(list);
}

export async function createDeliveryList(userId: string, input: SaveDeliveryListInput) {
  const name = normalizeName(input.name);
  if (!isDeliveryListType(input.type)) throw new DeliveryListError("Tipo de lista inválido");
  if (!isBusinessDateInput(input.serviceDate)) throw new DeliveryListError("Data inválida");
  const status = input.status ?? DeliveryListStatus.ACTIVE;
  if (!isDeliveryListStatus(status)) throw new DeliveryListError("Status da lista inválido");
  const orderIds = normalizeOrderIds(input.orderIds);
  const { start } = businessDayBounds(input.serviceDate);

  const listId = await prisma.$transaction(async (tx) => {
    const created = await tx.deliveryList.create({
      data: {
        name,
        type: input.type,
        status,
        serviceDate: start,
        createdById: userId,
      },
    });

    if (orderIds.length === 0) return created.id;

    const orders = await tx.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, status: true },
    });
    const byId = new Map(orders.map((order) => [order.id, order]));
    for (const orderId of orderIds) {
      const order = byId.get(orderId);
      if (!order) throw new DeliveryListError("Um dos pedidos selecionados não existe");
      if (order.status === OrderStatus.CANCELED) {
        throw new DeliveryListError("Pedido cancelado não entra na lista");
      }
    }

    await tx.deliveryListItem.createMany({
      data: orderIds.map((orderId, index) => ({
        listId: created.id,
        orderId,
        position: index + 1,
        routeStatus: DeliveryRouteStatus.ON_ROUTE,
      })),
    });
    return created.id;
  });

  const list = await getDeliveryList(listId);
  return { list, warnings: warningsFor(list) };
}

export async function updateDeliveryList(id: string, input: SaveDeliveryListInput) {
  const current = await prisma.deliveryList.findUnique({
    where: { id },
    include: { items: { select: { orderId: true } } },
  });
  if (!current) throw new DeliveryListError("Lista não encontrada", 404);

  const name = normalizeName(input.name);
  if (!isDeliveryListType(input.type)) throw new DeliveryListError("Tipo de lista inválido");
  if (!isBusinessDateInput(input.serviceDate)) throw new DeliveryListError("Data inválida");
  const status = input.status ?? current.status;
  if (!isDeliveryListStatus(status)) throw new DeliveryListError("Status da lista inválido");
  const orderIds = normalizeOrderIds(input.orderIds);
  const previousIds = new Set(current.items.map((item) => item.orderId));
  const { start } = businessDayBounds(input.serviceDate);

  await prisma.$transaction(async (tx) => {
    await tx.deliveryList.update({
      where: { id },
      data: { name, type: input.type, status, serviceDate: start },
    });

    if (orderIds.length === 0) {
      await tx.deliveryListItem.deleteMany({ where: { listId: id } });
      return;
    }

    const orders = await tx.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, status: true },
    });
    const byId = new Map(orders.map((order) => [order.id, order]));
    for (const orderId of orderIds) {
      const order = byId.get(orderId);
      if (!order) throw new DeliveryListError("Um dos pedidos selecionados não existe");
      if (order.status === OrderStatus.CANCELED && !previousIds.has(orderId)) {
        throw new DeliveryListError("Pedido cancelado não entra na lista");
      }
    }

    const previousRoutes = await tx.deliveryListItem.findMany({
      where: { listId: id },
      select: { orderId: true, routeStatus: true },
    });
    const routeByOrder = new Map(previousRoutes.map((item) => [item.orderId, item.routeStatus]));

    await tx.deliveryListItem.deleteMany({ where: { listId: id } });
    await tx.deliveryListItem.createMany({
      data: orderIds.map((orderId, index) => ({
        listId: id,
        orderId,
        position: index + 1,
        routeStatus:
          routeByOrder.get(orderId) === DeliveryRouteStatus.FINISHED
            ? DeliveryRouteStatus.FINISHED
            : DeliveryRouteStatus.ON_ROUTE,
      })),
    });
  });

  const list = await getDeliveryList(id);
  return { list, warnings: warningsFor(list) };
}

export async function setDeliveryItemRouteStatus(listId: string, itemId: string, routeStatus: string) {
  if (!isDeliveryRouteStatus(routeStatus)) {
    throw new DeliveryListError("Situação da entrega inválida");
  }

  const item = await prisma.deliveryListItem.findFirst({
    where: { id: itemId, listId },
    select: { id: true },
  });
  if (!item) throw new DeliveryListError("Entrega não encontrada", 404);

  await prisma.deliveryListItem.update({
    where: { id: itemId },
    data: { routeStatus },
  });
  return getDeliveryList(listId);
}

export async function markDeliveryListPrinted(id: string) {
  const current = await prisma.deliveryList.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw new DeliveryListError("Lista não encontrada", 404);
  await prisma.deliveryList.update({
    where: { id },
    data: { printedAt: new Date() },
  });
  return getDeliveryList(id);
}
