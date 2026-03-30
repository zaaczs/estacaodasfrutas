"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function ImportCsvButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      alert("Arquivo CSV inválido. Use o formato: nome,categoria,unidade,preço,custo,estoque,minStock");
      return;
    }

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes("nome") || header.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    let created = 0;
    let errors = 0;

    for (const line of dataLines) {
      const parts = parseCsvLine(line);
      if (parts.length < 5) continue;

      const [name, category, unit, priceStr, costStr, stockStr, minStockStr] = parts;
      const price = parseFloat(priceStr?.replace(",", ".") || "0");
      const cost = parseFloat(costStr?.replace(",", ".") || "0");
      const stock = parseFloat(stockStr?.replace(",", ".") || "0");
      const minStock = parseFloat(minStockStr?.replace(",", ".") || "0");

      if (!name || !category || !unit) continue;

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            category: category.trim(),
            unit: unit.trim(),
            price,
            cost,
            stock,
            minStock,
          }),
        });
        if (res.ok) created++;
        else errors++;
      } catch {
        errors++;
      }
    }

    alert(`Importação concluída: ${created} criados, ${errors} erros.`);
    if (created > 0) window.location.reload();
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        Importar CSV
      </Button>
    </>
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || c === "\n") {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}
