"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MovementType } from "@/lib/constants";
import type { Product } from "@prisma/client";
import type { StockMovement } from "@prisma/client";

type MovementWithProduct = StockMovement & { product: Product };

type Props = {
  products: Product[];
  movements: MovementWithProduct[];
  hasActiveFilters?: boolean;
};

export function StockTable({
  products,
  movements,
  hasActiveFilters = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<"ENTRY" | "SALE">("ENTRY");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  function openMovementForProduct(product: Product) {
    setSelectedProduct(product);
    setMovementType("ENTRY");
    setQuantity("");
    setOpen(true);
  }

  async function handleRegisterMovement(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProduct) return;

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Informe uma quantidade maior que zero.");
      return;
    }

    if (movementType === "SALE" && qty > selectedProduct.stock) {
      alert("A saída não pode ser maior que o estoque atual.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: movementType === "ENTRY" ? MovementType.ENTRY : MovementType.SALE,
          quantity: qty,
        }),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error || "Erro ao registrar movimentação.");
      }

      setOpen(false);
      setSelectedProduct(null);
      setQuantity("");
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao registrar movimentação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Produtos e estoque</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Clique em um produto (ou em Ajustar) para registrar entrada ou saída.
        </p>
        <div className="space-y-3 xl:hidden">
          {products.length === 0 ? (
            <div className="rounded-lg border px-4 py-10 text-center">
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? "Nenhum produto encontrado com os filtros atuais."
                  : "Nenhum produto cadastrado."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-3 h-11" asChild>
                  <Link href="/estoque">Limpar filtros</Link>
                </Button>
              )}
            </div>
          ) : (
            products.map((product) => (
              <article key={product.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <Badge
                    variant={product.stock <= product.minStock ? "warning" : "success"}
                    className="shrink-0"
                  >
                    {product.stock <= product.minStock ? "Baixo" : "OK"}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Estoque</dt>
                    <dd>
                      {product.stock} {product.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mínimo</dt>
                    <dd>
                      {product.minStock} {product.unit}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 w-full"
                  onClick={() => openMovementForProduct(product)}
                >
                  Ajustar
                </Button>
              </article>
            ))
          )}
        </div>
        <div className="hidden rounded-lg border xl:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <p className="text-muted-foreground">
                      {hasActiveFilters
                        ? "Nenhum produto encontrado com os filtros atuais."
                        : "Nenhum produto cadastrado."}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" className="mt-3" asChild>
                        <Link href="/estoque">Limpar filtros</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openMovementForProduct(product)}
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.minStock}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.stock <= product.minStock ? "warning" : "success"
                        }
                      >
                        {product.stock <= product.minStock ? "Baixo" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          openMovementForProduct(product);
                        }}
                      >
                        Ajustar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Últimas movimentações</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Clique em uma movimentação para ajustar o estoque daquele produto.
        </p>
        <div className="space-y-3 xl:hidden">
          {movements.length === 0 ? (
            <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            movements.map((m) => (
              <button
                key={m.id}
                type="button"
                className="flex w-full flex-col gap-1 rounded-lg border bg-card p-4 text-left"
                onClick={() => openMovementForProduct(m.product)}
              >
                <span className="break-words font-medium">{m.product.name}</span>
                <span className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      m.type === "ENTRY" ? "success" : m.type === "SALE" ? "secondary" : "outline"
                    }
                  >
                    {m.type === "ENTRY" ? "Entrada" : m.type === "SALE" ? "Saída" : "Ajuste"}
                  </Badge>
                  <span className="font-medium">
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="hidden rounded-lg border xl:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Quantidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openMovementForProduct(m.product)}
                  >
                    <TableCell>{formatDate(m.createdAt)}</TableCell>
                    <TableCell>{m.product.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.type === "ENTRY"
                            ? "success"
                            : m.type === "SALE"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {m.type === "ENTRY"
                          ? "Entrada"
                          : m.type === "SALE"
                            ? "Saída"
                            : "Ajuste"}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <form onSubmit={handleRegisterMovement} className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-muted-foreground">
                  Estoque atual: {selectedProduct.stock} {selectedProduct.unit}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={movementType === "ENTRY" ? "default" : "outline"}
                  onClick={() => setMovementType("ENTRY")}
                >
                  Entrada
                </Button>
                <Button
                  type="button"
                  variant={movementType === "SALE" ? "default" : "outline"}
                  onClick={() => setMovementType("SALE")}
                >
                  Saída
                </Button>
              </div>

              <div>
                <Label>
                  Quantidade para {movementType === "ENTRY" ? "entrada" : "saída"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={
                    movementType === "ENTRY" ? "Ex.: 10" : "Ex.: 3 (debita do estoque)"
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Salvar movimentação"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
