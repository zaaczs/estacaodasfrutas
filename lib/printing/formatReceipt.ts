import { STORE_INFO } from "@/lib/constants/storeInfo";
import { formatQuantity, lineAmount } from "@/lib/quantity";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RECEIPT_COLUMNS } from "@/lib/printing/receiptConfig";
import { pairColumns, wrapText } from "@/lib/printing/textLayout";

export type ReceiptAlign = "left" | "center" | "right";
export type ReceiptScale = "normal" | "tall" | "double";

export type ReceiptLine =
  | {
      kind: "text";
      text: string;
      align: ReceiptAlign;
      bold: boolean;
      scale: ReceiptScale;
    }
  | { kind: "rule" }
  | { kind: "blank" };

export type ReceiptOrderItem = {
  product: { name: string; unit: string };
  quantity: number;
  price: number;
  notes?: string | null;
};

export type ReceiptOrder = {
  id: string;
  total: number;
  createdAt: string;
  paymentMethod?: string | null;
  deliveryAddress?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  items: ReceiptOrderItem[];
};

function textLine(
  text: string,
  align: ReceiptAlign = "left",
  bold = false,
  scale: ReceiptScale = "normal"
): ReceiptLine {
  return { kind: "text", text, align, bold, scale };
}

function pushWrapped(
  lines: ReceiptLine[],
  text: string,
  columns: number,
  align: ReceiptAlign = "left",
  bold = false,
  scale: ReceiptScale = "normal"
) {
  const width = scale === "double" ? Math.max(1, Math.floor(columns / 2)) : columns;
  for (const part of wrapText(text, width)) {
    lines.push(textLine(part, align, bold, scale));
  }
}

function pushPair(lines: ReceiptLine[], left: string, right: string, columns: number, bold = false, scale: ReceiptScale = "normal") {
  for (const part of pairColumns(left, right, columns)) {
    lines.push(textLine(part, "left", bold, scale));
  }
}

/**
 * Monta o cupom a partir do pedido já calculado.
 * Não altera quantidades, preços nem total — só decide a quebra de linha.
 */
export function formatReceipt(order: ReceiptOrder, columns = RECEIPT_COLUMNS): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const title = STORE_INFO.shortName.toLocaleUpperCase("pt-BR");

  pushWrapped(lines, title, columns, "center", true, "double");
  pushWrapped(lines, "Cupom de pedido", columns, "center");
  lines.push({ kind: "rule" });

  pushWrapped(lines, `Data: ${formatDate(order.createdAt)}`, columns);
  pushWrapped(lines, `Pedido: #${order.id.slice(0, 8)}`, columns);
  if (order.customer?.name) {
    pushWrapped(lines, `Cliente: ${order.customer.name}`, columns);
  }
  if (order.customer?.phone) {
    pushWrapped(lines, `Telefone: ${order.customer.phone}`, columns);
  }
  if (order.deliveryAddress) {
    pushWrapped(lines, `Endereço: ${order.deliveryAddress}`, columns);
  }

  lines.push({ kind: "rule" });

  order.items.forEach((item, index) => {
    if (index > 0) lines.push({ kind: "blank" });

    pushWrapped(lines, item.product.name, columns, "left", true);
    if (item.notes) pushWrapped(lines, item.notes, columns);

    const quantity = `${formatQuantity(item.quantity, item.product.unit)} ${item.product.unit} x ${formatCurrency(item.price)}`;
    const amount = formatCurrency(lineAmount(item.quantity, item.price));
    pushPair(lines, quantity, amount, columns);
  });

  lines.push({ kind: "rule" });
  pushPair(lines, "TOTAL", formatCurrency(order.total), columns, true, "tall");
  lines.push({ kind: "rule" });

  pushWrapped(lines, `Pagamento: ${order.paymentMethod?.trim() || "-"}`, columns);
  pushWrapped(lines, "Obrigado pela preferência!", columns, "center");

  return lines;
}
