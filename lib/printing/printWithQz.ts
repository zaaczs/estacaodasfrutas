import type { QzApi } from "qz-tray";
import { THERMAL_PRINTER_STORAGE_KEY } from "@/lib/printing/receiptConfig";

async function loadQz(): Promise<QzApi> {
  if (typeof window === "undefined") {
    throw new Error("A impressão térmica só pode ser feita no navegador do caixa.");
  }

  const mod = await import("qz-tray");
  const candidate = mod.default as QzApi | { default?: QzApi };
  const qz = candidate && "websocket" in candidate ? candidate : candidate.default;

  if (!qz?.websocket || !qz.print) {
    throw new Error("Não foi possível carregar a biblioteca do QZ Tray.");
  }

  return qz;
}

export async function ensureQz(): Promise<QzApi> {
  const qz = await loadQz();
  if (qz.websocket.isActive()) return qz;

  try {
    await qz.websocket.connect();
  } catch (error) {
    if (qz.websocket.isActive()) return qz;
    throw error;
  }

  return qz;
}

export function readSavedPrinter(storageKey = THERMAL_PRINTER_STORAGE_KEY): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storageKey)?.trim() ?? "";
}

export function savePrinter(name: string, storageKey = THERMAL_PRINTER_STORAGE_KEY) {
  const trimmed = name.trim();
  if (!trimmed) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, trimmed);
}

export async function listQzPrinters(): Promise<string[]> {
  const qz = await ensureQz();
  const found = await qz.printers.find();
  const names = Array.isArray(found) ? found : found ? [found] : [];
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function printEscPos(printerName: string, bytes: Uint8Array, jobName: string) {
  const printer = printerName.trim();
  if (!printer) {
    throw new Error("Escolha a impressora térmica.");
  }
  if (bytes.length === 0) {
    throw new Error("O cupom está vazio.");
  }

  const qz = await ensureQz();
  const config = qz.configs.create(printer, {
    jobName,
    copies: 1,
    rasterize: false,
    scaleContent: false,
  });

  await qz.print(config, [
    {
      type: "raw",
      format: "command",
      flavor: "hex",
      data: bytes,
    },
  ]);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

export function explainQzError(error: unknown): string {
  const message = errorText(error);

  if (/escolha a impressora/i.test(message)) return message;

  if (/already exists/i.test(message)) {
    return "O QZ Tray já está conectado. Tente imprimir de novo.";
  }

  if (/not found|cannot find|specified printer/i.test(message)) {
    return "A impressora selecionada não está disponível. Busque as impressoras e escolha a térmica.";
  }

  if (/blocked|denied|cancel/i.test(message)) {
    return "O QZ Tray bloqueou a impressão. Aceite a permissão na janela do programa e tente de novo.";
  }

  if (/connection|websocket|establish|refused|closed|network/i.test(message)) {
    return "Não consegui falar com o QZ Tray. Abra o programa neste computador, aceite a permissão se ele pedir, e tente de novo.";
  }

  if (message) return `Falha na impressão: ${message}`;
  return "Não foi possível imprimir o cupom.";
}
