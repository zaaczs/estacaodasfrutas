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

  return (
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
            <TableCell className="max-w-[420px]">
              <div className="space-y-1">
                {order.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-xs">
                    <span className="font-medium">
                      {formatQuantity(item.quantity, item.product.unit)} {item.product.unit} - {item.product.name}
                    </span>
                    {item.notes && (
                      <p className="text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-[11px] text-muted-foreground">
                    + {order.items.length - 3} item(ns)
                  </p>
                )}
              </div>
            </TableCell>
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
            <TableCell>
              <div className="flex flex-wrap gap-2">
                {(order.status === "OPEN" || order.status === "RECEIVED") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatus(order.id, "PREPARING")}
                  >
                    Preparando
                  </Button>
                )}
                {order.status === "PREPARING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatus(order.id, "OUT_FOR_DELIVERY")}
                  >
                    Saiu entrega
                  </Button>
                )}
                {order.status === "OUT_FOR_DELIVERY" && (
                  <Button
                    variant="outline"
                    size="sm"
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
