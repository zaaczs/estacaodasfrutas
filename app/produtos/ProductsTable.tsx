"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  mergeCategoryNames,
  PRODUCT_CATEGORIES_UPDATED,
  publishProductCategories,
} from "./categorySync";
import type { Product } from "@prisma/client";

type Props = {
  products: Product[];
  categories: string[];
  activeCategory?: string;
};

export function ProductsTable({
  products: initialProducts,
  categories,
  activeCategory = "",
}: Props) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [transferIds, setTransferIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);
  const mobileSelectAllRef = useRef<HTMLInputElement>(null);
  const [categorySaveLoading, setCategorySaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickActionId, setQuickActionId] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
    setSelectedIds([]);
  }, [initialProducts]);

  useEffect(() => {
    setCategoryOptions(categories);
  }, [categories]);

  useEffect(() => {
    function onCategoriesUpdated(event: Event) {
      const names = (event as CustomEvent<string[]>).detail ?? [];
      setCategoryOptions((current) => mergeCategoryNames(current, names));
    }

    window.addEventListener(PRODUCT_CATEGORIES_UPDATED, onCategoriesUpdated);
    return () =>
      window.removeEventListener(PRODUCT_CATEGORIES_UPDATED, onCategoriesUpdated);
  }, []);

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        inactivated?: boolean;
        message?: string;
        product?: Product;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Erro ao excluir"
        );
      }
      if (data.inactivated && data.product) {
        handleProductSaved(data.product);
        if (data.message) alert(data.message);
      } else {
        setProducts((p) => p.filter((x) => x.id !== id));
      }
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

  const visibleIds = products.map((product) => product.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id));
  const transferProduct =
    transferIds.length === 1
      ? products.find((product) => product.id === transferIds[0]) ?? null
      : null;

  useEffect(() => {
    const indeterminate = someVisibleSelected && !allVisibleSelected;
    if (selectAllRef.current) selectAllRef.current.indeterminate = indeterminate;
    if (mobileSelectAllRef.current) mobileSelectAllRef.current.indeterminate = indeterminate;
  }, [someVisibleSelected, allVisibleSelected]);

  function toggleProductSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleVisibleSelection() {
    setSelectedIds(allVisibleSelected ? [] : visibleIds);
  }

  function openCategoryTransferDialog(product: Product) {
    setTransferIds([product.id]);
    setCategoryDraft(product.category);
  }

  function openBulkCategoryTransfer() {
    if (selectedIds.length === 0) return;
    setTransferIds(selectedIds);
    setCategoryDraft(activeCategory);
  }

  function closeCategoryTransfer() {
    setTransferIds([]);
    setCategorySaveLoading(false);
  }

  async function confirmCategoryTransfer() {
    if (transferIds.length === 0) return;
    const next = categoryDraft.trim();
    if (!next) return;
    if (transferIds.length === 1 && next === transferProduct?.category) {
      closeCategoryTransfer();
      return;
    }

    setCategorySaveLoading(true);
    if (transferIds.length === 1) setQuickActionId(transferIds[0]);
    try {
      const response = await fetch("/api/products/bulk-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: transferIds, category: next }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Falha ao mover produtos");
      }

      const movedIds = new Set(transferIds);
      publishProductCategories([next]);
      setCategoryOptions((current) => mergeCategoryNames(current, [next]));
      setSelectedIds((current) => current.filter((id) => !movedIds.has(id)));
      closeCategoryTransfer();

      if (activeCategory && activeCategory !== next) {
        setProducts((current) => current.filter((product) => !movedIds.has(product.id)));
      } else {
        setProducts((current) =>
          current.map((product) =>
            movedIds.has(product.id) ? { ...product, category: next } : product
          )
        );
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao trocar categoria");
    } finally {
      setCategorySaveLoading(false);
      setQuickActionId(null);
    }
  }

  return (
    <>
      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-col gap-3 rounded-lg border bg-muted/40 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            {selectedIds.length} produto(s) selecionado(s)
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="h-11 w-full sm:h-9 sm:w-auto" onClick={() => setSelectedIds([])}>
              Limpar
            </Button>
            <Button className="h-11 w-full sm:h-9 sm:w-auto" onClick={openBulkCategoryTransfer}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Mover para categoria
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3 xl:hidden">
        {products.length > 0 && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              ref={mobileSelectAllRef}
              type="checkbox"
              className="h-5 w-5"
              checked={allVisibleSelected}
              onChange={toggleVisibleSelection}
              aria-label="Selecionar todos os produtos desta página"
            />
            Selecionar todos desta página
          </label>
        )}
        {products.length === 0 ? (
          <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        ) : (
          products.map((product) => (
            <article
              key={product.id}
              className={`rounded-lg border p-3 ${selectedIds.includes(product.id) ? "bg-muted/40" : "bg-card"}`}
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0"
                  checked={selectedIds.includes(product.id)}
                  onChange={() => toggleProductSelection(product.id)}
                  aria-label={`Selecionar ${product.name}`}
                />
                <Link href={`/produtos/${product.id}`} className="shrink-0">
                  <img
                    src={getProductDisplayImageUrl(product.imageUrl, product.name, 64, 48)}
                    alt=""
                    className="h-14 w-14 rounded border bg-muted object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = buildProductPlaceholderDataUrl(
                        product.name,
                        64,
                        48
                      );
                    }}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/produtos/${product.id}`}
                    className="break-words font-medium text-primary hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span>{formatCurrency(product.price)} / {product.unit}</span>
                    <span className={product.stock <= product.minStock ? "font-medium text-amber-600" : ""}>
                      Estoque: {product.stock} {product.unit}
                    </span>
                    <Badge variant={product.active ? "success" : "secondary"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => openCategoryTransferDialog(product)}
                  title="Trocar categoria"
                  disabled={quickActionId === product.id}
                >
                  {quickActionId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-4 w-4" />
                  )}
                  <span className="ml-2">Categoria</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
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
                  <span className="ml-2">{product.active ? "Ocultar" : "Mostrar"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setEditProduct(product)}
                  aria-label="Editar produto"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 text-destructive hover:text-destructive"
                  onClick={() => setDeleteProduct(product)}
                  aria-label="Excluir produto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  aria-label="Selecionar todos os produtos desta página"
                />
              </TableHead>
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
              <TableRow
                key={product.id}
                className={selectedIds.includes(product.id) ? "bg-muted/40" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    aria-label={`Selecionar ${product.name}`}
                  />
                </TableCell>
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
                      onClick={() => openCategoryTransferDialog(product)}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteProduct(product)}
                      aria-label="Excluir produto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      <Dialog
        open={transferIds.length > 0}
        onOpenChange={(o) => {
          if (!o) closeCategoryTransfer();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ArrowLeftRight className="h-4 w-4" />
              </span>
              {transferIds.length > 1 ? "Mover produtos" : "Trocar categoria"}
            </DialogTitle>
            <DialogDescription className="text-left text-base leading-relaxed">
              {transferIds.length > 1 ? (
                <>
                  Os {transferIds.length} produtos selecionados vão para a categoria
                  escolhida. Você continua nesta lista.
                </>
              ) : (
                <>
                  Escolha um atalho abaixo ou digite o nome. O produto{" "}
                  <span className="font-medium text-foreground">
                    {transferProduct?.name}
                  </span>{" "}
                  está em{" "}
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-sm font-medium text-foreground">
                    {transferProduct?.category}
                  </span>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmCategoryTransfer();
            }}
          >
            {categoryOptions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Atalhos
                </span>
                <div className="max-h-28 overflow-y-auto rounded-md border bg-muted/30 p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {categoryOptions
                      .slice()
                      .sort((a, b) => a.localeCompare(b, "pt-BR"))
                      .map((c) => {
                        const isCurrent =
                          transferIds.length === 1 && c === transferProduct?.category;
                        const isSelected = c === categoryDraft.trim();
                        return (
                          <Button
                            key={c}
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className="h-8 text-xs font-normal"
                            disabled={isCurrent}
                            onClick={() => setCategoryDraft(c)}
                            title={isCurrent ? "Categoria atual" : `Usar ${c}`}
                          >
                            {c}
                            {isCurrent && (
                              <span className="ml-1 text-[10px] opacity-80">(atual)</span>
                            )}
                          </Button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="product-category-transfer">Nova categoria</Label>
              <Input
                id="product-category-transfer"
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                placeholder="Ex.: Frutas, Bebidas…"
                autoComplete="off"
                disabled={categorySaveLoading}
              />
              <p className="text-xs text-muted-foreground">
                Você pode selecionar um atalho acima ou digitar um nome que ainda não exista.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeCategoryTransfer}
                disabled={categorySaveLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  categorySaveLoading ||
                  !categoryDraft.trim() ||
                  (transferIds.length === 1 &&
                    categoryDraft.trim() === transferProduct?.category)
                }
              >
                {categorySaveLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir &quot;{deleteProduct?.name}&quot;? Esta ação não pode
            ser desfeita. Se o produto já tiver sido vendido, ele será inativado em vez de
            removido, para manter o histórico de pedidos.
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
