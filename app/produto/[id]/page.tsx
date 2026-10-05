import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getProductDisplayImageUrl } from "@/lib/productImage";
import { ProductDetailAddToCart } from "@/components/storefront/ProductDetailAddToCart";

export const dynamic = "force-dynamic";

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, active: true },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      complements: true,
      category: true,
      unit: true,
      price: true,
      stock: true,
    },
  });

  if (!product) notFound();

  const description =
    product.description?.trim() ||
    `Produto da categoria ${product.category}. Unidade: ${product.unit}.`;

  return (
    <main className="min-h-screen bg-[#faf9f7] px-4 py-6 pb-24">
      <div className="mx-auto w-full max-w-3xl">
        <Button asChild variant="outline" className="mb-4">
          <Link href="/">Voltar para a loja</Link>
        </Button>

        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="aspect-[16/9] bg-gray-100">
            <img
              src={getProductDisplayImageUrl(product.imageUrl, product.name)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-3 p-5 md:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2e7d32]">
              {product.category}
            </p>
            <h1 className="break-words text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm leading-relaxed text-gray-600">{description}</p>

            <div className="grid gap-3 pt-2 text-sm text-gray-700 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Preço</p>
                <p className="font-semibold text-[#2e7d32]">
                  {formatCurrency(product.price)}
                  <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Estoque disponível</p>
                <p className="font-semibold">{Math.max(0, Number(product.stock)).toFixed(0)}</p>
              </div>
            </div>

            <ProductDetailAddToCart
              productId={product.id}
              name={product.name}
              complementsRaw={product.complements}
              basePrice={product.price}
              unit={product.unit}
            />
          </div>
        </article>
      </div>
    </main>
  );
}
