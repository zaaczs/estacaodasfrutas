import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { DeliveryOrderSummary } from "@/lib/lists/types";

export function OrderCard({
  order,
  sameAddress,
  children,
}: {
  order: DeliveryOrderSummary;
  sameAddress: boolean;
  children?: ReactNode;
}) {
  const canceled = order.status === "CANCELED";

  return (
    <article
      className={`rounded-lg border p-3 ${
        canceled
          ? "border-destructive/40 bg-destructive/5"
          : sameAddress
            ? "border-amber-400 bg-amber-50"
            : "bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            #{order.number}
            <span className="ml-2 font-medium text-muted-foreground">{order.timeLabel}</span>
          </p>
          <p className="mt-1 text-base font-medium leading-snug">{order.customerName}</p>
          {order.phone ? <p className="text-sm text-muted-foreground">{order.phone}</p> : null}
        </div>
        {children}
      </div>

      <div className="mt-2 text-sm leading-snug">
        {order.street ? <p>{order.street}</p> : <p className="text-muted-foreground">{order.orderTypeLabel === "Retirada" ? "Retirada no local" : "Endereço não informado"}</p>}
        {order.neighborhood ? <p>Bairro: {order.neighborhood}</p> : null}
        {order.complement ? <p>Complemento: {order.complement}</p> : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant={canceled ? "destructive" : "secondary"}>{order.statusLabel}</Badge>
        <Badge variant="outline">{order.originLabel}</Badge>
        <Badge variant="outline">{order.orderTypeLabel}</Badge>
      </div>

      {sameAddress ? (
        <p className="mt-2 text-sm font-medium text-amber-800">Mesmo endereço de outro pedido</p>
      ) : null}
      {order.activeLists.length > 0 ? (
        <p className="mt-2 text-sm text-amber-800">
          Também está em {order.activeLists.map((list) => list.name).join(", ")}
        </p>
      ) : null}
    </article>
  );
}
