"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft } from "lucide-react";

type OrderItem = {
  product: { name: string; unit: string };
  quantity: number;
  price: number;
  notes?: string | null;
};

type PrintOrder = {
  id: string;
  total: number;
  createdAt: string;
  paymentMethod?: string | null;
  deliveryAddress?: string | null;
  customer?: { name: string; phone?: string | null } | null;
  items: OrderItem[];
};

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<PrintOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Pedido não encontrado");
        return (await res.json()) as PrintOrder;
      })
      .then(setOrder)
      .catch(() => setError("Não foi possível carregar o pedido."));
  }, [id]);

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

  return (
    <div className="bg-neutral-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-md gap-3 print:hidden">
        <Button variant="outline" onClick={() => router.push("/pedidos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir cupom
        </Button>
      </div>

      <article id="cupom" className="cupom shadow-sm print:shadow-none">
        <div className="cupom-center">
          <h1 className="cupom-title">ESTAÇÃO DAS FRUTAS</h1>
          <p>Cupom de pedido</p>
        </div>

        <div className="cupom-line" />

        <p>Data: {formatDate(order.createdAt)}</p>
        <p>Pedido: #{order.id.slice(0, 8)}</p>
        {order.customer && <p>Cliente: {order.customer.name}</p>}
        {order.customer?.phone && <p>Telefone: {order.customer.phone}</p>}
        {order.deliveryAddress && <p>Endereço: {order.deliveryAddress}</p>}

        <div className="cupom-line" />

        {order.items.map((item, index) => (
          <div className="cupom-item" key={`${item.product.name}-${index}`}>
            <p>{item.product.name}</p>
            {item.notes && <p className="cupom-note">{item.notes}</p>}
            <div className="cupom-row">
              <span>
                {item.quantity} {item.product.unit} x {formatCurrency(item.price)}
              </span>
              <span>{formatCurrency(item.quantity * item.price)}</span>
            </div>
          </div>
        ))}

        <div className="cupom-line" />

        <div className="cupom-row cupom-total">
          <span>TOTAL</span>
          <span>{formatCurrency(order.total)}</span>
        </div>

        <div className="cupom-line" />

        <p>Pagamento: {order.paymentMethod || "—"}</p>
        <p className="cupom-center" style={{ marginTop: 12 }}>
          Obrigado pela preferência!
        </p>
      </article>
    </div>
  );
}
