"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

export function ImportProdutosButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function enviarArquivo(file: File) {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Falha na importação");
      }
      alert(
        `Importação: ${data.criados ?? 0} criados, ${data.ignoradosDuplicados ?? 0} duplicados ignorados.` +
          (data.erros?.length
            ? `\n${data.erros.length} erro(s) — veja o console do servidor.`
            : "")
      );
      if ((data.criados ?? 0) > 0) window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setLoading(false);
    }
  }

  async function importarDaRaiz() {
    setLoading(true);
    try {
      const res = await fetch("/api/products/import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha na importação");
      alert(
        `Importação: ${data.criados ?? 0} criados, ${data.ignoradosDuplicados ?? 0} duplicados ignorados.`
      );
      if ((data.criados ?? 0) > 0) window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviarArquivo(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Importar Excel
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={loading}
        onClick={() => void importarDaRaiz()}
      >
        Importar produtos.xlsx (raiz)
      </Button>
    </div>
  );
}
