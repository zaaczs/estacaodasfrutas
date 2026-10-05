"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneDisplay, normalizePhoneDigits } from "@/lib/phone";
import { formatCustomerAddress, formatCustomerSearchResult } from "@/lib/customerAddress";
import { customerMatchesFreeText } from "@/lib/customerSearch";
import { normalizeSearchText } from "@/lib/searchText";

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

function matchesQuery(customer: LookupCustomer, query: string, field: "name" | "phone") {
  if (field === "phone") {
    const digits = normalizePhoneDigits(query);
    return digits.length >= 3 && normalizePhoneDigits(customer.phone).includes(digits);
  }
  return customerMatchesFreeText(customer, query);
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
    return customers
      .filter((customer) => matchesQuery(customer, query, activeField))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 25);
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
          placeholder="Nome, telefone ou endereço"
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
                normalizeSearchText(customer.name) === normalizeSearchText(value) &&
                normalizeSearchText(value).length > 0
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
          {suggestions.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="flex min-h-11 w-full flex-col items-start break-words px-3 py-2 text-left text-sm hover:bg-gray-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(customer)}
              >
                <span className="font-medium text-gray-900">
                  {formatCustomerSearchResult(customer.name, customer.address, customer.complement)}
                </span>
                <span className="text-gray-500">{formatPhoneDisplay(customer.phone)}</span>
              </button>
            </li>
          ))}
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
