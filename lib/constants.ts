export const Role = {
  ADMIN: "ADMIN",
  ATTENDANT: "ATTENDANT",
} as const;

export function homePathForRole(role?: string | null) {
  if (role === Role.ADMIN) return "/dashboard";
  if (role === "CUSTOMER") return "/meus-pedidos";
  return "/pedidos";
}

export const OrderStatus = {
  RECEIVED: "RECEIVED",
  PREPARING: "PREPARING",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  OPEN: "OPEN",
  FINISHED: "FINISHED",
  CANCELED: "CANCELED",
} as const;

export const MovementType = {
  SALE: "SALE",
  ENTRY: "ENTRY",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export const OrderType = {
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
} as const;

export const PaymentCategory = {
  NORMAL: "NORMAL",
  FIADO: "FIADO",
} as const;

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
} as const;

export const PaymentMethod = {
  PIX: "Pix",
  CREDIT: "Crédito",
  DEBIT: "Débito",
  CASH: "Dinheiro",
  FIADO_SIGN: "Assinar",
  FIADO_WRITE_DOWN: "Anotar",
} as const;
