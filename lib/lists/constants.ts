export const DeliveryListType = {
  DELIVERY: "DELIVERY",
  WEDDING: "WEDDING",
  CUSTOM: "CUSTOM",
} as const;

export const DeliveryListStatus = {
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;

export const DeliveryRouteStatus = {
  ON_ROUTE: "ON_ROUTE",
  FINISHED: "FINISHED",
} as const;

export const DELIVERY_LIST_TYPE_OPTIONS = [
  { value: DeliveryListType.DELIVERY, label: "Entregas" },
  { value: DeliveryListType.WEDDING, label: "Casamentos" },
  { value: DeliveryListType.CUSTOM, label: "Personalizada" },
] as const;

const TYPE_VALUES = new Set<string>(DELIVERY_LIST_TYPE_OPTIONS.map((item) => item.value));
const STATUS_VALUES = new Set<string>([DeliveryListStatus.ACTIVE, DeliveryListStatus.ARCHIVED]);

export function isDeliveryListType(value: string): boolean {
  return TYPE_VALUES.has(value);
}

export function isDeliveryListStatus(value: string): boolean {
  return STATUS_VALUES.has(value);
}

export function deliveryListTypeLabel(type: string): string {
  return DELIVERY_LIST_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? "Personalizada";
}

export function deliveryListStatusLabel(status: string): string {
  return status === DeliveryListStatus.ARCHIVED ? "Arquivada" : "Ativa";
}

export function isDeliveryRouteStatus(value: string): boolean {
  return value === DeliveryRouteStatus.ON_ROUTE || value === DeliveryRouteStatus.FINISHED;
}

export function deliveryRouteStatusLabel(status: string): string {
  return status === DeliveryRouteStatus.FINISHED ? "Finalizado" : "Em rota";
}

export function deliveryListPrintTitle(type: string): string {
  if (type === DeliveryListType.WEDDING) return "LISTA DE CASAMENTO";
  if (type === DeliveryListType.CUSTOM) return "LISTA";
  return "LISTA DE ENTREGAS";
}

export function orderStatusLabel(status: string): string {
  if (status === "PREPARING") return "Preparando";
  if (status === "OUT_FOR_DELIVERY") return "Saiu para entrega";
  if (status === "FINISHED") return "Finalizado";
  if (status === "CANCELED") return "Cancelado";
  if (status === "OPEN") return "Aberto";
  return "Recebido";
}

export function orderTypeLabel(orderType: string): string {
  return orderType === "DELIVERY" ? "Entrega" : "Retirada";
}
