import { encodeCp850 } from "@/lib/printing/cp850";
import {
  RECEIPT_CODE_PAGE,
  RECEIPT_COLUMNS,
  RECEIPT_CUT,
  RECEIPT_FEED_BEFORE_CUT,
} from "@/lib/printing/receiptConfig";
import type { ReceiptLine, ReceiptScale } from "@/lib/printing/formatReceipt";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** ESC ! — bit 3 negrito, bit 4 altura dupla, bit 5 largura dupla. Fonte A fica no bit 0 desligado. */
function styleByte(bold: boolean, scale: ReceiptScale): number {
  let mode = 0;
  if (bold) mode |= 0x08;
  if (scale === "tall" || scale === "double") mode |= 0x10;
  if (scale === "double") mode |= 0x20;
  return mode;
}

function alignByte(align: "left" | "center" | "right"): number {
  if (align === "center") return 1;
  if (align === "right") return 2;
  return 0;
}

export function encodeReceipt(lines: ReceiptLine[], columns = RECEIPT_COLUMNS): Uint8Array {
  const bytes: number[] = [
    ESC, 0x40, // inicializa
    ESC, 0x74, RECEIPT_CODE_PAGE, // PC850
    ESC, 0x4d, 0x00, // fonte A
    ESC, 0x61, 0x00,
    ESC, 0x21, 0x00,
  ];

  const write = (chunk: number[]) => {
    bytes.push(...chunk);
  };

  for (const line of lines) {
    if (line.kind === "blank") {
      write([ESC, 0x61, 0x00, ESC, 0x21, 0x00, LF]);
      continue;
    }

    if (line.kind === "rule") {
      write([ESC, 0x61, 0x00, ESC, 0x21, 0x00]);
      write(encodeCp850("-".repeat(columns)));
      write([LF]);
      continue;
    }

    write([ESC, 0x61, alignByte(line.align), ESC, 0x21, styleByte(line.bold, line.scale)]);
    write(encodeCp850(line.text));
    write([LF]);
  }

  write([ESC, 0x61, 0x00, ESC, 0x21, 0x00, ESC, 0x64, RECEIPT_FEED_BEFORE_CUT]);
  if (RECEIPT_CUT) {
    write([GS, 0x56, 0x42, 0x00]); // corte parcial
  }

  return Uint8Array.from(bytes);
}
