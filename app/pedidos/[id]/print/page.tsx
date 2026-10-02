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
    <div className="print-root min-h-screen bg-white p-8 print:p-0">
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

      <div id="cupom" className="max-w-md mx-auto border border-black p-6 print:max-w-none print:border-0 print:p-0">
        <div className="text-center mb-6 print:mb-3">
          <h1 className="text-2xl font-bold print:text-xl">ESTAÇÃO DAS FRUTAS</h1>
          <p className="text-sm text-muted-foreground print:text-[11px]">CNPJ: XX.XXX.XXX/0001-XX</p>
        </div>

        <div className="print-meta space-y-2 text-sm mb-6 print:mb-4">
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

        <table className="print-table w-full text-sm border-collapse">
          <colgroup>
            <col className="item-col" />
            <col className="qty-col" />
            <col className="value-col" />
            <col className="value-col" />
          </colgroup>
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
                <td className="py-2 break-words">
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

        <div className="mt-6 text-center text-sm text-muted-foreground print:mt-4 print:text-[11px]">
          <p>Forma de pagamento: {order.paymentMethod ?? "_________________"}</p>
          <p className="mt-4">Obrigado pela preferência!</p>
        </div>
      </div>

      <style jsx global>{`
        @page {
          size: 80mm auto;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-root {
            min-height: auto !important;
            padding: 0 !important;
          }

          #cupom {
            width: 72mm;
            max-width: 72mm;
            margin: 0 auto !important;
            box-shadow: none !important;
          }

          .print-meta {
            font-size: 12px !important;
            line-height: 1.3;
          }

          .print-table {
            width: 100%;
            font-size: 12px !important;
            table-layout: fixed;
          }

          .print-table .item-col {
            width: 50%;
          }

          .print-table .qty-col {
            width: 12%;
          }

          .print-table .value-col {
            width: 19%;
          }

          .print-table th,
          .print-table td {
            padding: 4px 0;
            vertical-align: top;
          }
        }
      `}</style>
    </div>
  );
}
