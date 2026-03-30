"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Printer, ArrowLeft } from "lucide-react";

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [order, setOrder] = useState<{
    id: string;
    total: number;
    createdAt: string;
    paymentMethod?: string;
    deliveryAddress?: string;
    customer?: { name: string; phone?: string };
    items: Array<{
      product: { name: string; unit: string };
      quantity: number;
      price: number;
      notes?: string;
    }>;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="flex gap-4 mb-8 print:hidden">
        <Button variant="outline" onClick={() => router.push("/pedidos")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div id="cupom" className="max-w-md mx-auto border border-black p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">ESTAÇÃO DAS FRUTAS</h1>
          <p className="text-sm text-muted-foreground">CNPJ: XX.XXX.XXX/0001-XX</p>
        </div>

        <div className="space-y-2 text-sm mb-6">
          <p><strong>Data:</strong> {formatDate(order.createdAt)}</p>
          <p><strong>Pedido:</strong> #{order.id.slice(0, 8)}</p>
          {order.customer && (
            <>
              <p><strong>Cliente:</strong> {order.customer.name}</p>
              {order.customer.phone && <p><strong>Telefone:</strong> {order.customer.phone}</p>}
            </>
          )}
          {order.deliveryAddress && <p><strong>Endereço:</strong> {order.deliveryAddress}</p>}
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-2">Item</th>
              <th className="text-center py-2">Qtd</th>
              <th className="text-right py-2">Unit.</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.product.name} className="border-b border-gray-300">
                <td className="py-2">
                  <div>{item.product.name}</div>
                  {item.notes && (
                    <div className="text-[11px] text-muted-foreground">{item.notes}</div>
                  )}
                </td>
                <td className="text-center py-2">
                  {item.quantity} {item.product.unit}
                </td>
                <td className="text-right py-2">{formatCurrency(item.price)}</td>
                <td className="text-right py-2">
                  {formatCurrency(item.quantity * item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 pt-4 border-t-2 border-black">
          <div className="flex justify-between text-lg font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Forma de pagamento: {order.paymentMethod ?? "_________________"}</p>
          <p className="mt-4">Obrigado pela preferência!</p>
        </div>
      </div>
    </div>
  );
}
