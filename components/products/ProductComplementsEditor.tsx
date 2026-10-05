"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ProductComplementGroup } from "@/lib/types/productComplements";

type Props = {
  groups: ProductComplementGroup[];
  onChange: (groups: ProductComplementGroup[]) => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProductComplementsEditor({ groups, onChange }: Props) {
  function updateGroup(idx: number, patch: Partial<ProductComplementGroup>) {
    const next = [...groups];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  }

  function removeGroup(idx: number) {
    const next = [...groups];
    next.splice(idx, 1);
    onChange(next);
  }

  function addGroup() {
    onChange([
      ...groups,
      {
        id: uid(),
        name: "",
        minSelect: 0,
        maxSelect: 1,
        options: [{ id: uid(), name: "", priceDelta: 0 }],
      },
    ]);
  }

  function addOption(groupIdx: number) {
    const g = groups[groupIdx];
    updateGroup(groupIdx, {
      options: [...g.options, { id: uid(), name: "", priceDelta: 0 }],
    });
  }

  function updateOption(
    groupIdx: number,
    optIdx: number,
    patch: Partial<{ name: string; priceDelta: number }>
  ) {
    const g = groups[groupIdx];
    const opts = [...g.options];
    opts[optIdx] = { ...opts[optIdx], ...patch };
    updateGroup(groupIdx, { options: opts });
  }

  function removeOption(groupIdx: number, optIdx: number) {
    const g = groups[groupIdx];
    const opts = [...g.options];
    opts.splice(optIdx, 1);
    updateGroup(groupIdx, { options: opts });
  }

  return (
    <div className="col-span-full space-y-3">
      <div className="flex items-center justify-between">
        <Label>Complementos (estilo iFood)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4 mr-1" />
          Novo complemento
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sem complementos. Ex.: "Escolha o peso" (1kg, 2kg, 3kg...).
        </p>
      )}

      <div className="space-y-3">
        {groups.map((g, gi) => (
          <div key={g.id} className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_100px_100px_auto] items-end">
              <div>
                <Label>Nome do complemento</Label>
                <Input
                  value={g.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                  placeholder="Ex.: Escolha o peso"
                />
              </div>
              <div>
                <Label>Mín.</Label>
                <Input
                  type="number"
                  min="0"
                  value={g.minSelect}
                  onChange={(e) =>
                    updateGroup(gi, {
                      minSelect: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
              <div>
                <Label>Máx.</Label>
                <Input
                  type="number"
                  min="1"
                  value={g.maxSelect}
                  onChange={(e) =>
                    updateGroup(gi, {
                      maxSelect: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-3">
                <input
                  id={`required-${g.id}`}
                  type="checkbox"
                  checked={g.minSelect > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateGroup(gi, { minSelect: Math.max(1, g.minSelect), maxSelect: Math.max(1, g.maxSelect) });
                    } else {
                      updateGroup(gi, { minSelect: 0 });
                    }
                  }}
                  className="rounded"
                />
                <Label htmlFor={`required-${g.id}`}>Complemento obrigatório</Label>
              </div>
              <p className="text-[11px] text-muted-foreground md:col-span-3">
                Dica: se marcar como obrigatório, o cliente precisa escolher ao menos 1 opção.
              </p>
              <Button type="button" variant="ghost" onClick={() => removeGroup(gi)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>

            <div className="space-y-2">
              {g.options.map((o, oi) => (
                <div key={o.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_auto] items-end">
                  <div>
                    <Label>Opção</Label>
                    <Input
                      value={o.name}
                      onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                      placeholder="Ex.: 1kg"
                    />
                  </div>
                  <div>
                    <Label>Adicional (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={o.priceDelta ?? 0}
                      onChange={(e) =>
                        updateOption(gi, oi, { priceDelta: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <Button type="button" variant="ghost" onClick={() => removeOption(gi, oi)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover opção
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(gi)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova opção
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
