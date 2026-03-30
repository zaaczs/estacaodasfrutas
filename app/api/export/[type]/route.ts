import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProducts } from "@/lib/services/productService";
import { getOrders } from "@/lib/services/orderService";
import { getMovements } from "@/lib/services/stockService";
import { formatDate } from "@/lib/utils";

type ExportType = "products" | "orders" | "movements";

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: ExportType }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { type } = await params;

    if (!["products", "orders", "movements"].includes(type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    let csv = "";
    const searchParams = request.nextUrl.searchParams;

    if (type === "products") {
      const products = await getProducts({ activeOnly: false });
      csv = [
        "ID,Nome,Categoria,Unidade,Preço,Custo,Estoque,Estoque Mínimo,Ativo",
        ...products.map((p) =>
          [
            p.id,
            p.name,
            p.category,
            p.unit,
            p.price,
            p.cost,
            p.stock,
            p.minStock,
            p.active ? "Sim" : "Não",
          ].map(escapeCsv).join(",")
        ),
      ].join("\n");
    } else if (type === "orders") {
      const dateFrom = searchParams.get("dateFrom")
        ? new Date(searchParams.get("dateFrom")!)
        : undefined;
      const dateTo = searchParams.get("dateTo")
        ? new Date(searchParams.get("dateTo")!)
        : undefined;
      const orders = await getOrders({ dateFrom, dateTo });
      csv = [
        "ID,Cliente,Total,Status,Data",
        ...orders.map((o) =>
          [
            o.id,
            o.customer?.name ?? "-",
            o.total,
            o.status,
            formatDate(o.createdAt),
          ].map(escapeCsv).join(",")
        ),
      ].join("\n");
    } else if (type === "movements") {
      const productId = searchParams.get("productId") ?? undefined;
      const movements = await getMovements({ productId, limit: 1000 });
      csv = [
        "ID,Produto,Tipo,Quantidade,Data",
        ...movements.map((m) =>
          [
            m.id,
            m.product.name,
            m.type,
            m.quantity,
            formatDate(m.createdAt),
          ].map(escapeCsv).join(",")
        ),
      ].join("\n");
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="export-${type}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export/[type]:", error);
    return NextResponse.json(
      { error: "Erro ao exportar" },
      { status: 500 }
    );
  }
}
