"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReceiptPreview } from "@/components/printing/ReceiptPreview";
import { encodeReceipt } from "@/lib/printing/escposEncoder";
import { formatDeliveryList, type DeliveryListStop } from "@/lib/printing/formatDeliveryList";
import { LIST_PRINTER_STORAGE_KEY } from "@/lib/printing/receiptConfig";
import {
  explainQzError,
  listQzPrinters,
  printEscPos,
  readSavedPrinter,
  savePrinter,
} from "@/lib/printing/printWithQz";
import { formatBusinessDateLabel } from "@/lib/lists/businessDate";
import type { DeliveryListDto } from "@/lib/lists/types";

function stopsFromList(list: DeliveryListDto): DeliveryListStop[] {
  return list.items.map((item, index) => {
    const previous = list.items[index - 1]?.order;
    return {
      position: item.position,
      customerName: item.order.customerName,
      phone: item.order.phone,
      street: item.order.street,
      neighborhood: item.order.neighborhood,
      complement: item.order.complement,
      orderNumber: item.order.number,
      orderTypeLabel: item.order.orderTypeLabel,
      canceled: item.order.status === "CANCELED",
      sameAddressAsPrevious: Boolean(
        item.order.addressKey && previous?.addressKey === item.order.addressKey
      ),
    };
  });
}

export default function PrintListPage() {
  const params = useParams<{ id: string }>();
  const [list, setList] = useState<DeliveryListDto | null>(null);
  const [error, setError] = useState("");
  const [printer, setPrinter] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);
  const [listing, setListing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">("info");

  useEffect(() => {
    setPrinter(readSavedPrinter(LIST_PRINTER_STORAGE_KEY));
  }, []);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    fetch(`/api/delivery-lists/${id}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Lista não encontrada");
        return body as DeliveryListDto;
      })
      .then(setList)
      .catch(() => setError("Não foi possível carregar a lista."));
  }, [params.id]);

  const lines = useMemo(
    () =>
      list
        ? formatDeliveryList({
            name: list.name,
            type: list.type,
            dateLabel: formatBusinessDateLabel(list.serviceDate),
            stops: stopsFromList(list),
          })
        : [],
    [list]
  );

  const printerOptions = useMemo(() => {
    if (!printer || printers.includes(printer)) return printers;
    return [printer, ...printers];
  }, [printer, printers]);

  function selectPrinter(name: string) {
    setPrinter(name);
    savePrinter(name, LIST_PRINTER_STORAGE_KEY);
  }

  async function markPrinted() {
    if (!list) return;
    await fetch(`/api/delivery-lists/${list.id}/printed`, { method: "POST" }).catch(() => undefined);
  }

  async function handleListPrinters() {
    setListing(true);
    setMessage("");
    try {
      const found = await listQzPrinters();
      setPrinters(found);
      if (found.length === 0) {
        setMessageTone("error");
        setMessage("O QZ Tray não encontrou impressoras neste computador.");
        return;
      }
      setMessageTone("info");
      setMessage("Escolha a impressora deste computador e imprima a lista.");
    } catch (reason) {
      setMessageTone("error");
      setMessage(explainQzError(reason));
    } finally {
      setListing(false);
    }
  }

  async function handleThermalPrint() {
    if (!list) return;
    setPrinting(true);
    setMessage("");
    try {
      let selected = printer.trim();
      if (!selected) {
        const found = await listQzPrinters();
        setPrinters(found);
        const saved = readSavedPrinter(LIST_PRINTER_STORAGE_KEY);
        if (saved && found.includes(saved)) {
          selected = saved;
          selectPrinter(saved);
        } else {
          setMessageTone(found.length ? "info" : "error");
          setMessage(
            found.length
              ? "Escolha a impressora na lista e clique em imprimir de novo."
              : "O QZ Tray não encontrou impressoras neste computador."
          );
          return;
        }
      }

      savePrinter(selected, LIST_PRINTER_STORAGE_KEY);
      await printEscPos(selected, encodeReceipt(lines), `Lista ${list.name}`);
      await markPrinted();
      setMessageTone("ok");
      setMessage("Lista enviada para a impressora deste computador.");
    } catch (reason) {
      setMessageTone("error");
      setMessage(explainQzError(reason));
    } finally {
      setPrinting(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p>{error}</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const messageClass =
    messageTone === "error"
      ? "text-sm text-destructive"
      : messageTone === "ok"
        ? "text-sm text-primary"
        : "text-sm text-muted-foreground";

  return (
    <div className="bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-md flex-col gap-3 print:hidden">
        <Button asChild variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
          <Link href={`/listas/${list.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => void handleThermalPrint()} disabled={printing || listing}>
          <Printer className="mr-2 h-4 w-4" />
          {printing ? "Imprimindo..." : "Imprimir na térmica"}
        </Button>

        <label className="flex flex-col gap-1 text-sm">
          Impressora desta lista, neste computador
          <select
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base md:h-10 md:text-sm"
            value={printer}
            onChange={(event) => selectPrinter(event.target.value)}
          >
            <option value="">Selecione a impressora</option>
            {printerOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => void handleListPrinters()} disabled={listing || printing}>
            {listing ? "Buscando..." : "Buscar impressoras"}
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-full sm:h-10 sm:w-auto"
            onClick={() => {
              void markPrinted();
              window.print();
            }}
          >
            Imprimir pelo navegador
          </Button>
        </div>

        {message ? (
          <p role="status" className={messageClass}>
            {message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            A lista sai na impressora escolhida neste navegador. O cupom de pedido continua com a impressora já configurada no outro computador.
          </p>
        )}
      </div>

      <ReceiptPreview lines={lines} />
    </div>
  );
}
