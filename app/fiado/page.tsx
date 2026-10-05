"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppUrl, formatPhoneDisplay } from "@/lib/phone";

type FiadoOrder = {
  id: string;
  total: number;
  createdAt: string;
};

type FiadoCustomerGroup = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalOpen: number;
  orders: FiadoOrder[];
};

export default function FiadoPage() {
  const [groups, setGroups] = useState<FiadoCustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/fiado");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao carregar fiado");
      }
      const data = (await res.json()) as FiadoCustomerGroup[];
      setGroups(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao carregar fiado");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handlePay(orderId: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/fiado/${orderId}/pay`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao marcar como pago");
      }
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao marcar como pago");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalOpen = useMemo(
    () => groups.reduce((sum, group) => sum + group.totalOpen, 0),
    [groups]
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Fiado</h1>
        <p className="text-muted-foreground">
          Controle de pedidos fiado pendentes. Eles so entram no faturamento apos pagamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo em aberto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold">{formatCurrency(totalOpen)}</p>
          <p className="text-sm text-muted-foreground">
            {groups.length} cliente(s) com pendencias
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando pedidos fiado...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum fiado pendente no momento.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.customerId}>
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{group.customerName}</CardTitle>
                  <a
                    href={buildWhatsAppUrl(group.customerPhone)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {formatPhoneDisplay(group.customerPhone)}
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total em aberto</p>
                  <p className="font-semibold">{formatCurrency(group.totalOpen)}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="h-11 sm:h-9">
                    <a href={buildWhatsAppUrl(group.customerPhone)} target="_blank" rel="noreferrer">
                      Cobrar
                    </a>
                  </Button>
                </div>
                <div className="space-y-2">
                  {group.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="text-sm">
                        <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-muted-foreground">Data: {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <Button
                          className="h-11 w-full sm:h-9 sm:w-auto"
                          onClick={() => handlePay(order.id)}
                          disabled={updatingId === order.id}
                        >
                          {updatingId === order.id ? "Salvando..." : "Marcar como pago"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
