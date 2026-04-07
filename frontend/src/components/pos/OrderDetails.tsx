import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Edit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const OrderDetails = () => {
  const { items, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No items in order</p>
        <p className="text-xs mt-1">Add products to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px] pr-2">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left pb-2 font-medium">Product</th>
            <th className="text-center pb-2 font-medium">QTY</th>
            <th className="text-right pb-2 font-medium">Price</th>
            <th className="w-8 pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.product.id} className="border-b border-border/50 animate-fade-in">
              <td className="py-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground line-clamp-1">
                    {item.product.name}
                  </span>
                  <Edit className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  Price: ${item.product.price}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="h-6 w-6 rounded-full"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </td>
              <td className="py-3 text-right">
                <span className="text-sm font-semibold">
                  ${(item.product.price * item.quantity).toLocaleString()}
                </span>
              </td>
              <td className="py-3">
                <Button
                  variant="ghost"
                  size="iconSm"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(item.product.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
};
