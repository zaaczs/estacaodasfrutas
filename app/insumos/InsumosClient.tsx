"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

type Expense = {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  date: string;
};

type InsumosClientProps = {
  initialExpenses: Expense[];
};

export function InsumosClient({ initialExpenses }: InsumosClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    category: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.description.trim() || !form.amount || !form.date) return;

    setSaving(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description.trim(),
          category: form.category.trim() || undefined,
          amount: Number(form.amount),
          date: form.date,
        }),
      });
      if (!response.ok) throw new Error("Falha ao salvar insumo");
      const created = (await response.json()) as Expense;
      setExpenses((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, description: "", category: "", amount: "" }));
    } catch (error) {
      console.error(error);
      alert("Não foi possível salvar o insumo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Deseja excluir este gasto?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao excluir insumo");
      setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    } catch (error) {
      console.error(error);
      alert("Não foi possível excluir o insumo.");
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insumos</h1>
          <p className="text-muted-foreground">Cadastre gastos variados do sistema</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-5">
            <Input
              placeholder="Descrição"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              required
              className="md:col-span-2"
            />
            <Input
              placeholder="Categoria (opcional)"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              required
            />
            <Input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              required
            />
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar gasto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de insumos</span>
            <span className="text-base font-semibold">{formatCurrency(total)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum gasto cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.category || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(expense.id)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
