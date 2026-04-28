import { POSProduct } from "@/hooks/useCart";
import { ProductCard } from "./ProductCard";
import { Package } from "lucide-react";

const Skeleton = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
    <div className="bg-muted" style={{ height: '130px' }} />
    <div className="p-2 space-y-2">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
);

export const ProductGrid = ({ products, loading = false }: { products: POSProduct[]; loading?: boolean }) => {
  if (loading) {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Package className="w-12 h-12 opacity-20" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
      {products.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
};
