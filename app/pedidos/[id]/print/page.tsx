"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReceiptPreview } from "@/components/printing/ReceiptPreview";
import { encodeReceipt } from "@/lib/printing/escposEncoder";
import { formatReceipt, type ReceiptOrder } from "@/lib/printing/formatReceipt";
import {
  explainQzError,
  listQzPrinters,
  printEscPos,
  readSavedPrinter,
  savePrinter,
} from "@/lib/printing/printWithQz";
import { ArrowLeft, Printer } from "lucide-react";

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<ReceiptOrder | null>(null);
  const [error, setError] = useState("");
  const [printer, setPrinter] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [printing, setPrinting] = useState(false);
  const [listing, setListing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "error">("info");

  useEffect(() => {
    setPrinter(readSavedPrinter());
  }, []);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Pedido não encontrado");
        return (await res.json()) as ReceiptOrder;
      })
      .then(setOrder)
      .catch(() => setError("Não foi possível carregar o pedido."));
  }, [id]);

  const lines = useMemo(() => (order ? formatReceipt(order) : []), [order]);

  const printerOptions = useMemo(() => {
    if (!printer || printers.includes(printer)) return printers;
    return [printer, ...printers];
  }, [printer, printers]);

  function selectPrinter(name: string) {
    setPrinter(name);
    savePrinter(name);
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
      setMessage("Escolha a impressora térmica e imprima o cupom.");
    } catch (err) {
      setMessageTone("error");
      setMessage(explainQzError(err));
    } finally {
      setListing(false);
    }
  }

  async function handleThermalPrint() {
    if (!order) return;

    setPrinting(true);
    setMessage("");
    try {
      let selected = printer.trim();
      if (!selected) {
        const found = await listQzPrinters();
        setPrinters(found);
        const saved = readSavedPrinter();
        if (saved && found.includes(saved)) {
          selected = saved;
          selectPrinter(saved);
        } else {
          setMessageTone("info");
          setMessage(
            found.length
              ? "Escolha a impressora térmica na lista e clique em imprimir de novo."
              : "O QZ Tray não encontrou impressoras neste computador."
          );
          if (!found.length) setMessageTone("error");
          return;
        }
      }

      savePrinter(selected);
      await printEscPos(selected, encodeReceipt(lines), `Cupom ${order.id.slice(0, 8)}`);
      setMessageTone("ok");
      setMessage("Cupom enviado para a impressora.");
    } catch (err) {
      setMessageTone("error");
      setMessage(explainQzError(err));
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

  if (!order) {
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
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={() => router.push("/pedidos")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button className="h-11 w-full sm:h-10 sm:w-auto" onClick={handleThermalPrint} disabled={printing || listing}>
            <Printer className="mr-2 h-4 w-4" />
            {printing ? "Imprimindo..." : "Imprimir na térmica"}
          </Button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Impressora
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

        <Button variant="outline" className="h-11 w-full sm:h-10 sm:w-auto" onClick={handleListPrinters} disabled={listing || printing}>
          {listing ? "Buscando..." : "Buscar impressoras"}
        </Button>

        {message ? (
          <p role="status" className={messageClass}>
            {message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Abra o QZ Tray neste computador. Na primeira impressão, aceite a permissão na janela do programa.
          </p>
        )}
      </div>

      <ReceiptPreview lines={lines} />
    </div>
  );
}
