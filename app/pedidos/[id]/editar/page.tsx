"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { Search, Trash2, ArrowLeft } from "lucide-react";
import { formatQuantity, lineAmount, sumLineAmounts } from "@/lib/quantity";
import { formatCustomerAddress } from "@/lib/customerAddress";
import { AddByQuantityButton, CartQuantityInput } from "@/components/orders/OrderQuantityControls";
import { CustomerModal } from "@/app/clientes/CustomerModal";
import { useSession } from "next-auth/react";
import { formatPhoneDisplay, isValidPhoneDigits, normalizePhoneDigits } from "@/lib/phone";
import { CustomerLookup } from "@/app/pedidos/CustomerLookup";
import { OrderType, PaymentMethod } from "@/lib/constants";
import {
  categoryOptionLabel,
  parseCategoryOptions,
  type CategoryOption,
} from "@/lib/categoryLabel";

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
  complement?: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
};

type OrderPayload = {
  id: string;
  status: string;
  customerId?: string | null;
  customerPhoneSnapshot?: string | null;
  orderType?: string | null;
  deliveryAddress?: string | null;
  paymentMethod?: string | null;
  items: Array<{
    quantity: number;
    price: number;
    product: { id: string; name: string; unit: string };
  }>;
};

export default function EditarPedidoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const id = params.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [orderType, setOrderType] = useState<string>(OrderType.PICKUP);
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PaymentMethod.PIX);
  const [status, setStatus] = useState<string>("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao carregar pedido");
      }

      const order = (await res.json()) as OrderPayload;
      setStatus(order.status);
      setCustomerId(order.customerId ?? "");
      setOrderType(order.orderType ?? OrderType.PICKUP);
      setDeliveryAddress(order.deliveryAddress ?? "");
      setPaymentMethod(order.paymentMethod ?? PaymentMethod.PIX);
      setCustomerPhone(formatPhoneDisplay(order.customerPhoneSnapshot ?? ""));
      setCart(
        order.items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          unit: item.product.unit,
          price: item.price,
          quantity: item.quantity,
        }))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao carregar pedido");
      router.push("/pedidos");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

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
    const res = await fetch("/api/products/categories", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCategories(parseCategoryOptions(data));
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
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    void fetchCategories();
    const onFocus = () => void fetchCategories();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchCategories]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const selectedCustomer = customers.find((c) => c.id === customerId);
    if (!selectedCustomer) return;

    if (!customerPhone) {
      setCustomerPhone(formatPhoneDisplay(selectedCustomer.phone));
    }
    const savedAddress = formatCustomerAddress(selectedCustomer.address, selectedCustomer.complement);
    if (orderType === OrderType.DELIVERY && !deliveryAddress && savedAddress) {
      setDeliveryAddress(savedAddress);
    }
  }, [customerId, customers, customerPhone, orderType, deliveryAddress]);

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
      const ia = categories.findIndex((category) => category.name === a);
      const ib = categories.findIndex((category) => category.name === b);
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
          c.productId === product.id ? { ...c, quantity: c.quantity + qty } : c
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
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, quantity } : c)));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const total = sumLineAmounts(cart);

  async function handleSave() {
    if (status === "CANCELED") {
      alert("Pedidos cancelados não podem ser editados");
      return;
    }
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

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
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
        throw new Error(err.error || "Erro ao salvar alterações");
      }

      alert("Pedido atualizado com sucesso");
      router.push("/pedidos");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar pedido");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando pedido...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Editar pedido</h1>
          <p className="text-muted-foreground">Atualize itens e dados do pedido #{id.slice(0, 8)}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pedidos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
            <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [&>*]:shrink-0">
              <Button
                size="sm"
                variant={selectedCategory ? "outline" : "default"}
                onClick={() => setSelectedCategory("")}
              >
                Todas
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.name}
                  size="sm"
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {categoryOptionLabel(category)}
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
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {groupedProducts.map(([category, items]) => (
                <div key={category} className="space-y-2">
                  {!selectedCategory && (
                    <h3 className="text-sm font-semibold text-muted-foreground pt-2">
                      {categoryOptionLabel(
                        categories.find((item) => item.name === category) ?? { name: category }
                      )}
                    </h3>
                  )}
                  {items.map((product) => (
                    <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)} / {product.unit} · Estoque:{" "}
                          {formatQuantity(product.stock, product.unit)} {product.unit}
                        </p>
                      </div>
                      <AddByQuantityButton
                        unit={product.unit}
                        onAdd={(quantity) => addToCart(product, quantity)}
                      />
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
            <CardTitle>Dados do pedido</CardTitle>
            <div className="flex sm:justify-end">
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
                  const savedAddress = formatCustomerAddress(saved.address, saved.complement);
                  if (savedAddress) setDeliveryAddress(savedAddress);
                }}
                trigger={<Button type="button" variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">Novo cliente</Button>}
              />
            </div>
            <CustomerLookup
              customers={customers}
              customerId={customerId}
              customerPhone={customerPhone}
              onSelect={(customer) => {
                setCustomerId(customer.id);
                setCustomerPhone(formatPhoneDisplay(customer.phone));
                const savedAddress = formatCustomerAddress(customer.address, customer.complement);
                if (savedAddress) setDeliveryAddress(savedAddress);
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
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <p className="break-words font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)} / {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CartQuantityInput
                      unit={item.unit}
                      quantity={item.quantity}
                      onChange={(quantity) => updateQuantity(item.productId, quantity)}
                    />
                    <span className="text-sm text-muted-foreground w-8">{item.unit}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="font-medium">{formatCurrency(lineAmount(item.quantity, item.price))}</p>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Carrinho vazio</p>
              )}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <Button className="w-full mt-4" onClick={handleSave} disabled={saving || cart.length === 0}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
