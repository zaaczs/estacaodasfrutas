"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Trash2 } from "lucide-react";
import { CustomerModal } from "@/app/clientes/CustomerModal";
import { useSession } from "next-auth/react";
import { formatPhoneDisplay, isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";
import { CustomerLookup } from "@/app/pedidos/CustomerLookup";
import { OrderType, PaymentMethod } from "@/lib/constants";

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

export default function NovoPedidoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [orderType, setOrderType] = useState<string>(OrderType.PICKUP);
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMethod.PIX);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("activeOnly", "true");
    params.set("limit", "1000");
    if (search) params.set("search", search);
    if (selectedCategory) params.set("category", selectedCategory);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
  }, [search, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/products/categories");
    if (res.ok) {
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    const res = await fetch("/api/customers");
    if (res.ok) {
      const data = await res.json();
      setCustomers(data);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const groupedProducts = useMemo(() => {
    const source = [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (selectedCategory) return [[selectedCategory, source] as [string, Product[]]];
    const map = new Map<string, Product[]>();
    for (const product of source) {
      const category = product.category?.trim() || "Outros";
      if (!map.has(category)) map.set(category, []);
      map.get(category)!.push(product);
    }
    const orderedKeys = [...map.keys()].sort((a, b) => {
      const ia = categories.indexOf(a);
      const ib = categories.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, "pt-BR");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return orderedKeys.map((key) => [key, map.get(key)!] as [string, Product[]]);
  }, [products, categories, selectedCategory]);

  const addToCart = (product: Product, qty: number = 1) => {
    if (qty <= 0) return;
    setCart((prev) => {
      const exist = prev.find((c) => c.productId === product.id);
      if (exist) {
        return prev.map((c) =>
          c.productId === product.id
            ? { ...c, quantity: c.quantity + qty }
            : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          price: product.price,
          quantity: qty,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId ? { ...c, quantity } : c
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((sum, i) => sum + i.quantity * i.price, 0);

  async function handleFinish() {
    if (cart.length === 0) {
      alert("Adicione itens ao pedido");
      return;
    }
    if (!customerId) {
      alert("Selecione um cliente para continuar");
      return;
    }
    if (orderType === OrderType.DELIVERY && !deliveryAddress.trim()) {
      alert("Informe o endereço para pedidos de entrega");
      return;
    }
    if (!isValidPhoneDigits(customerPhone)) {
      alert("Informe um telefone válido com DDD");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          orderType,
          customerPhoneSnapshot: normalizePhoneDigits(customerPhone),
          deliveryAddress: orderType === OrderType.DELIVERY ? deliveryAddress.trim() : undefined,
          paymentMethod,
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            price: c.price,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar pedido");
      }
      const order = await res.json();

      const finishRes = await fetch(`/api/orders/${order.id}/finish`, {
        method: "POST",
      });
      if (!finishRes.ok) {
        const err = await finishRes.json();
        throw new Error(err.error || "Erro ao finalizar pedido");
      }

      router.push(`/pedidos/${order.id}/print`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao finalizar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Novo pedido</h1>
        <p className="text-muted-foreground">
          Busque produtos e adicione ao carrinho
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button
                size="sm"
                variant={selectedCategory ? "outline" : "default"}
                onClick={() => setSelectedCategory("")}
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {groupedProducts.map(([category, items]) => (
                <div key={category} className="space-y-2">
                  {!selectedCategory && (
                    <h3 className="text-sm font-semibold text-muted-foreground pt-2">{category}</h3>
                  )}
                  {items.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)} / {product.unit} · Estoque: {product.stock}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum produto encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carrinho</CardTitle>
            <div className="flex justify-end">
              <CustomerModal
                open={customerModalOpen}
                onOpenChange={setCustomerModalOpen}
                onSaved={(saved) => {
                  setCustomers((prev) =>
                    [saved, ...prev.filter((c) => c.id !== saved.id)].sort((a, b) =>
                      a.name.localeCompare(b.name, "pt-BR")
                    )
                  );
                  setCustomerId(saved.id);
                  setCustomerPhone(formatPhoneDisplay(saved.phone));
                  if (saved.address) setDeliveryAddress(saved.address);
                }}
                trigger={<Button type="button" variant="outline">Novo cliente</Button>}
              />
            </div>
            <CustomerLookup
              customers={customers}
              customerId={customerId}
              customerPhone={customerPhone}
              onSelect={(customer) => {
                setCustomerId(customer.id);
                setCustomerPhone(formatPhoneDisplay(customer.phone));
                if (customer.address) setDeliveryAddress(customer.address);
              }}
              onPhoneChange={setCustomerPhone}
              onClearCustomer={() => setCustomerId("")}
            />
            <div className="space-y-1">
              <Label>Tipo do pedido *</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={OrderType.DELIVERY}>Entrega</SelectItem>
                  <SelectItem value={OrderType.PICKUP}>Retirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {orderType === OrderType.DELIVERY && (
              <div className="space-y-1">
                <Label>Endereço *</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Rua, número, complemento"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.PIX}>{PaymentMethod.PIX}</SelectItem>
                  <SelectItem value={PaymentMethod.CREDIT}>{PaymentMethod.CREDIT}</SelectItem>
                  <SelectItem value={PaymentMethod.DEBIT}>{PaymentMethod.DEBIT}</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>{PaymentMethod.CASH}</SelectItem>
                  {isAdmin && (
                    <>
                      <SelectItem value={PaymentMethod.FIADO_SIGN}>
                        {PaymentMethod.FIADO_SIGN}
                      </SelectItem>
                      <SelectItem value={PaymentMethod.FIADO_WRITE_DOWN}>
                        {PaymentMethod.FIADO_WRITE_DOWN}
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {(paymentMethod === PaymentMethod.FIADO_SIGN ||
                paymentMethod === PaymentMethod.FIADO_WRITE_DOWN) && (
                <p className="text-sm rounded-md bg-amber-100 text-amber-900 px-3 py-2">
                  Pedido FIADO: não entra no faturamento/lucro enquanto estiver pendente.
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} / {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.productId, parseFloat(e.target.value) || 0)
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground w-8">
                      {item.unit}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.productId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="font-medium">
                    {formatCurrency(item.quantity * item.price)}
                  </p>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Carrinho vazio
                </p>
              )}
            </div>
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button
                className="w-full mt-4"
                onClick={handleFinish}
                disabled={cart.length === 0 || loading}
              >
                {loading ? "Finalizando..." : "Finalizar pedido"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
