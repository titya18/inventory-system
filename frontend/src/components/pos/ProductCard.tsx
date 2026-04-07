import { Product } from "@/data/products";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { items, addItem, removeItem } = useCart();
  const cartItem = items.find((item) => item.product.id === product.id);
  const isInCart = !!cartItem;

  return (
    <div className="group bg-card rounded-lg shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden animate-fade-in relative">
      {/* Image Container */}
      <div className="relative aspect-square bg-secondary/30 p-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Quantity Badge */}
        {isInCart && (
          <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full animate-scale-in">
            {cartItem.quantity}
          </div>
        )}
      </div>

      {/* Add/Remove Button - Always visible in corner */}
      <Button
        variant={isInCart ? "removeFromCart" : "addToCart"}
        size="iconSm"
        className="absolute top-2 right-2 transition-all duration-200"
        onClick={() => isInCart ? removeItem(product.id) : addItem(product)}
      >
        {isInCart ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </Button>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="font-medium text-foreground text-sm truncate mb-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-base">
            ${product.price.toLocaleString()}
          </span>
          <span className="text-pos-stock text-xs font-medium">
            {product.stock} Pcs
          </span>
        </div>
      </div>
    </div>
  );
};
