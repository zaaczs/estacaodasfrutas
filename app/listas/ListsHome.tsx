"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBusinessDateLabel } from "@/lib/lists/businessDate";
import type { DeliveryListDto } from "@/lib/lists/types";

export function ListsHome({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [lists, setLists] = useState<DeliveryListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const deletingRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);

    setLoading(true);
    setError("");
    fetch(`/api/delivery-lists?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Erro ao carregar listas");
        return body as { lists: DeliveryListDto[] };
      })
      .then((body) => {
        if (active) setLists(body.lists.filter((list) => !deletingRef.current.has(list.id)));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Erro ao carregar listas");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch(`/api/delivery-lists?${params.toString()}`)
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!active || !response.ok) return;
          setLists(
            (body as { lists: DeliveryListDto[] }).lists.filter((list) => !deletingRef.current.has(list.id))
          );
        })
        .catch(() => undefined);
    }, 4000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [date]);

  async function removeList(list: DeliveryListDto) {
    const confirmed = window.confirm(
      `Apagar a lista "${list.name}"? Os pedidos continuam no sistema.`
    );
    if (!confirmed || deletingRef.current.has(list.id)) return;

    deletingRef.current.add(list.id);
    setDeletingId(list.id);
    setLists((current) => current.filter((item) => item.id !== list.id));
    setError("");
    try {
      const response = await fetch(`/api/delivery-lists/${list.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Erro ao apagar a lista");
    } catch (reason: unknown) {
      deletingRef.current.delete(list.id);
      setError(reason instanceof Error ? reason.message : "Erro ao apagar a lista");
      setLists((current) => (current.some((item) => item.id === list.id) ? current : [list, ...current]));
    } finally {
      setDeletingId("");
    }
  }

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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="text-sm sm:w-52">
          Data
          <Input className="mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
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
                <h2 className="text-lg font-semibold">{list.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatBusinessDateLabel(list.serviceDate)} · {list.onRouteCount} em rota ·{" "}
                  {list.finishedCount} finalizada(s) · {list.createdBy.name}
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-11 shrink-0 text-destructive hover:text-destructive lg:h-10 lg:w-10"
                  aria-label={`Apagar ${list.name}`}
                  disabled={deletingId === list.id}
                  onClick={() => void removeList(list)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
