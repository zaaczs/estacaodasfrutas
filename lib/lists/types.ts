export type OrderOrigin = "CATALOG" | "INTERNAL" | "UNKNOWN";

export type DeliveryOrderSummary = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  street: string;
  neighborhood: string;
  complement: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  timeLabel: string;
  status: string;
  statusLabel: string;
  origin: OrderOrigin;
  originLabel: string;
  orderType: string;
  orderTypeLabel: string;
  addressKey: string;
  activeLists: { id: string; name: string }[];
};

export type DeliveryListItemDto = {
  id: string;
  position: number;
  changedAfterPrint: boolean;
  order: DeliveryOrderSummary;
};

export type DeliveryListDto = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  serviceDate: string;
  createdAt: string;
  updatedAt: string;
  printedAt: string | null;
  createdBy: { id: string; name: string };
  deliveryCount: number;
  activeDeliveryCount: number;
  items: DeliveryListItemDto[];
};

export type DeliveryListWarning = {
  orderId: string;
  orderNumber: string;
  listId: string;
  listName: string;
};
