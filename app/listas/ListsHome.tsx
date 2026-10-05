"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBusinessDateLabel } from "@/lib/lists/businessDate";
import { DELIVERY_LIST_TYPE_OPTIONS } from "@/lib/lists/constants";
import type { DeliveryListDto } from "@/lib/lists/types";

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base md:h-10 md:text-sm";

export function ListsHome({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [lists, setLists] = useState<DeliveryListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (type) params.set("type", type);
    if (status) params.set("status", status);

    setLoading(true);
    setError("");
    fetch(`/api/delivery-lists?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Erro ao carregar listas");
        return body as { lists: DeliveryListDto[] };
      })
      .then((body) => setLists(body.lists))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Erro ao carregar listas");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, type, status]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Listas</h1>
          <p className="text-muted-foreground">Organize as entregas do dia e imprima a rota</p>
        </div>
        <Button asChild className="h-11 w-full sm:h-10 sm:w-auto">
          <Link href="/listas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Nova lista
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Data
          <Input className="mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="text-sm">
          Tipo
          <select className={`${fieldClass} mt-1`} value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos</option>
            {DELIVERY_LIST_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select className={`${fieldClass} mt-1`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="ACTIVE">Ativas</option>
            <option value="ARCHIVED">Arquivadas</option>
          </select>
        </label>
      </div>

      <div className="mb-4 flex justify-end">
        <Button type="button" variant="ghost" className="h-11 sm:h-10" onClick={() => setDate("")}>
          Ver todas as datas
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando listas...</p> : null}
      {!loading && lists.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma lista encontrada para esse filtro.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {lists.map((list) => (
          <Card key={list.id}>
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{list.name}</h2>
                  <Badge variant="secondary">{list.typeLabel}</Badge>
                  <Badge variant={list.status === "ARCHIVED" ? "outline" : "success"}>{list.statusLabel}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBusinessDateLabel(list.serviceDate)} · {list.deliveryCount} pedido(s) ·{" "}
                  {list.activeDeliveryCount} entrega(s) · {list.createdBy.name}
                </p>
                {list.printedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">Já impressa. Pode reimprimir.</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" className="h-11 lg:h-10">
                  <Link href={`/listas/${list.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 lg:h-10">
                  <Link href={`/listas/${list.id}/editar`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
                <Button asChild className="h-11 lg:h-10">
                  <Link href={`/listas/${list.id}/print`}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
