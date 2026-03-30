"use client";

import { useState, useEffect } from "react";
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
import type { Product } from "@prisma/client";
import { ProductImageUploadField } from "@/components/products/ProductImageUploadField";
import { ProductComplementsEditor } from "@/components/products/ProductComplementsEditor";
import {
  ProductComplementGroup,
  parseProductComplements,
  stringifyProductComplements,
} from "@/lib/types/productComplements";

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
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription((product as { description?: string }).description ?? "");
      setImageUrl(product.imageUrl ?? "");
      setComplements(parseProductComplements((product as Product & { complements?: string | null }).complements));
      setCategory(product.category);
      setUnit(product.unit);
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
      setUnit("");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Novo produto" : "Editar produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex: kg, un, cx"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="stock">Estoque</Label>
              <Input
                id="stock"
                type="number"
                step="0.01"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="minStock">Estoque mínimo</Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isCreate ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
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
