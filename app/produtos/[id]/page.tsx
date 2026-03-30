"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { getProductDisplayImageUrl } from "@/lib/productImage";
import { ProductImageUploadField } from "@/components/products/ProductImageUploadField";
import { ProductComplementsEditor } from "@/components/products/ProductComplementsEditor";
import {
  ProductComplementGroup,
  parseProductComplements,
  stringifyProductComplements,
} from "@/lib/types/productComplements";

export default function EditarProdutoPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          router.push("/produtos");
          return;
        }
        const p = (await res.json()) as Product;
        if (cancel) return;
        setName(p.name);
        setDescription(p.description ?? "");
        setImageUrl(p.imageUrl ?? "");
        setComplements(
          parseProductComplements((p as Product & { complements?: string | null }).complements)
        );
        setCategory(p.category);
        setUnit(p.unit);
        setPrice(String(p.price));
        setCost(String(p.cost));
        setStock(String(p.stock));
        setMinStock(String(p.minStock));
        setActive(p.active);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
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

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao salvar");
      }

      router.push("/produtos");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/produtos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos produtos
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar produto</h1>
        <p className="text-muted-foreground text-sm">ID: {id}</p>
      </div>

      <div className="mb-6 rounded-lg border overflow-hidden bg-muted/30 max-w-xs aspect-square">
        <img
          src={getProductDisplayImageUrl(imageUrl, name)}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              required
            />
          </div>
          <div>
            <Label htmlFor="unit">Unidade</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
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
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/produtos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
