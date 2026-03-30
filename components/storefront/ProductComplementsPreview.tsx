"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  ProductComplementGroup,
  ProductComplementOption,
  parseProductComplements,
} from "@/lib/types/productComplements";

type Props = {
  complementsRaw: string | null | undefined;
  basePrice: number;
  unit: string;
};

export function ProductComplementsPreview({ complementsRaw, basePrice, unit }: Props) {
  const groups = useMemo(() => parseProductComplements(complementsRaw), [complementsRaw]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  if (!groups.length) return null;

  function toggle(group: ProductComplementGroup, option: ProductComplementOption) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(option.id);
      if (exists) {
        if (current.length <= group.minSelect) return prev;
        return { ...prev, [group.id]: current.filter((id) => id !== option.id) };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, option.id] };
    });
  }

  const requiredPending = groups.some((g) => (selections[g.id] ?? []).length < g.minSelect);

  const totalPrice = useMemo(() => {
    let total = basePrice;
    for (const g of groups) {
      const ids = selections[g.id] ?? [];
      for (const o of g.options) {
        if (ids.includes(o.id)) total += Number(o.priceDelta ?? 0);
      }
    }
    return total;
  }, [basePrice, groups, selections]);

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Complementos</h3>
      <p className="text-xs text-gray-500 mb-3">
        Selecione as opções para ver o valor final do produto.
      </p>

      <div className="space-y-3">
        {groups.map((g) => {
          const selectedIds = selections[g.id] ?? [];
          return (
            <div key={g.id} className="rounded-lg border bg-white p-3">
              <p className="text-sm font-medium text-gray-900">{g.name}</p>
              <p className="text-[11px] text-gray-500 mb-2">
                {g.minSelect > 0 ? "Obrigatório" : "Opcional"} · Escolha de {g.minSelect} até{" "}
                {g.maxSelect} opção(ões)
              </p>
              <div className="space-y-2">
                {g.options.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(o.id)}
                        onChange={() => toggle(g, o)}
                      />
                      <span className="text-sm">{o.name}</span>
                    </div>
                    {Number(o.priceDelta ?? 0) > 0 && (
                      <span className="text-xs text-[#2e7d32]">
                        + {formatCurrency(Number(o.priceDelta ?? 0))}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border bg-white p-3">
        <p className="text-xs text-gray-500">Preço final (com complementos)</p>
        <p className="text-lg font-semibold text-[#2e7d32]">
          {formatCurrency(totalPrice)}
          <span className="text-xs font-normal text-gray-500">/{unit}</span>
        </p>
        {requiredPending && (
          <p className="text-[11px] text-amber-700 mt-1">
            Ainda faltam complementos obrigatórios.
          </p>
        )}
      </div>
    </section>
  );
}
