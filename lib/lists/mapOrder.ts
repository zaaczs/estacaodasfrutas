import { formatPhoneDisplay } from "@/lib/phone";
import { deliveryAddressKey, splitDeliveryLocation, visibleComplement } from "@/lib/lists/address";
import { formatBusinessTime } from "@/lib/lists/businessDate";
import { orderStatusLabel, orderTypeLabel } from "@/lib/lists/constants";
import type { DeliveryOrderSummary, OrderOrigin } from "@/lib/lists/types";

export type OrderForList = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  source: string | null;
  customerUserId: string | null;
  orderType: string;
  deliveryAddress: string | null;
  customerPhoneSnapshot: string | null;
  customer: {
    name: string;
    phone: string;
    address: string | null;
    complement: string | null;
  } | null;
};

function resolveOrigin(order: OrderForList): { origin: OrderOrigin; originLabel: string } {
  if (order.source === "CATALOG" || order.customerUserId) {
    return { origin: "CATALOG", originLabel: "Catálogo online" };
  }
  if (order.source === "INTERNAL") {
    return { origin: "INTERNAL", originLabel: "Atendimento interno" };
  }
  return { origin: "UNKNOWN", originLabel: "Não informada" };
}

export function mapDeliveryOrder(
  order: OrderForList,
  activeLists: { id: string; name: string }[] = []
): DeliveryOrderSummary {
  const rawAddress = order.deliveryAddress?.trim() || order.customer?.address?.trim() || "";
  const location = splitDeliveryLocation(rawAddress);
  const complement = visibleComplement(location.street, order.customer?.complement);
  const phoneSource = order.customerPhoneSnapshot || order.customer?.phone || "";
  const origin = resolveOrigin(order);

  return {
    id: order.id,
    number: order.id.slice(0, 8),
    customerName: order.customer?.name?.trim() || "Cliente não informado",
    phone: phoneSource ? formatPhoneDisplay(phoneSource) : "",
    street: location.street,
    neighborhood: location.neighborhood,
    complement,
    address: rawAddress,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    timeLabel: formatBusinessTime(order.createdAt),
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    origin: origin.origin,
    originLabel: origin.originLabel,
    orderType: order.orderType,
    orderTypeLabel: orderTypeLabel(order.orderType),
    addressKey: deliveryAddressKey({
      street: location.street,
      neighborhood: location.neighborhood,
      complement,
    }),
    activeLists,
  };
}
