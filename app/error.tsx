"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#faf9f7] p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Algo deu errado</h1>
      <p className="text-sm text-gray-600 max-w-md">
        Tente atualizar a página. Se o catálogo for muito grande, use busca ou categorias na loja.
      </p>
      <Button type="button" onClick={() => reset()} className="bg-[#2e7d32] hover:bg-[#1b5e20]">
        Tentar de novo
      </Button>
    </div>
  );
}
