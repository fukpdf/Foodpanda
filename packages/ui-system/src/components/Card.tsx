import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const cardVariants = cva("rounded-xl bg-white", {
  variants: {
    variant: {
      default: "border border-gray-200 shadow-sm",
      elevated: "shadow-md",
      flat: "border border-gray-100",
      outlined: "border-2 border-brand-200",
      ghost: "bg-gray-50",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-6",
      xl: "p-8",
    },
    interactive: {
      true: [
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants> & {
    as?: React.ElementType;
  };

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, as: Tag = "div", ...props }, ref) => {
    return (
      <Tag
        ref={ref}
        className={cn(cardVariants({ variant, padding, interactive }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5 pb-4 border-b border-gray-100", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-tight text-gray-900", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-gray-100", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
