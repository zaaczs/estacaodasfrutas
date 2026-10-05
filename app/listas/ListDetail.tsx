"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBusinessDateLabel } from "@/lib/lists/businessDate";
import { repeatedAddressKeys } from "@/lib/lists/orderSearch";
import type { DeliveryListDto } from "@/lib/lists/types";
import { OrderCard } from "./OrderCard";

export function ListDetail() {
  const params = useParams<{ id: string }>();
  const [list, setList] = useState<DeliveryListDto | null>(null);
  const [error, setError] = useState("");

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
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Erro ao carregar a lista");
      });
  }, [params.id]);

  const sameAddress = useMemo(
    () => repeatedAddressKeys(list?.items.map((item) => item.order) ?? []),
    [list]
  );

  if (error) return <p className="p-4 text-sm text-destructive sm:p-6">{error}</p>;
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{list.name}</h1>
            <Badge variant="secondary">{list.typeLabel}</Badge>
            <Badge variant={list.status === "ARCHIVED" ? "outline" : "success"}>{list.statusLabel}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatBusinessDateLabel(list.serviceDate)} · {list.activeDeliveryCount} entrega(s) · criada por{" "}
            {list.createdBy.name}
          </p>
          {list.printedAt ? <p className="mt-1 text-sm text-muted-foreground">Lista já impressa. A reimpressão usa a ordem salva.</p> : null}
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

      {list.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Esta lista ainda não tem pedidos.</p>
      ) : null}

      <ol className="grid gap-3">
        {list.items.map((item, index) => {
          const previous = list.items[index - 1]?.order;
          const sharesAddress = Boolean(
            item.order.addressKey && previous?.addressKey === item.order.addressKey
          ) || sameAddress.has(item.order.addressKey);
          return (
            <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {String(item.position).padStart(2, "0")}
              </div>
              <div>
                <OrderCard order={item.order} sameAddress={sharesAddress} />
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
