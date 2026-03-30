import { getProducts } from "@/lib/services/productService";
import { PublicStorefront } from "@/components/storefront/PublicStorefront";

export const dynamic = "force-dynamic";

/** Poucos itens no HTML inicial — o restante vem da API (evita travar o navegador com milhares de produtos). */
const INITIAL_TAKE = 96;

export default async function HomePage() {
  const rows = await getProducts({ activeOnly: true, take: INITIAL_TAKE });
  const initialProducts = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    complements: p.complements,
    category: p.category,
    unit: p.unit,
    price: p.price,
    stock: p.stock,
  }));

  return <PublicStorefront initialProducts={initialProducts} />;
}
