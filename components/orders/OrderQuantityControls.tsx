"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatQuantity, isWeightUnit, parseQuantityInput } from "@/lib/quantity";

type AddByQuantityButtonProps = {
  unit: string;
  disabled?: boolean;
  onAdd: (quantity: number) => void;
};

export function AddByQuantityButton({ unit, disabled, onAdd }: AddByQuantityButtonProps) {
  const weight = isWeightUnit(unit);
  const [draft, setDraft] = useState("1");
  const [invalid, setInvalid] = useState(false);

  function submit() {
    if (!weight) {
      onAdd(1);
      return;
    }

    const quantity = parseQuantityInput(draft, unit);
    if (quantity == null) {
      setInvalid(true);
      alert("Informe a quantidade em kg. Ex.: 0,5 ou 1,250");
      return;
    }

    setInvalid(false);
    onAdd(quantity);
    setDraft("1");
  }

  if (!weight) {
    return (
      <Button type="button" size="sm" onClick={submit} disabled={disabled} aria-label="Adicionar">
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={draft}
        inputMode="decimal"
        aria-label="Quantidade em kg"
        aria-invalid={invalid}
        placeholder="0,5"
        className={cn("w-20", invalid && "border-destructive")}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
      />
      <span className="text-xs text-muted-foreground">kg</span>
      <Button type="button" size="sm" onClick={submit} disabled={disabled} aria-label="Adicionar">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

type CartQuantityInputProps = {
  unit: string;
  quantity: number;
  onChange: (quantity: number) => void;
};

export function CartQuantityInput({ unit, quantity, onChange }: CartQuantityInputProps) {
  const weight = isWeightUnit(unit);
  const [text, setText] = useState(() => formatQuantity(quantity, unit));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatQuantity(quantity, unit));
  }, [focused, quantity, unit]);

  function commit(next: string) {
    const parsed = parseQuantityInput(next, unit);
    if (parsed == null) {
      setText(formatQuantity(quantity, unit));
      return;
    }
    onChange(parsed);
    setText(formatQuantity(parsed, unit));
  }

  return (
    <Input
      value={text}
      inputMode={weight ? "decimal" : "numeric"}
      aria-label={weight ? "Quantidade em kg" : "Quantidade"}
      className={weight ? "w-24" : "w-16"}
      onFocus={() => {
        setFocused(true);
        setText(formatQuantity(quantity, unit));
      }}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (weight) {
          if (next !== "" && !/^[\d.,]*$/.test(next)) return;
        } else if (next !== "" && !/^\d*$/.test(next)) return;
        setText(next);
        const parsed = parseQuantityInput(next, unit);
        if (parsed != null) onChange(parsed);
      }}
    />
  );
}
