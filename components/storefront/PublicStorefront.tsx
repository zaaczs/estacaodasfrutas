"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/utils";
import {
  formatPhoneDisplay,
  isValidPhoneDigits,
  normalizePhoneDigits,
} from "@/lib/phone";
import { STORE_INFO } from "@/lib/constants/storeInfo";
import { StorePresentation } from "@/components/storefront/StorePresentation";
import { StoreLogo } from "@/components/storefront/StoreLogo";
import {
  buildProductPlaceholderDataUrl,
  getProductDisplayImageUrl,
} from "@/lib/productImage";
import {
  Home,
  ShoppingCart,
  User,
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  Search,
  ClipboardList,
} from "lucide-react";
import {
  ProductComplementGroup,
  ProductComplementOption,
  parseProductComplements,
} from "@/lib/types/productComplements";
import {
  clearCartStorage,
  loadCartFromStorage,
  saveCartToStorage,
} from "@/lib/cartStorage";

export type StorefrontProduct = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  complements?: string | null;
  category: string;
  unit: string;
  price: number;
  stock: number;
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  notes?: string;
};

type Props = {
  initialProducts: StorefrontProduct[];
};

type StorefrontCategoryMeta = {
  name: string;
  description: string | null;
};

const PAGE_SIZE = 120;
const GUARARAPES_NEIGHBORHOOD = "guararapes";

function mapToStorefront(raw: Record<string, unknown>): StorefrontProduct {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: (raw.description as string | null | undefined) ?? null,
    imageUrl: (raw.imageUrl as string | null | undefined) ?? null,
    complements: (raw.complements as string | null | undefined) ?? null,
    category: String(raw.category),
    unit: String(raw.unit),
    price: Number(raw.price),
    stock: Number(raw.stock),
  };
}

