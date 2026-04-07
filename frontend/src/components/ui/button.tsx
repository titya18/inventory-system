import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm",
        // POS Action buttons
        discount: "bg-success text-primary-foreground hover:bg-btn-discount/90 shadow-sm",
        tax: "bg-btn-tax text-primary-foreground hover:bg-btn-tax/90 shadow-sm",
        shipping: "bg-btn-shipping text-primary-foreground hover:bg-btn-shipping/90 shadow-sm",
        hold: "bg-btn-hold text-primary-foreground hover:bg-btn-hold/90 shadow-sm",
        void: "bg-btn-void text-primary-foreground hover:bg-btn-void/90 shadow-sm",
        payment: "bg-btn-payment text-primary-foreground hover:bg-btn-payment/90 shadow-sm",
        orders: "bg-btn-orders text-primary-foreground hover:bg-btn-orders/90 shadow-sm",
        reset: "bg-btn-reset text-primary-foreground hover:bg-btn-reset/90 shadow-sm",
        transaction: "bg-btn-transaction text-primary-foreground hover:bg-btn-transaction/90 shadow-sm",
        // Category button
        category: "border border-border bg-card text-foreground hover:bg-secondary hover:border-primary",
        categoryActive: "border-2 border-primary bg-primary/5 text-primary font-medium",
        // Add to cart
        addToCart: "bg-success text-success-foreground hover:bg-success/90 rounded-full shadow-md hover:shadow-lg hover:scale-110",
        removeFromCart: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full shadow-md hover:shadow-lg hover:scale-110",
        // Pay button
        pay: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl font-semibold text-base",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        iconSm: "h-7 w-7",
        iconLg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
