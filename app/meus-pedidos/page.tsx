"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatQuantity } from "@/lib/quantity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneDisplay, isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";
import { Home, ShoppingCart, ClipboardList, User } from "lucide-react";

type Order = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  paymentMethod?: string | null;
  items: Array<{
    id: string;
    quantity: number;
    notes?: string | null;
    product: { name: string; unit: string };
  }>;
};

function mapStatusLabel(status: string) {
  if (status === "PREPARING") return "Sendo preparado";
  if (status === "OUT_FOR_DELIVERY") return "Saiu para entrega";
  if (status === "FINISHED") return "Finalizado";
  if (status === "CANCELED") return "Cancelado";
  return "Pedido recebido";
}

export default function MeusPedidosPage() {
  const { data: session, status } = useSession();
  const isCustomerSession = session?.user?.role === "CUSTOMER";
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchOrders(phoneDigits?: string) {
    setLoading(true);
    setError("");
    try {
      const url =
        isCustomerSession && session?.user?.id && !phoneDigits
          ? "/api/orders/public/list"
          : `/api/orders/public/list?phone=${encodeURIComponent(phoneDigits ?? "")}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível consultar pedidos.");
      }
      setOrders(data as Order[]);
    } catch (e) {
      setOrders([]);
      setError(e instanceof Error ? e.message : "Erro ao consultar pedidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    if (isCustomerSession && session?.user?.id) {
      void fetchOrders();
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem("public_orders_phone") : "";
    if (stored && isValidPhoneDigits(stored)) {
      setPhone(formatPhoneDisplay(stored));
      void fetchOrders(stored);
    }
  }, [session, status, isCustomerSession]);

  function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    const digits = normalizePhoneDigits(phone);
    if (!isValidPhoneDigits(digits)) {
      setError("Informe um telefone com DDD válido.");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("public_orders_phone", digits);
    }
    void fetchOrders(digits);
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] p-4 md:p-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Pedidos</h1>
            <p className="text-sm text-gray-500">
              Acompanhe status: recebido, preparando ou saiu para entrega.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Voltar para a loja</Link>
          </Button>
        </div>

        {!isCustomerSession && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="text-sm text-gray-700">
              Você pode consultar pedidos recentes apenas com telefone. Para histórico completo,
              entre no perfil ou crie seu cadastro.
            </p>
            <form onSubmit={handleManualLookup} className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[220px]">
                <Label htmlFor="phone">Telefone com DDD</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Consultando..." : "Consultar pedidos"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/login?customer=1&callbackUrl=/perfil">Entrar/Cadastrar</Link>
              </Button>
            </form>
          </div>
        )}

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {orders.length === 0 && !loading ? (
          <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                    {mapStatusLabel(order.status)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>Data: {formatDate(order.createdAt)}</p>
                  <p>Total: {formatCurrency(order.total)}</p>
                  <p>Pagamento: {order.paymentMethod ?? "Não informado"}</p>
                </div>
                <div className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="rounded border p-2 text-sm">
                      <p className="font-medium">
                        {formatQuantity(item.quantity, item.product.unit)} {item.product.unit} - {item.product.name}
                      </p>
                      {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-6xl mx-auto flex h-16 w-full items-stretch">
          <Link
            href="/"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <Home className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Início</span>
          </Link>

          <Link
            href="/"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <ShoppingCart className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Carrinho</span>
          </Link>

          <Link
            href="/meus-pedidos"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[#2e7d32] min-w-0 py-2"
          >
            <ClipboardList className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Pedidos</span>
          </Link>

          <Link
            href={session ? "/perfil" : "/login?customer=1&callbackUrl=/perfil"}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <User className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Perfil</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}
