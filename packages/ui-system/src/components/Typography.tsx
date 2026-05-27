import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const textVariants = cva("", {
  variants: {
    variant: {
      h1: "text-4xl font-bold tracking-tight text-gray-900",
      h2: "text-3xl font-bold tracking-tight text-gray-900",
      h3: "text-2xl font-semibold text-gray-900",
      h4: "text-xl font-semibold text-gray-900",
      h5: "text-lg font-semibold text-gray-900",
      h6: "text-base font-semibold text-gray-900",
      "body-lg": "text-base leading-relaxed text-gray-700",
      body: "text-sm leading-relaxed text-gray-700",
      "body-sm": "text-xs leading-relaxed text-gray-600",
      label: "text-sm font-medium text-gray-700",
      caption: "text-xs text-gray-500",
      overline: "text-xs font-semibold uppercase tracking-wider text-gray-500",
      code: "font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-800",
    },
    color: {
      default: "",
      muted: "text-gray-500",
      brand: "text-brand-600",
      success: "text-green-600",
      warning: "text-amber-600",
      danger: "text-red-600",
      white: "text-white",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    truncate: {
      true: "truncate",
    },
  },
  defaultVariants: {
    variant: "body",
    color: "default",
  },
});

type VariantToElement = {
  h1: "h1";
  h2: "h2";
  h3: "h3";
  h4: "h4";
  h5: "h5";
  h6: "h6";
  "body-lg": "p";
  body: "p";
  "body-sm": "p";
  label: "span";
  caption: "span";
  overline: "span";
  code: "code";
};

type TextVariant = NonNullable<VariantProps<typeof textVariants>["variant"]>;

const defaultElements: Record<TextVariant, keyof React.JSX.IntrinsicElements> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  "body-lg": "p",
  body: "p",
  "body-sm": "p",
  label: "span",
  caption: "span",
  overline: "span",
  code: "code",
};

export type TextProps<T extends keyof React.JSX.IntrinsicElements = "p"> = {
  as?: T;
  className?: string;
  children?: React.ReactNode;
} & VariantProps<typeof textVariants> &
  Omit<React.JSX.IntrinsicElements[T], "color">;

export function Text<T extends keyof React.JSX.IntrinsicElements = "p">({
  as,
  variant = "body",
  color,
  align,
  truncate,
  className,
  children,
  ...props
}: TextProps<T>) {
  const Tag = (as ?? defaultElements[variant as TextVariant] ?? "p") as React.ElementType;

  return (
    <Tag
      className={cn(textVariants({ variant, color, align, truncate }), className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
