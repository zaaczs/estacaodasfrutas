"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { ArrowLeftRight, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  buildProductPlaceholderDataUrl,
  getProductDisplayImageUrl,
} from "@/lib/productImage";
import { ProductModal } from "./ProductModal";
import type { Product } from "@prisma/client";

type Props = {
  products: Product[];
  categories: string[];
  canDelete: boolean;
};

export function ProductsTable({ products: initialProducts, categories, canDelete }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setProducts((p) => p.filter((x) => x.id !== id));
      setDeleteProduct(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  }

  function handleProductSaved(product: Product) {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = product;
        return next;
      }
      return [product, ...prev];
    });
    setEditProduct(null);
  }

  async function patchProduct(
    id: string,
    payload: Partial<Pick<Product, "active" | "category">>
  ): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Falha ao atualizar produto");
    }
    return (await res.json()) as Product;
  }

  async function handleToggleActive(product: Product) {
    setQuickActionId(product.id);
    try {
      const saved = await patchProduct(product.id, { active: !product.active });
      handleProductSaved(saved);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar status");
    } finally {
      setQuickActionId(null);
    }
  }

  async function handleQuickCategoryChange(product: Product) {
    const suggestions = categories.slice(0, 8).join(", ");
    const nextCategoryRaw = window.prompt(
      suggestions
        ? `Nova categoria para "${product.name}"\nSugestões: ${suggestions}`
        : `Nova categoria para "${product.name}"`,
      product.category
    );
    if (nextCategoryRaw == null) return;
    const nextCategory = nextCategoryRaw.trim();
    if (!nextCategory) {
      alert("Informe uma categoria válida.");
      return;
    }
    if (nextCategory === product.category) return;

    setQuickActionId(product.id);
    try {
      const saved = await patchProduct(product.id, { category: nextCategory });
      handleProductSaved(saved);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao trocar categoria");
    } finally {
      setQuickActionId(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="p-2">
                  <Link href={`/produtos/${product.id}`} className="block">
                    <img
                      src={getProductDisplayImageUrl(
                        product.imageUrl,
                        product.name,
                        64,
                        48
                      )}
                      alt=""
                      className="h-12 w-16 rounded object-cover border bg-muted"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          buildProductPlaceholderDataUrl(product.name, 64, 48);
                      }}
                    />
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/produtos/${product.id}`}
                    className="hover:underline text-primary"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell>{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <span
                    className={
                      product.stock <= product.minStock ? "text-amber-600 font-medium" : ""
                    }
                  >
                    {product.stock} {product.unit}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={product.active ? "success" : "secondary"}>
                    {product.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleQuickCategoryChange(product)}
                      title="Trocar categoria"
                      disabled={quickActionId === product.id}
                    >
                      {quickActionId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowLeftRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(product)}
                      title={product.active ? "Ocultar da loja" : "Mostrar na loja"}
                      disabled={quickActionId === product.id}
                    >
                      {quickActionId === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : product.active ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditProduct(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteProduct(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductModal
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        onSaved={handleProductSaved}
      />

      <Dialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir &quot;{deleteProduct?.name}&quot;? Esta ação não pode
            ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct && handleDelete(deleteProduct.id)}
              disabled={loading}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
