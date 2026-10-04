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
import type { Customer } from "@prisma/client";
import {
  formatPhoneDisplay,
  isValidPhoneDigits,
  normalizePhoneDigits,
} from "@/lib/phone";

type Props = {
  customer?: Customer | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (customer: Customer) => void;
  trigger?: React.ReactNode;
};

export function CustomerModal({
  customer,
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
  const [phone, setPhone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [complement, setComplement] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(formatPhoneDisplay(customer.phone));
      setCpfCnpj(customer.cpfCnpj ?? "");
      setAddress(customer.address ?? "");
      setComplement(customer.complement ?? "");
    } else {
      setName("");
      setPhone("");
      setCpfCnpj("");
      setAddress("");
      setComplement("");
    }
  }, [customer, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) {
      alert("Nome e telefone são obrigatórios");
      return;
    }
    if (!isValidPhoneDigits(phone)) {
      alert("Informe um telefone válido com DDD (10 ou 11 dígitos).");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name,
        phone: normalizePhoneDigits(phone),
        address: address.trim() || null,
        complement: complement.trim() || null,
        ...(customer ? { cpfCnpj: cpfCnpj.trim() || null } : {}),
      };
      const url = customer ? `/api/customers/${customer.id}` : "/api/customers";
      const method = customer ? "PATCH" : "POST";
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

  const isCreate = !customer;

  const content = (
    <>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Novo cliente" : "Editar cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
              inputMode="numeric"
              maxLength={15}
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          {!isCreate && (
            <div>
              <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
              <Input
                id="cpfCnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro"
            />
          </div>
          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              placeholder="Apartamento, bloco, casa, referência"
            />
          </div>
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
