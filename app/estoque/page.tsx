import Link from "next/link";
import {
  countProducts,
  getProductCategories,
  getProducts,
} from "@/lib/services/productService";
import { getMovements } from "@/lib/services/stockService";
import { StockMovementModal } from "./StockMovementModal";
import { StockTable } from "./StockTable";
import { ExportButton } from "./ExportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PageProps = {
  searchParams?: {
    page?: string;
    q?: string;
    category?: string;
  };
};

const PAGE_SIZE = 50;

function buildPageHref(page: number, q: string, category: string): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return `/estoque?${params.toString()}`;
}

function getPageItems(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export default async function EstoquePage({ searchParams }: PageProps) {
  const q = searchParams?.q?.trim() ?? "";
  const categoryRaw = searchParams?.category?.trim() ?? "";
  const category = categoryRaw === "__all__" ? "" : categoryRaw;
  const pageRaw = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [products, totalProducts, categories, movements] = await Promise.all([
    getProducts({
      activeOnly: false,
      search: q || undefined,
      category: category || undefined,
      take: PAGE_SIZE,
      skip,
    }),
    countProducts({
      activeOnly: false,
      search: q || undefined,
      category: category || undefined,
    }),
    getProductCategories({ activeOnly: false }),
    getMovements({ limit: 50 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            Controle de entradas, saídas e ajustes
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="movements" />
          <StockMovementModal products={products} />
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={category ? "outline" : "default"}
              asChild
            >
              <Link href={buildPageHref(1, q, "")}>Todas</Link>
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={category === cat ? "default" : "outline"}
                asChild
              >
                <Link href={buildPageHref(1, q, cat)}>{cat}</Link>
              </Button>
            ))}
          </div>

          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
            <div>
              <Label htmlFor="q">Pesquisar produto</Label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Digite nome ou categoria"
              />
            </div>
            <input type="hidden" name="category" value={category || "__all__"} />
            <input type="hidden" name="page" value="1" />
            <Button type="submit">Buscar</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/estoque">Limpar</Link>
            </Button>
          </form>
        </div>

        <StockTable products={products} movements={movements} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {products.length} de {totalProducts} produto(s)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage <= 1}
            >
              <Link href={buildPageHref(currentPage - 1, q, category)}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            {pageItems.map((p) => (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={buildPageHref(p, q, category)}>{p}</Link>
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage >= totalPages}
            >
              <Link href={buildPageHref(currentPage + 1, q, category)}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
