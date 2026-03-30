"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Props = {
  type: "products" | "orders" | "movements";
};

export function ExportButton({ type }: Props) {
  const labels = {
    products: "Exportar produtos",
    orders: "Exportar pedidos",
    movements: "Exportar movimentações",
  };

  return (
    <Button
      variant="outline"
      onClick={() => {
        window.open(`/api/export/${type}`, "_blank");
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      {labels[type]}
    </Button>
  );
}
