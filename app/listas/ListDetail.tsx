"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBusinessDateLabel } from "@/lib/lists/businessDate";
import { DeliveryRouteStatus } from "@/lib/lists/constants";
import { repeatedAddressKeys } from "@/lib/lists/orderSearch";
import type { DeliveryListDto } from "@/lib/lists/types";
import { OrderCard } from "./OrderCard";

export function ListDetail() {
  const params = useParams<{ id: string }>();
  const [list, setList] = useState<DeliveryListDto | null>(null);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const updatingRef = useRef(false);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    const controller = new AbortController();

    async function load(silent: boolean) {
      if (updatingRef.current) return;
      try {
        const response = await fetch(`/api/delivery-lists/${id}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Lista não encontrada");
        setList(body as DeliveryListDto);
        if (!silent) setError("");
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (!silent) {
          setError(reason instanceof Error ? reason.message : "Erro ao carregar a lista");
        }
      }
    }

    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 4000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [params.id]);

  const sameAddress = useMemo(
    () => repeatedAddressKeys(list?.items.map((item) => item.order) ?? []),
    [list]
  );

  async function updateRoute(itemId: string, routeStatus: string) {
    if (!list || updatingRef.current) return;
    updatingRef.current = true;
    setUpdatingId(itemId);
    setError("");
    try {
      const response = await fetch(`/api/delivery-lists/${list.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeStatus }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Erro ao atualizar a entrega");
      setList(body as DeliveryListDto);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Erro ao atualizar a entrega");
    } finally {
      updatingRef.current = false;
      setUpdatingId("");
    }
  }

  if (error && !list) return <p className="p-4 text-sm text-destructive sm:p-6">{error}</p>;
  if (!list) return <p className="p-4 text-sm text-muted-foreground sm:p-6">Carregando lista...</p>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Button asChild variant="ghost" className="mb-3 h-11 px-0 sm:h-10">
        <Link href="/listas">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{list.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatBusinessDateLabel(list.serviceDate)} · {list.onRouteCount} em rota · {list.finishedCount}{" "}
            finalizada(s) · criada por {list.createdBy.name}
          </p>
          {list.printedAt ? (
            <p className="mt-1 text-sm text-muted-foreground">Lista já impressa. A reimpressão usa a ordem salva.</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href={`/listas/${list.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button asChild className="h-11 sm:h-10">
            <Link href={`/listas/${list.id}/print`}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta lista ainda não tem pedidos.</p>
      ) : null}

      <ol className="grid gap-3">
        {list.items.map((item, index) => {
          const previous = list.items[index - 1]?.order;
          const sharesAddress =
            Boolean(item.order.addressKey && previous?.addressKey === item.order.addressKey) ||
            sameAddress.has(item.order.addressKey);
          const finished = item.routeStatus === DeliveryRouteStatus.FINISHED;
          const nextStatus = finished ? DeliveryRouteStatus.ON_ROUTE : DeliveryRouteStatus.FINISHED;

          return (
            <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {String(item.position).padStart(2, "0")}
              </div>
              <div>
                <OrderCard order={item.order} sameAddress={sharesAddress}>
                  <Button
                    type="button"
                    className="h-11 shrink-0"
                    variant={finished ? "outline" : "default"}
                    disabled={updatingId === item.id}
                    onClick={() => void updateRoute(item.id, nextStatus)}
                  >
                    {updatingId === item.id ? "Salvando..." : finished ? "Voltar para em rota" : "Marcar finalizado"}
                  </Button>
                </OrderCard>
                <p className={`mt-2 text-sm font-medium ${finished ? "text-primary" : "text-amber-800"}`}>
                  {item.routeStatusLabel}
                </p>
                {item.changedAfterPrint ? (
                  <p className="mt-2 text-sm text-amber-800">
                    Este pedido mudou depois da última impressão. Confira os dados antes de imprimir de novo.
                  </p>
                ) : null}
                {item.order.status === "CANCELED" ? (
                  <p className="mt-2 text-sm font-medium text-destructive">Pedido cancelado. Não entregar.</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
