"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@prisma/client";
import { searchTextIncludes } from "@/lib/searchText";

type Props = {
  products: Product[];
};

export function StockMovementModal({ products }: Props) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"ENTRY" | "SALE">("ENTRY");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAllProducts(products);
  }, [products]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const res = await fetch("/api/products?activeOnly=false&limit=5000");
        if (!res.ok) throw new Error("Falha ao carregar produtos");
        const data = (await res.json()) as Product[];
        if (!cancelled) setAllProducts(data);
      } catch {
        if (!cancelled) setAllProducts(products);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [open, products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) => searchTextIncludes(p.name, q) || searchTextIncludes(p.category, q)
    );
  }, [allProducts, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!productId || !quantity || isNaN(qty) || qty === 0) {
      alert("Preencha todos os campos corretamente");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type,
          quantity: Math.abs(qty),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao registrar");
      }
      setOpen(false);
      setProductId("");
      setType("ENTRY");
      setQuantity("");
      setSearch("");
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearch("");
          setProductId("");
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>Nova movimentação</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product-search">Buscar produto</Label>
            <Input
              id="product-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome ou categoria"
              className="mb-2"
            />
            <Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingProducts ? "Carregando produtos..." : "Selecione o produto"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredProducts.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    Nenhum produto encontrado.
                  </div>
                ) : (
                  filteredProducts.slice(0, 200).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stock} {p.unit})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {filteredProducts.length > 200 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Mostrando 200 de {filteredProducts.length}. Refine a busca.
              </p>
            )}
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "ENTRY" | "SALE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRY">Entrada</SelectItem>
                <SelectItem value="SALE">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === "ENTRY" ? "Ex: 10" : "Ex: 5"}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !productId}>
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
