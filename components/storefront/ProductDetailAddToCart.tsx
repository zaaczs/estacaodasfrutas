"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ProductComplementGroup,
  ProductComplementOption,
  parseProductComplements,
} from "@/lib/types/productComplements";
import { addItemToStorage } from "@/lib/cartStorage";

type Props = {
  productId: string;
  name: string;
  unit: string;
  basePrice: number;
  complementsRaw: string | null | undefined;
};

export function ProductDetailAddToCart({
  productId,
  name,
  unit,
  basePrice,
  complementsRaw,
}: Props) {
  const router = useRouter();
  const groups = useMemo(() => parseProductComplements(complementsRaw), [complementsRaw]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  function toggle(group: ProductComplementGroup, option: ProductComplementOption) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(option.id);
      if (exists) {
        return { ...prev, [group.id]: current.filter((id) => id !== option.id) };
      }
      const merged = [...current, option.id];
      const limited =
        merged.length > group.maxSelect
          ? merged.slice(merged.length - group.maxSelect)
          : merged;
      return { ...prev, [group.id]: limited };
    });
  }

  const hasPendingRequired = groups.some((g) => (selections[g.id] ?? []).length < g.minSelect);

  const { finalPrice, notes } = useMemo(() => {
    let total = basePrice;
    const labels: string[] = [];
    for (const g of groups) {
      const ids = selections[g.id] ?? [];
      if (!ids.length) continue;
      const opts = g.options.filter((o) => ids.includes(o.id));
      for (const o of opts) total += Number(o.priceDelta ?? 0);
      labels.push(`${g.name}: ${opts.map((o) => o.name).join(", ")}`);
    }
    return { finalPrice: total, notes: labels.join(" | ") };
  }, [basePrice, groups, selections]);

  function addToCart() {
    if (hasPendingRequired) {
      alert("Selecione os complementos obrigatórios.");
      return;
    }
    const key = `${productId}::${notes || "base"}::${finalPrice.toFixed(2)}`;
    addItemToStorage({
      key,
      productId,
      name,
      unit,
      price: finalPrice,
      quantity: 1,
      notes: notes || undefined,
    });
    router.push("/");
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Complementos</h3>
      <p className="text-xs text-gray-500 mb-3">
        Escolha os complementos e adicione ao carrinho.
      </p>

      {groups.length > 0 && (
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
      )}

      <div className="mt-4 rounded-lg border bg-white p-3">
        <p className="text-xs text-gray-500">Preço final</p>
        <p className="text-lg font-semibold text-[#2e7d32]">
          {formatCurrency(finalPrice)}
          <span className="text-xs font-normal text-gray-500">/{unit}</span>
        </p>
        {hasPendingRequired && (
          <p className="text-[11px] text-amber-700 mt-1">
            Ainda faltam complementos obrigatórios.
          </p>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          onClick={addToCart}
          disabled={hasPendingRequired}
          className="bg-[#2e7d32] hover:bg-[#1b5e20]"
        >
          Adicionar ao carrinho
        </Button>
      </div>
    </section>
  );
}
