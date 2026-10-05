"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatQuantity } from "@/lib/quantity";
import { Printer, Check, Pencil } from "lucide-react";

type Order = {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  customer?: { name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    notes?: string | null;
    product: { name: string; unit: string };
  }>;
};

type Props = {
  orders: Order[];
};

export function PedidosTable({ orders }: Props) {
  function mapStatusLabel(status: string) {
    if (status === "PREPARING") return "Preparando";
    if (status === "OUT_FOR_DELIVERY") return "Saiu para entrega";
    if (status === "FINISHED") return "Finalizado";
    if (status === "CANCELED") return "Cancelado";
    return "Recebido";
  }

  function statusVariant(status: string): "success" | "destructive" | "secondary" {
    if (status === "FINISHED") return "success";
    if (status === "CANCELED") return "destructive";
    return "secondary";
  }

  async function handleStatus(id: string, status: "RECEIVED" | "PREPARING" | "OUT_FOR_DELIVERY") {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao atualizar status");
      }
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar status");
    }
  }

  async function handleFinish(id: string) {
    try {
      const res = await fetch(`/api/orders/${id}/finish`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao finalizar");
      }
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao finalizar pedido");
    }
  }

  function renderStatusActions(order: Order, fullWidth: boolean) {
    const buttonClass = fullWidth ? "h-11 w-full" : undefined;

    return (
      <div className={fullWidth ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
        {(order.status === "OPEN" || order.status === "RECEIVED") && (
          <Button
            variant="outline"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatus(order.id, "PREPARING")}
          >
            Preparando
          </Button>
        )}
        {order.status === "PREPARING" && (
          <Button
            variant="outline"
            size="sm"
            className={buttonClass}
            onClick={() => handleStatus(order.id, "OUT_FOR_DELIVERY")}
          >
            Saiu entrega
          </Button>
        )}
        {order.status === "OUT_FOR_DELIVERY" && (
          <Button
            variant="outline"
            size="sm"
            className={buttonClass}
            onClick={() => handleFinish(order.id)}
          >
            <Check className="h-4 w-4 mr-1" />
            Finalizar
          </Button>
        )}
        {(order.status === "FINISHED" || order.status === "CANCELED") && (
          <span className="text-xs text-muted-foreground self-center">
            Sem ações pendentes
          </span>
        )}
      </div>
    );
  }

  function renderItems(order: Order) {
    return (
      <div className="space-y-1">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="text-xs">
            <span className="font-medium break-words">
              {formatQuantity(item.quantity, item.product.unit)} {item.product.unit} - {item.product.name}
            </span>
            {item.notes && (
              <p className="break-words text-muted-foreground">{item.notes}</p>
            )}
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-[11px] text-muted-foreground">
            + {order.items.length - 3} item(ns)
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 xl:hidden">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pedido nesta data.
          </p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{order.customer?.name ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <Badge variant={statusVariant(order.status)} className="shrink-0">
                  {mapStatusLabel(order.status)}
                </Badge>
              </div>
              <div className="mt-3">{renderItems(order)}</div>
              <p className="mt-3 text-base font-semibold">{formatCurrency(order.total)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 w-full" asChild>
                  <Link href={`/pedidos/${order.id}/print`}>
                    <Printer className="mr-1 h-4 w-4" />
                    Imprimir
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 w-full" asChild>
                  <Link href={`/pedidos/${order.id}/editar`}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              </div>
              <div className="mt-2">{renderStatusActions(order, true)}</div>
            </article>
          ))
        )}
      </div>

      <div className="hidden xl:block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Itens</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[220px]">Ações</TableHead>
          <TableHead className="w-[280px]">Atualizar status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{formatDate(order.createdAt)}</TableCell>
            <TableCell>{order.customer?.name ?? "-"}</TableCell>
            <TableCell className="max-w-[420px]">{renderItems(order)}</TableCell>
            <TableCell>{formatCurrency(order.total)}</TableCell>
            <TableCell>
              <Badge
                variant={statusVariant(order.status)}
              >
                {mapStatusLabel(order.status)}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                <Link href={`/pedidos/${order.id}/print`}>
                  <Button variant="ghost" size="sm" title="Imprimir pedido">
                    <Printer className="h-4 w-4 mr-1" />
                    Imprimir
                  </Button>
                </Link>
                <Link href={`/pedidos/${order.id}/editar`}>
                  <Button variant="ghost" size="sm" title="Editar pedido">
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </Link>
              </div>
            </TableCell>
            <TableCell>{renderStatusActions(order, false)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      </div>
    </>
  );
}
