"use client";

import { useState } from "react";
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
};

export function StockTable({ products, movements }: Props) {
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
          Clique em um produto para ajustar entrada ou saída.
        </p>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Últimas movimentações</h2>
        <div className="rounded-lg border">
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
              {movements.map((m) => (
                <TableRow key={m.id}>
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
              ))}
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
