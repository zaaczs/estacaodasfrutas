"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Pencil, Search, Trash2 } from "lucide-react";
import { CustomerModal } from "./CustomerModal";
import type { Customer } from "@prisma/client";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  emptyCustomerSearchFilters,
  filterCustomers,
  hasActiveCustomerFilters,
  type CustomerSearchFilters,
} from "@/lib/customerSearch";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers: initialCustomers }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [filters, setFilters] = useState<CustomerSearchFilters>(
    emptyCustomerSearchFilters
  );
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const filteredCustomers = useMemo(
    () => filterCustomers(customers, filters),
    [customers, filters]
  );
  const filtersActive = hasActiveCustomerFilters(filters);

  function updateFilter(field: keyof CustomerSearchFilters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function handleDelete(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setCustomers((c) => c.filter((x) => x.id !== id));
      setDeleteCustomer(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  }

  function handleCustomerSaved(customer: Customer) {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = customer;
        return next;
      }
      return [customer, ...prev];
    });
    setEditCustomer(null);
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] xl:items-end">
          <div>
            <Label htmlFor="customer-filter-name">Nome</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="customer-filter-name"
                value={filters.name}
                onChange={(event) => updateFilter("name", event.target.value)}
                placeholder="Pesquisar por nome"
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="customer-filter-phone">Telefone</Label>
            <Input
              id="customer-filter-phone"
              value={filters.phone}
              onChange={(event) => updateFilter("phone", event.target.value)}
              placeholder="DDD ou número"
              inputMode="tel"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="customer-filter-document">CPF/CNPJ</Label>
            <Input
              id="customer-filter-document"
              value={filters.document}
              onChange={(event) => updateFilter("document", event.target.value)}
              placeholder="Documento"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="customer-filter-address">Endereço</Label>
            <Input
              id="customer-filter-address"
              value={filters.address}
              onChange={(event) => updateFilter("address", event.target.value)}
              placeholder="Rua, bairro ou referência"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFilters(emptyCustomerSearchFilters)}
            disabled={!filtersActive}
          >
            Limpar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? `Mostrando ${filteredCustomers.length} de ${customers.length} cliente(s)`
            : `${customers.length} cliente(s)`}
        </p>
      </div>

      <div className="space-y-3 xl:hidden">
        {filteredCustomers.length === 0 ? (
          <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            {customers.length === 0
              ? "Nenhum cliente cadastrado."
              : "Nenhum cliente encontrado com esses filtros."}
          </p>
        ) : (
          filteredCustomers.map((customer) => (
            <article key={customer.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneDisplay(customer.phone)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setEditCustomer(customer)}
                    aria-label={`Editar ${customer.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCustomer(customer)}
                    aria-label={`Excluir ${customer.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">CPF/CNPJ</dt>
                  <dd className="break-words">{customer.cpfCnpj ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Endereço</dt>
                  <dd className="break-words">{customer.address ?? "-"}</dd>
                  {customer.complement ? (
                    <dd className="break-words text-muted-foreground">{customer.complement}</dd>
                  ) : null}
                </div>
              </dl>
            </article>
          ))
        )}
      </div>

      <div className="hidden rounded-lg border xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {customers.length === 0
                    ? "Nenhum cliente cadastrado."
                    : "Nenhum cliente encontrado com esses filtros."}
                </TableCell>
              </TableRow>
            ) : null}
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{formatPhoneDisplay(customer.phone)}</TableCell>
                <TableCell>{customer.cpfCnpj ?? "-"}</TableCell>
                <TableCell>
                  <span>{customer.address ?? "-"}</span>
                  {customer.complement ? (
                    <span className="block text-sm text-muted-foreground">
                      {customer.complement}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditCustomer(customer)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteCustomer(customer)}
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

      <CustomerModal
        customer={editCustomer}
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
        onSaved={handleCustomerSaved}
      />

      <Dialog open={!!deleteCustomer} onOpenChange={(o) => !o && setDeleteCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir &quot;{deleteCustomer?.name}&quot;?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteCustomer && handleDelete(deleteCustomer.id)}
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
