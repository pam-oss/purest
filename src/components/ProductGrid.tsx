import type { Product } from "@/lib/shopify";
import ProductCard from "@/components/ProductCard";

interface Props {
  products: Product[];
}

/**
 * Receives products as a prop (fetched server-side at build time in Astro).
 * No useEffect needed — the data already exists when this component mounts.
 */
export default function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No products available right now. Check back soon.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
