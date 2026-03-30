import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import {
  countProducts,
  getProductCategories,
  getProducts,
} from "@/lib/services/productService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductsTable } from "./ProductsTable";
import { ProductCategoriesManager } from "./ProductCategoriesManager";
import { ProductModal } from "./ProductModal";
import { ImportCsvButton } from "./ImportCsvButton";
import { ImportProdutosButton } from "./ImportProdutosButton";
import { ExportButton } from "../estoque/ExportButton";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PageProps = {
  searchParams?: {
    page?: string;
    q?: string;
    category?: string;
  };
};

const PAGE_SIZE = 50;

function buildPageHref(
  page: number,
  q: string,
  category: string
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return `/produtos?${params.toString()}`;
}

function getPageItems(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export default async function ProdutosPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const q = searchParams?.q?.trim() ?? "";
  const categoryRaw = searchParams?.category?.trim() ?? "";
  const category = categoryRaw === "__all__" ? "" : categoryRaw;
  const pageRaw = Number(searchParams?.page ?? "1");
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const [products, totalProducts, categories] = await Promise.all([
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
  ]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton type="products" />
          <ImportCsvButton />
          <ImportProdutosButton />
          <ProductCategoriesManager canManage={session.user.role === "ADMIN"} />
          <ProductModal trigger={<Button>Novo produto</Button>} />
        </div>
      </div>

      <form className="mb-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto] md:items-end">
        <div>
          <Label htmlFor="q">Buscar produto</Label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Digite nome ou parte do nome"
          />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <select
            id="category"
            name="category"
            defaultValue={category || "__all__"}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="__all__">Todas categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="page" value="1" />
        <Button type="submit">Filtrar</Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/produtos">Limpar</Link>
        </Button>
      </form>

      <ProductsTable
        products={products}
        categories={categories}
        canDelete={session.user.role === "ADMIN"}
      />

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
  );
}
