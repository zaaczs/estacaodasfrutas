"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@prisma/client";
import { ProductImageUploadField } from "@/components/products/ProductImageUploadField";
import { ProductComplementsEditor } from "@/components/products/ProductComplementsEditor";
import {
  ProductComplementGroup,
  parseProductComplements,
  stringifyProductComplements,
} from "@/lib/types/productComplements";
import { cn, formatCurrency } from "@/lib/utils";
import {
  PRODUCT_UNITS,
  calcProductProfit,
  normalizeProductUnit,
  type ProductUnit,
} from "@/lib/productUnit";

type Props = {
  product?: Product | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (product: Product) => void;
  trigger?: React.ReactNode;
};

export function ProductModal({
  product,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSaved,
  trigger,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOnOpenChange != null;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [complements, setComplements] = useState<ProductComplementGroup[]>([]);
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("un");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const pricing = useMemo(() => calcProductProfit(price, cost), [price, cost]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription((product as { description?: string }).description ?? "");
      setImageUrl(product.imageUrl ?? "");
      setComplements(parseProductComplements((product as Product & { complements?: string | null }).complements));
      setCategory(product.category);
      setUnit(normalizeProductUnit(product.unit));
      setPrice(String(product.price));
      setCost(String(product.cost));
      setStock(String(product.stock));
      setMinStock(String(product.minStock));
      setActive(product.active);
    } else {
      setName("");
      setDescription("");
      setImageUrl("");
      setComplements([]);
      setCategory("");
      setUnit("un");
      setPrice("");
      setCost("");
      setStock("");
      setMinStock("");
      setActive(true);
    }
  }, [product, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        complements: stringifyProductComplements(complements),
        category,
        unit,
        price: parseFloat(price) || 0,
        cost: parseFloat(cost) || 0,
        stock: parseFloat(stock) || 0,
        minStock: parseFloat(minStock) || 0,
        active,
      };

      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }

      const saved = await res.json();
      onSaved?.(saved);
      setOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const isCreate = !product;

  const content = (
    <>
      <DialogContent className="flex h-auto max-h-[min(90dvh,calc(100vh-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]">
        <div className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogHeader>
            <DialogTitle>{isCreate ? "Novo produto" : "Editar produto"}</DialogTitle>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Descrição (visível na loja)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Banana prata, madura e doce"
                  />
                </div>
                <ProductImageUploadField
                  imageUrl={imageUrl}
                  productName={name}
                  onChange={setImageUrl}
                />
                <ProductComplementsEditor groups={complements} onChange={setComplements} />
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Frutas"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Select
                    value={unit}
                    onValueChange={(value) => setUnit(value as ProductUnit)}
                  >
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_UNITS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="price">Preço de venda (R$ / {unit})</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Custo (R$ / {unit})</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2 rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm font-medium">Lucro por {unit}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        pricing.profit > 0 && "text-emerald-700",
                        pricing.profit < 0 && "text-red-600",
                        pricing.profit === 0 && "text-foreground"
                      )}
                    >
                      {formatCurrency(pricing.profit)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pricing.margin == null
                        ? "Margem: —"
                        : `Margem: ${pricing.margin.toLocaleString("pt-BR", {
                            maximumFractionDigits: 1,
                            minimumFractionDigits: 0,
                          })}%`}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Venda {formatCurrency(pricing.sale)} − Custo{" "}
                    {formatCurrency(pricing.purchase)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="stock">Estoque ({unit})</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="0.01"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minStock">Estoque mínimo ({unit})</Label>
                  <Input
                    id="minStock"
                    type="number"
                    step="0.01"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>
              </div>
              {!isCreate && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="active">Produto ativo</Label>
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t bg-background px-6 py-4">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : isCreate ? "Criar" : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {content}
    </Dialog>
  );
}