function groupProductsByCategory(
  items: StorefrontProduct[],
  categoryOrder: string[]
): [string, StorefrontProduct[]][] {
  const map = new Map<string, StorefrontProduct[]>();
  for (const p of items) {
    const c = p.category?.trim() || "Outros";
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(p);
  }
  const keys = Array.from(map.keys()).sort((a, b) => {
    const ia = categoryOrder.indexOf(a);
    const ib = categoryOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "pt-BR");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return keys.map((k) => [k, map.get(k)!]);
}

function ProductCard({
  product,
  onAdd,
  searchTerm,
}: {
  product: StorefrontProduct;
  onAdd: (p: StorefrontProduct) => void;
  searchTerm?: string;
}) {
  const normalizedSearch = (searchTerm ?? "").trim().toLocaleLowerCase("pt-BR");
  const nameMatches =
    normalizedSearch.length > 0 &&
    product.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  const categoryMatches =
    normalizedSearch.length > 0 &&
    product.category.toLocaleLowerCase("pt-BR").includes(normalizedSearch);
  const hasComplements = parseProductComplements(product.complements).length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
      <Link href={`/produto/${product.id}`} className="block">
        <div className="aspect-[4/3] relative bg-gray-100 shrink-0">
          <img
            src={getProductDisplayImageUrl(product.imageUrl, product.name)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = buildProductPlaceholderDataUrl(
                product.name,
                400,
                300
              );
            }}
          />
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/produto/${product.id}`} className="hover:underline underline-offset-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        )}
        {normalizedSearch.length > 0 && (
          <p className="text-[11px] text-gray-500 mt-1">
            Relacionado por:{" "}
            <span className="font-medium text-gray-700">
              {nameMatches && categoryMatches
                ? "nome e categoria"
                : nameMatches
                  ? "nome"
                  : categoryMatches
                    ? "categoria"
                    : "outro critério"}
            </span>
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 gap-2">
          <span className="font-bold text-[#2e7d32] text-sm">
            {formatCurrency(product.price)}
            <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
          </span>
          <Button
            type="button"
            size="sm"
            className="rounded-full h-8 w-8 p-0 shrink-0 bg-[#2e7d32] hover:bg-[#1b5e20]"
            onClick={() => onAdd(product)}
            disabled={product.stock <= 0}
            title={product.stock <= 0 ? "Sem estoque" : hasComplements ? "Configurar" : "Adicionar"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {hasComplements && (
          <p className="text-[10px] text-gray-500 mt-1">Possui complementos</p>
        )}
        <Link
          href={`/produto/${product.id}`}
          className="mt-2 text-[11px] font-medium text-[#2e7d32] hover:underline"
        >
          Ver descrição e detalhes
        </Link>
        {product.stock <= 0 && (
          <p className="text-[10px] text-amber-700 mt-1">Sem estoque no momento</p>
        )}
      </div>
    </div>
  );
}

export function PublicStorefront({ initialProducts }: Props) {
  const { data: session } = useSession();
  const isCustomerSession = session?.user?.role === "CUSTOMER";
  const initialRef = useRef(initialProducts);
  initialRef.current = initialProducts;

  const [products, setProducts] = useState<StorefrontProduct[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<StorefrontCategoryMeta[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchQuery = searchText.trim();
  const isSearching = searchQuery.length > 0;
  const isDebouncing = isSearching && searchQuery !== debouncedSearch;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState("");
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [configProduct, setConfigProduct] = useState<StorefrontProduct | null>(null);
  const [configSelections, setConfigSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const stored = loadCartFromStorage();
    if (stored.length > 0) {
      setCart(stored);
    }
  }, []);

  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

  const visibleCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    const set = new Set<string>();
    for (const p of initialRef.current) {
      if (p.category?.trim()) set.add(p.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [categories]);

  const groupedSections = useMemo(() => {
    if (isSearching) return [];
    if (!products.length) return [];
    if (selectedCategory) {
      return [[selectedCategory, products] as [string, StorefrontProduct[]]];
    }
    return groupProductsByCategory(products, visibleCategories);
  }, [isSearching, selectedCategory, products, visibleCategories]);

  const categoryDescriptionByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of categoryMeta) {
      if (item.description?.trim()) {
        map.set(item.name, item.description.trim());
      }
    }
    return map;
  }, [categoryMeta]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    fetch("/api/product-categories/public")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setCategoryMeta([]);
          setCategories([]);
          return;
        }
        const mapped = data
          .map((item) => {
            const raw = item as Record<string, unknown>;
            const name = String(raw.name ?? "").trim();
            if (!name) return null;
            return {
              name,
              description:
                typeof raw.description === "string" ? raw.description : null,
            } as StorefrontCategoryMeta;
          })
          .filter((x): x is StorefrontCategoryMeta => x != null);
        setCategoryMeta(mapped);
        setCategories(mapped.map((x) => x.name));
      })
      .catch(() => {
        setCategoryMeta([]);
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      setListLoading(true);
      try {
        const p = new URLSearchParams({
          activeOnly: "true",
          limit: String(PAGE_SIZE),
          skip: "0",
        });
        if (debouncedSearch) {
          p.set("search", debouncedSearch);
        } else if (selectedCategory) {
          p.set("search", selectedCategory);
        }
        const r = await fetch(`/api/products?${p}`, { signal: ac.signal });
        if (!r.ok) throw new Error("produtos");
        const data = (await r.json()) as Record<string, unknown>[];
        const mapped = data.map(mapToStorefront);
        setProducts(mapped);
        setHasMore(mapped.length >= PAGE_SIZE);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setProducts(initialRef.current);
          setHasMore(false);
        }
      } finally {
        setListLoading(false);
      }
    }
    load();
    return () => ac.abort();
  }, [selectedCategory, debouncedSearch]);

  async function loadMoreProducts() {
    if (loadingMore || listLoading || !hasMore) return;
    setLoadingMore(true);
    try {
      const p = new URLSearchParams({
        activeOnly: "true",
        limit: String(PAGE_SIZE),
        skip: String(products.length),
      });
      if (debouncedSearch) {
        p.set("search", debouncedSearch);
      } else if (selectedCategory) {
        p.set("search", selectedCategory);
      }
      const r = await fetch(`/api/products?${p}`);
      if (!r.ok) throw new Error("produtos");
      const data = (await r.json()) as Record<string, unknown>[];
      const mapped = data.map(mapToStorefront);
      setProducts((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const next = mapped.filter((x) => !ids.has(x.id));
        return [...prev, ...next];
      });
      setHasMore(mapped.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  const addToCart = (
    product: StorefrontProduct,
    qty: number = 1,
    finalUnitPrice = product.price,
    notes = ""
  ) => {
    if (qty <= 0) return;
    const key = `${product.id}::${notes || "base"}::${finalUnitPrice.toFixed(2)}`;
    setCart((prev) => {
      const exist = prev.find((c) => c.key === key);
      if (exist) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          unit: product.unit,
          price: finalUnitPrice,
          quantity: qty,
          notes: notes || undefined,
        },
      ];
    });
  };

  function openAddProduct(product: StorefrontProduct) {
    const groups = parseProductComplements(product.complements);
    if (groups.length === 0) {
      addToCart(product);
      return;
    }
    setConfigProduct(product);
    setConfigSelections({});
  }

  function toggleComplement(group: ProductComplementGroup, option: ProductComplementOption) {
    setConfigSelections((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(option.id);
      if (exists) {
        return { ...prev, [group.id]: current.filter((id) => id !== option.id) };
      }
      const merged = [...current, option.id];
      const limited =
        merged.length > group.maxSelect
          ? merged.slice(merged.length - group.maxSelect)
          : merged;
      return { ...prev, [group.id]: limited };
    });
  }

  function canConfirmComplements(product: StorefrontProduct | null): boolean {
    if (!product) return false;
    const groups = parseProductComplements(product.complements);
    return groups.every((g) => {
      const picked = (configSelections[g.id] ?? []).length;
      return picked >= g.minSelect && picked <= g.maxSelect;
    });
  }

  function confirmAddWithComplements() {
    if (!configProduct) return;
    const groups = parseProductComplements(configProduct.complements);
    if (!canConfirmComplements(configProduct)) {
      alert("Selecione as opções obrigatórias dos complementos.");
      return;
    }
    let finalPrice = configProduct.price;
    const labels: string[] = [];

    for (const g of groups) {
      const selectedIds = configSelections[g.id] ?? [];
      if (!selectedIds.length) continue;
      const selectedOptions = g.options.filter((o) => selectedIds.includes(o.id));
      for (const o of selectedOptions) {
        finalPrice += Number(o.priceDelta ?? 0);
      }
      labels.push(`${g.name}: ${selectedOptions.map((o) => o.name).join(", ")}`);
    }

    const notes = labels.join(" | ");
    addToCart(configProduct, 1, finalPrice, notes);
    setConfigProduct(null);
    setConfigSelections({});
  }

  const updateQuantity = (itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.key !== itemKey));
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.key === itemKey ? { ...c, quantity } : c))
    );
  };

  const removeFromCart = (itemKey: string) => {
    setCart((prev) => prev.filter((c) => c.key !== itemKey));
  };

  const total = cart.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || !name.trim() || !phone.trim() || !deliveryType) return;
    if (!isValidPhoneDigits(phone)) {
      alert("Informe um telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }
    if (
      deliveryType === "DELIVERY" &&
      (deliveryNeighborhood !== GUARARAPES_NEIGHBORHOOD || !deliveryStreet.trim())
    ) {
      alert("Para entrega, selecione Guararapes e informe a rua.");
      return;
    }

    const fullDeliveryAddress =
      deliveryType === "DELIVERY"
        ? `${deliveryStreet.trim()}${deliveryReference.trim() ? `, ${deliveryReference.trim()}` : ""} - Guararapes`
        : undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/orders/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            price: c.price,
            notes: c.notes,
          })),
          customer: {
            name: name.trim(),
            phone: normalizePhoneDigits(phone),
            address: fullDeliveryAddress,
          },
          paymentMethod: paymentMethod || undefined,
          orderType: deliveryType,
          deliveryAddress: fullDeliveryAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao enviar pedido");
      }

      const order = await res.json();
      setOrderId(order.id);
      setCart([]);
      clearCartStorage();
      if (typeof window !== "undefined") {
        window.localStorage.setItem("public_orders_phone", normalizePhoneDigits(phone));
      }
      setCheckoutOpen(false);
      setCartOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  }

  if (orderId) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido enviado!</h1>
          <p className="text-gray-600 mb-8">
            Seu pedido foi recebido. Em breve entraremos em contato.
          </p>
          <Button
            onClick={() => {
              setOrderId(null);
            }}
            className="bg-[#2e7d32] hover:bg-[#1b5e20]"
          >
            Fazer novo pedido
          </Button>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/meus-pedidos">Ver meus pedidos</Link>
          </Button>
          {!isCustomerSession && (
            <Button asChild variant="ghost" className="mt-2">
              <Link href="/login?customer=1&callbackUrl=/perfil">
                Entrar/Cadastrar para ver histórico antigo
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const configGroups = parseProductComplements(configProduct?.complements);

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#faf9f7] pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 w-full min-w-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <StoreLogo
                alt=""
                width={48}
                height={52}
                className="shrink-0 h-12 w-auto object-contain"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-[#2e7d32] tracking-tight leading-tight">
                  {STORE_INFO.shortName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Mercadinho · Frescor e qualidade
                </p>
              </div>
            </div>
            <Link
              href="/meus-pedidos"
              className="text-xs font-medium text-[#2e7d32] hover:underline shrink-0"
            >
              Pedidos
            </Link>
          </div>

          <div className="relative mt-3 w-full min-w-0 max-w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none z-10" aria-hidden />
            <Input
              type="search"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                if (e.target.value.trim()) setSelectedCategory("");
              }}
              placeholder="Buscar produto (nome ou categoria)…"
              className="w-full min-w-0 pl-9 bg-gray-50 border-gray-200"
              aria-label="Buscar produtos"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            Catálogo grande: mostramos até 400 itens por filtro. Use a busca ou escolha uma categoria.
          </p>

          {visibleCategories.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setSelectedCategory("");
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                    !selectedCategory && !isSearching
                      ? "bg-[#2e7d32] text-white border-[#2e7d32]"
                      : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"
                  }`}
                >
                  Todos
                </button>
                {visibleCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setSelectedCategory(cat);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                      selectedCategory === cat && !isSearching
                        ? "bg-[#2e7d32] text-white border-[#2e7d32]"
                        : "bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("")}
                  className="text-xs font-medium text-[#2e7d32] hover:underline"
                >
                  Ver todas as categorias
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6">
        {isSearching && (
          <section className="mb-8" aria-labelledby="search-results-heading">
            <h2
              id="search-results-heading"
              className="text-base font-semibold text-gray-900 mb-1"
            >
              Resultados para &ldquo;{searchQuery}&rdquo;
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {isDebouncing || listLoading
                ? "Buscando…"
                : `${products.length} produto(s) encontrado(s).`}
            </p>
            {!isDebouncing && !listLoading && products.length === 0 && (
              <p className="text-center text-gray-500 py-8 rounded-xl border border-dashed border-gray-200 bg-white/80">
                Nenhum produto encontrado para essa busca.
              </p>
            )}
            {(isDebouncing || listLoading || products.length > 0) && (
              <div
                className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
                  isDebouncing || listLoading ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={openAddProduct}
                    searchTerm={searchQuery}
                  />
                ))}
              </div>
            )}
            {!isDebouncing && !listLoading && hasMore && (
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadMoreProducts}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Carregando..." : "Carregar mais resultados"}
                </Button>
              </div>
            )}
          </section>
        )}

        {isSearching && (
          <div className="mb-8">
            <StorePresentation />
          </div>
        )}

        {!isSearching && !listLoading && products.length === 0 && visibleCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-8 text-center max-w-lg mx-auto">
            <p className="text-gray-700 font-medium mb-2">Nenhum produto cadastrado</p>
            <p className="text-sm text-gray-500 mb-6">
              Importe a planilha ou cadastre itens na área administrativa. O catálogo da loja só
              exibe produtos ativos.
            </p>
            <Button asChild className="bg-[#2e7d32] hover:bg-[#1b5e20]">
              <Link href="/login">Entrar na área admin</Link>
            </Button>
          </div>
        ) : (
          !isSearching && (
            <>
              <StorePresentation />
              {listLoading && (
                <p className="text-sm text-gray-500 mb-3" role="status">
                  Carregando produtos…
                </p>
              )}
              {!listLoading &&
                products.length === 0 &&
                selectedCategory &&
                visibleCategories.length > 0 && (
                  <p className="text-center text-gray-500 py-12">
                    Nenhum produto nesta categoria.
                  </p>
                )}
              {!listLoading &&
                products.length === 0 &&
                !selectedCategory &&
                visibleCategories.length > 0 && (
                  <p className="text-center text-gray-500 py-12">
                    Nenhum produto para exibir no momento.
                  </p>
                )}
              {groupedSections.map(([cat, list]) => (
                <section
                  key={cat}
                  id={`categoria-${cat.replace(/\s+/g, "-").toLowerCase()}`}
                  className="mb-10 scroll-mt-28"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-[#2e7d32]/20">
                    {cat}
                  </h2>
                  {categoryDescriptionByName.get(cat) && (
                    <p className="mb-4 text-sm text-gray-500">
                      {categoryDescriptionByName.get(cat)}
                    </p>
                  )}
                  <div
                    className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
                      listLoading ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {list.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={openAddProduct} />
                    ))}
                  </div>
                </section>
              ))}
              {!listLoading && hasMore && (
                <div className="mt-2 mb-10 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadMoreProducts}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Carregando..." : "Carregar mais produtos"}
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-6xl mx-auto flex h-16 w-full items-stretch">
          <Link
            href="/"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[#2e7d32] min-w-0 py-2"
          >
            <Home className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Início</span>
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <span className="relative inline-flex shrink-0">
              <ShoppingCart className="h-6 w-6" aria-hidden />
              {cartCount > 0 && (
                <span className="absolute -right-2.5 -top-2 min-h-[1.125rem] min-w-[1.125rem] px-1 flex items-center justify-center bg-[#2e7d32] text-white text-[10px] font-bold rounded-full border-2 border-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-medium leading-none">Carrinho</span>
          </button>

          <Link
            href="/meus-pedidos"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <ClipboardList className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Pedidos</span>
          </Link>

          <Link
            href={isCustomerSession ? "/perfil" : "/login?customer=1&callbackUrl=/perfil"}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-[#2e7d32] min-w-0 py-2 transition-colors"
          >
            <User className="h-6 w-6 shrink-0" aria-hidden />
            <span className="text-[11px] font-medium leading-none">Perfil</span>
          </Link>
        </div>
      </nav>

      {configProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setConfigProduct(null)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-bold">{configProduct.name}</h3>
                <p className="text-sm text-gray-500">
                  Selecione os complementos antes de adicionar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigProduct(null)}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {configGroups.map((g) => {
                const selectedIds = configSelections[g.id] ?? [];
                return (
                  <div key={g.id} className="rounded-lg border p-3">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Escolha de {g.minSelect} até {g.maxSelect} opção(ões)
                    </p>
                    <div className="space-y-2">
                      {g.options.map((o) => {
                        const checked = selectedIds.includes(o.id);
                        return (
                          <label
                            key={o.id}
                            className="flex items-center justify-between gap-2 rounded border p-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleComplement(g, o)}
                              />
                              <span className="text-sm">{o.name}</span>
                            </div>
                            {(o.priceDelta ?? 0) > 0 && (
                              <span className="text-xs text-[#2e7d32]">
                                + {formatCurrency(Number(o.priceDelta ?? 0))}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setConfigProduct(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmAddWithComplements}
                disabled={!canConfirmComplements(configProduct)}
                className="bg-[#2e7d32] hover:bg-[#1b5e20]"
              >
                Adicionar ao carrinho
              </Button>
            </div>
          </div>
        </div>
      )}

      {(cartOpen || checkoutOpen) && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => !checkoutOpen && setCartOpen(false)}
          role="presentation"
        >
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">
                {checkoutOpen ? "Finalizar pedido" : "Carrinho"}
              </h2>
              <button
                type="button"
                onClick={() => (checkoutOpen ? setCheckoutOpen(false) : setCartOpen(false))}
                className="p-2 hover:bg-gray-100 rounded-full"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {checkoutOpen ? (
                <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                      placeholder="(00) 00000-0000"
                      inputMode="numeric"
                      maxLength={15}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Tipo de atendimento *</Label>
                    <Select value={deliveryType} onValueChange={setDeliveryType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione retirada ou entrega" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PICKUP">Retirada no local</SelectItem>
                        <SelectItem value="DELIVERY">Entrega</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {deliveryType === "DELIVERY" && (
                    <>
                      <div>
                        <Label>Bairro de entrega *</Label>
                        <Select
                          value={deliveryNeighborhood || "__none__"}
                          onValueChange={(value) =>
                            setDeliveryNeighborhood(value === "__none__" ? "" : value)
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione o bairro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione</SelectItem>
                            <SelectItem value={GUARARAPES_NEIGHBORHOOD}>
                              Guararapes
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-amber-700 mt-1">
                          No momento entregamos somente no bairro Guararapes.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="deliveryStreet">Rua *</Label>
                        <Input
                          id="deliveryStreet"
                          value={deliveryStreet}
                          onChange={(e) => setDeliveryStreet(e.target.value)}
                          placeholder="Ex.: Rua Francisco Xerez, 593"
                          required={deliveryType === "DELIVERY"}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveryReference">Complemento / referência</Label>
                        <Input
                          id="deliveryReference"
                          value={deliveryReference}
                          onChange={(e) => setDeliveryReference(e.target.value)}
                          placeholder="Apartamento, bloco, ponto de referência..."
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}

                  {deliveryType === "PICKUP" && (
                    <p className="text-xs text-gray-500">
                      Você escolheu retirada no local. Não é necessário informar endereço.
                    </p>
                  )}
                  <div>
                    <Label>Forma de pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                        <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.notes && (
                          <p className="text-[11px] text-gray-500">{item.notes}</p>
                        )}
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.price)} / {item.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => removeFromCart(item.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="font-semibold w-20 text-right">
                        {formatCurrency(item.quantity * item.price)}
                      </p>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Carrinho vazio</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total</span>
                <span className="text-[#2e7d32]">{formatCurrency(total)}</span>
              </div>
              {checkoutOpen ? (
                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] h-12"
                  disabled={loading || cart.length === 0}
                >
                  {loading ? "Enviando..." : "Enviar pedido"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] h-12"
                  onClick={() => cart.length > 0 && setCheckoutOpen(true)}
                  disabled={cart.length === 0}
                >
                  Finalizar pedido
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
