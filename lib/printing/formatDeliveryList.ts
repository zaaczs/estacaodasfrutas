import { STORE_INFO } from "@/lib/constants/storeInfo";
import { deliveryListPrintTitle } from "@/lib/lists/constants";
import { RECEIPT_COLUMNS } from "@/lib/printing/receiptConfig";
import type { ReceiptLine, ReceiptScale } from "@/lib/printing/formatReceipt";
import { wrapText } from "@/lib/printing/textLayout";

export type DeliveryListStop = {
  position: number;
  customerName: string;
  phone: string;
  street: string;
  neighborhood: string;
  complement: string;
  orderNumber: string;
  orderTypeLabel: string;
  canceled: boolean;
  sameAddressAsPrevious: boolean;
};

export type DeliveryListReceipt = {
  name: string;
  type: string;
  dateLabel: string;
  stops: DeliveryListStop[];
};

function textLine(
  text: string,
  align: "left" | "center" | "right" = "left",
  bold = false,
  scale: ReceiptScale = "normal"
): ReceiptLine {
  return { kind: "text", text, align, bold, scale };
}

function pushWrapped(
  lines: ReceiptLine[],
  text: string,
  columns: number,
  align: "left" | "center" | "right" = "left",
  bold = false,
  scale: ReceiptScale = "normal"
) {
  const width = scale === "double" ? Math.max(1, Math.floor(columns / 2)) : columns;
  const parts = wrapText(text, width);
  if (parts.length === 0) return;
  for (const part of parts) {
    lines.push(textLine(part, align, bold, scale));
  }
}

function padStop(position: number): string {
  return String(position).padStart(2, "0");
}

export function formatDeliveryList(
  list: DeliveryListReceipt,
  columns = RECEIPT_COLUMNS
): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const title = STORE_INFO.shortName.toLocaleUpperCase("pt-BR");
  const activeStops = list.stops.filter((stop) => !stop.canceled);

  pushWrapped(lines, title, columns, "center", true, "double");
  pushWrapped(lines, deliveryListPrintTitle(list.type), columns, "center", true);
  pushWrapped(lines, `Lista: ${list.name}`, columns);
  pushWrapped(lines, `Data: ${list.dateLabel}`, columns);
  pushWrapped(lines, `Total de entregas: ${padStop(activeStops.length)}`, columns);
  lines.push({ kind: "rule" });

  list.stops.forEach((stop) => {
    pushWrapped(lines, `ENTREGA ${padStop(stop.position)}`, columns, "left", true);
    if (stop.canceled) pushWrapped(lines, "CANCELADO - NÃO ENTREGAR", columns, "left", true);
    if (stop.sameAddressAsPrevious) {
      pushWrapped(lines, "Mesmo endereço da entrega anterior", columns);
    }
    pushWrapped(lines, `Cliente: ${stop.customerName}`, columns);
    if (stop.phone) pushWrapped(lines, `Telefone: ${stop.phone}`, columns);
    lines.push({ kind: "blank" });
    pushWrapped(lines, "Endereço:", columns);
    if (stop.street) {
      pushWrapped(lines, stop.street, columns);
    } else if (stop.orderTypeLabel === "Retirada") {
      pushWrapped(lines, "Retirada no local", columns);
    } else {
      pushWrapped(lines, "Endereço não informado", columns);
    }
    if (stop.neighborhood) pushWrapped(lines, `Bairro: ${stop.neighborhood}`, columns);
    if (stop.complement) pushWrapped(lines, `Complemento: ${stop.complement}`, columns);
    lines.push({ kind: "blank" });
    pushWrapped(lines, `Pedido: #${stop.orderNumber}`, columns);
    lines.push({ kind: "rule" });
  });

  if (list.stops.length === 0) {
    pushWrapped(lines, "Nenhuma entrega nesta lista", columns, "center");
    lines.push({ kind: "rule" });
  }

  pushWrapped(lines, `TOTAL DE ENTREGAS: ${padStop(activeStops.length)}`, columns, "center", true);
  const canceled = list.stops.length - activeStops.length;
  if (canceled > 0) {
    pushWrapped(lines, `Cancelados na lista: ${padStop(canceled)}`, columns, "center");
  }
  lines.push({ kind: "blank" });
  pushWrapped(lines, title, columns, "center", true);

  return lines;
}
