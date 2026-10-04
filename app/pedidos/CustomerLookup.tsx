"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneDisplay, normalizePhoneDigits } from "@/lib/phone";
import { formatCustomerAddress } from "@/lib/customerAddress";

export type LookupCustomer = {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  complement?: string | null;
};

type CustomerLookupProps = {
  customers: LookupCustomer[];
  customerId: string;
  customerPhone: string;
  onSelect: (customer: LookupCustomer) => void;
  onPhoneChange: (phone: string) => void;
  onClearCustomer: () => void;
};

function matchesQuery(customer: LookupCustomer, query: string) {
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const digits = normalizePhoneDigits(query);
  const phoneDigits = normalizePhoneDigits(customer.phone);
  const nameMatches = term.length > 0 && customer.name.toLocaleLowerCase("pt-BR").includes(term);
  const phoneMatches = digits.length >= 3 && phoneDigits.includes(digits);
  return nameMatches || phoneMatches;
}

export function CustomerLookup({
  customers,
  customerId,
  customerPhone,
  onSelect,
  onPhoneChange,
  onClearCustomer,
}: CustomerLookupProps) {
  const selected = customers.find((customer) => customer.id === customerId) ?? null;
  const [nameQuery, setNameQuery] = useState("");
  const [activeField, setActiveField] = useState<"name" | "phone" | null>(null);

  useEffect(() => {
    if (selected) setNameQuery(selected.name);
  }, [selected]);

  const suggestions = useMemo(() => {
    const query = activeField === "phone" ? customerPhone : nameQuery;
    if (!activeField || query.trim().length < 2) return [];
    return customers.filter((customer) => matchesQuery(customer, query)).slice(0, 8);
  }, [activeField, customerPhone, customers, nameQuery]);

  function choose(customer: LookupCustomer) {
    setNameQuery(customer.name);
    setActiveField(null);
    onSelect(customer);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do cliente *</Label>
        <Input
          value={nameQuery}
          placeholder="Digite o nome do cliente"
          autoComplete="off"
          onFocus={() => setActiveField("name")}
          onBlur={() => setActiveField(null)}
          onChange={(event) => {
            const value = event.target.value;
            setNameQuery(value);
            setActiveField("name");
            if (selected && value.trim() !== selected.name) onClearCustomer();
            const exact = customers.filter(
              (customer) =>
                customer.name.toLocaleLowerCase("pt-BR") === value.trim().toLocaleLowerCase("pt-BR")
            );
            if (exact.length === 1) choose(exact[0]);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Telefone *</Label>
        <Input
          value={customerPhone}
          placeholder="(85) 99999-9999"
          inputMode="tel"
          autoComplete="off"
          onFocus={() => setActiveField("phone")}
          onBlur={() => setActiveField(null)}
          onChange={(event) => {
            const formatted = formatPhoneDisplay(event.target.value);
            onPhoneChange(formatted);
            setActiveField("phone");
            const digits = normalizePhoneDigits(formatted);
            const matches = customers.filter((customer) =>
              normalizePhoneDigits(customer.phone).includes(digits)
            );
            if (digits.length >= 10 && matches.length === 1) choose(matches[0]);
            else if (selected && !normalizePhoneDigits(selected.phone).includes(digits)) onClearCustomer();
          }}
        />
      </div>

      {activeField && suggestions.length > 0 && (
        <ul className="max-h-56 overflow-auto rounded-md border bg-white shadow-sm">
          {suggestions.map((customer) => {
            const address = formatCustomerAddress(customer.address, customer.complement);
            return (
            <li key={customer.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(customer)}
              >
                <span className="font-medium text-gray-900">{customer.name}</span>
                <span className="text-gray-500">
                  {formatPhoneDisplay(customer.phone)}
                  {address ? ` · ${address}` : ""}
                </span>
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {formatCustomerAddress(selected?.address, selected?.complement) && (
        <p className="text-sm text-gray-600">
          Endereço cadastrado:{" "}
          <span className="font-medium text-gray-900">
            {formatCustomerAddress(selected?.address, selected?.complement)}
          </span>
        </p>
      )}
    </div>
  );
}
