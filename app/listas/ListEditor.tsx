"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orderMatchesQuery, repeatedAddressKeys } from "@/lib/lists/orderSearch";
import { moveItem } from "@/lib/lists/reorder";
import type { DeliveryListDto, DeliveryListWarning, DeliveryOrderSummary } from "@/lib/lists/types";
import { OrderCard } from "./OrderCard";

const fieldClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base md:h-10 md:text-sm";

const STATUS_FILTERS = [
  { value: "", label: "Todos os status" },
  { value: "RECEIVED", label: "Recebido" },
  { value: "OPEN", label: "Aberto" },
  { value: "PREPARING", label: "Preparando" },
  { value: "OUT_FOR_DELIVERY", label: "Saiu para entrega" },
  { value: "FINISHED", label: "Finalizado" },
];

async function readBody<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : "Não foi possível concluir a operação";
    throw new Error(message);
  }
  return body as T;
}

export function ListEditor({
  mode,
  listId,
  initialDate,
}: {
  mode: "create" | "edit";
  listId?: string;
  initialDate: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("DELIVERY");
  const [status, setStatus] = useState("ACTIVE");
  const [serviceDate, setServiceDate] = useState(initialDate);
  const [ordersDate, setOrdersDate] = useState(mode === "create" ? initialDate : "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [available, setAvailable] = useState<DeliveryOrderSummary[]>([]);
  const [selected, setSelected] = useState<DeliveryOrderSummary[]>([]);
  const [loadingList, setLoadingList] = useState(mode === "edit");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !listId) return;
    const controller = new AbortController();
    fetch(`/api/delivery-lists/${listId}`, { signal: controller.signal })
      .then((response) => readBody<DeliveryListDto>(response))
      .then((list) => {
        setName(list.name);
        setType(list.type);
        setStatus(list.status);
        setServiceDate(list.serviceDate);
        setOrdersDate(list.serviceDate);
        setSelected(list.items.map((item) => item.order));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Erro ao carregar a lista");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });
    return () => controller.abort();
  }, [mode, listId]);

  useEffect(() => {
    if (!ordersDate) return;
    const controller = new AbortController();

    async function loadOrders(silent: boolean) {
      if (!silent) setLoadingOrders(true);
      try {
        const response = await fetch(`/api/delivery-lists/orders?date=${ordersDate}`, {
          signal: controller.signal,
        });
        const body = await readBody<{ orders: DeliveryOrderSummary[] }>(response);
        setAvailable(body.orders);
        setSelected((current) =>
          current.map((item) => body.orders.find((order) => order.id === item.id) ?? item)
        );
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (!silent) setError(reason instanceof Error ? reason.message : "Erro ao carregar pedidos");
      } finally {
        if (!controller.signal.aborted && !silent) setLoadingOrders(false);
      }
    }

    void loadOrders(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOrders(true);
    }, 20000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [ordersDate]);

  const selectedIds = useMemo(() => new Set(selected.map((order) => order.id)), [selected]);
  const visible = useMemo(
    () =>
      available.filter((order) => {
        if (order.status === "CANCELED") return false;
        if (statusFilter && order.status !== statusFilter) return false;
        return orderMatchesQuery(order, query);
      }),
    [available, query, statusFilter]
  );
  const sameAddress = useMemo(
    () => repeatedAddressKeys([...visible, ...selected]),
    [visible, selected]
  );

  function otherActiveLists(order: DeliveryOrderSummary) {
    if (!listId) return order.activeLists;
    return order.activeLists.filter((list) => list.id !== listId);
  }

  function orderForCard(order: DeliveryOrderSummary): DeliveryOrderSummary {
    const activeLists = otherActiveLists(order);
    if (activeLists.length === order.activeLists.length) return order;
    return { ...order, activeLists };
  }

  function addOrders(orders: DeliveryOrderSummary[]) {
    if (orders.some((order) => order.status === "CANCELED")) {
      setError("Pedido cancelado não entra na lista");
      return;
    }
    const already = orders.filter((order) => selectedIds.has(order.id));
    if (already.length > 0 && orders.length === 1) {
      setError("Este pedido já está nesta lista");
      return;
    }
    setError("");
    setSelected((current) => {
      const ids = new Set(current.map((order) => order.id));
      return [...current, ...orders.filter((order) => !ids.has(order.id))];
    });
  }

  async function save() {
    setError("");
    const warnings = selected.flatMap((order) =>
      otherActiveLists(order).map((list) => `#${order.number} também está em ${list.name}`)
    );
    if (warnings.length > 0) {
      const confirmed = window.confirm(
        `Estes pedidos já estão em outra lista ativa:\n\n${warnings.join("\n")}\n\nDeseja salvar mesmo assim?`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        type,
        status,
        serviceDate,
        orderIds: selected.map((order) => order.id),
      };
      const response = await fetch(mode === "create" ? "/api/delivery-lists" : `/api/delivery-lists/${listId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readBody<{ list: DeliveryListDto; warnings: DeliveryListWarning[] }>(response);
      if (warnings.length === 0 && result.warnings.length > 0) {
        window.alert(
          result.warnings
            .map((warning) => `#${warning.orderNumber} também está em ${warning.listName}`)
            .join("\n")
        );
      }
      router.push(`/listas/${result.list.id}`);
      router.refresh();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Erro ao salvar a lista");
    } finally {
      setSaving(false);
    }
  }

  if (loadingList) {
    return <p className="p-4 text-sm text-muted-foreground sm:p-6">Carregando lista...</p>;
  }

  return (
    <div className="p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 h-11 px-0 sm:h-10">
            <Link href="/listas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{mode === "create" ? "Nova lista" : "Editar lista"}</h1>
        </div>
        <Button className="hidden h-11 lg:inline-flex lg:h-10" onClick={() => void save()} disabled={saving}>
          {saving ? "Salvando..." : "Salvar lista"}
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Nome da lista
          <Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="Entregas da manhã" />
        </label>
        <label className="text-sm">
          Data da lista
          <Input className="mt-1" type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        </label>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Pedidos disponíveis</h2>
            <Button type="button" variant="outline" className="h-11 lg:h-10" onClick={() => addOrders(visible)}>
              Adicionar visíveis
            </Button>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Buscar
              <Input
                className="mt-1"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, telefone, endereço ou pedido"
              />
            </label>
            <label className="text-sm">
              Dia dos pedidos
              <Input className="mt-1" type="date" value={ordersDate} onChange={(event) => setOrdersDate(event.target.value)} />
            </label>
            <label className="text-sm">
              Status
              <select className={`${fieldClass} mt-1`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loadingOrders ? <p className="text-sm text-muted-foreground">Carregando pedidos...</p> : null}
          {!loadingOrders && visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado. Pedidos cancelados não entram aqui.</p>
          ) : null}
          <div className="grid gap-2">
            {visible.map((order) => {
              const included = selectedIds.has(order.id);
              return (
                <OrderCard key={order.id} order={orderForCard(order)} sameAddress={sameAddress.has(order.addressKey)}>
                  <Button
                    type="button"
                    className="h-11 shrink-0 lg:h-10"
                    variant={included ? "secondary" : "default"}
                    disabled={included}
                    onClick={() => addOrders([order])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {included ? "Na lista" : "Adicionar"}
                  </Button>
                </OrderCard>
              );
            })}
          </div>
        </section>

        <section id="selecionados" className="rounded-xl border bg-card p-3 sm:p-4">
          <h2 className="mb-3 font-semibold">
            Entregas da lista
            <span className="ml-2 text-sm font-normal text-muted-foreground">{selected.length} pedido(s)</span>
          </h2>
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">Adicione os pedidos e organize a ordem das entregas.</p>
          ) : null}
          <div className="grid gap-2">
            {selected.map((order, index) => (
              <div
                key={order.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                  setDragIndex(index);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  if (!Number.isNaN(from)) setSelected((current) => moveItem(current, from, index));
                  setDragIndex(null);
                }}
                className={dragIndex === index ? "opacity-60" : undefined}
              >
                <OrderCard order={orderForCard(order)} sameAddress={sameAddress.has(order.addressKey)}>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground lg:inline-flex"
                      aria-label="Arrastar entrega"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-11 w-11"
                      aria-label="Mover para cima"
                      disabled={index === 0}
                      onClick={() => setSelected((current) => moveItem(current, index, index - 1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-11 w-11"
                      aria-label="Mover para baixo"
                      disabled={index === selected.length - 1}
                      onClick={() => setSelected((current) => moveItem(current, index, index + 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 text-destructive"
                      aria-label="Remover da lista"
                      onClick={() => setSelected((current) => current.filter((item) => item.id !== order.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </OrderCard>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11" asChild>
            <a href="#selecionados">Ver selecionados ({selected.length})</a>
          </Button>
          <Button type="button" className="h-11" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
