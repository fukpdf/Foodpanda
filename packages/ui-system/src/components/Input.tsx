import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const inputVariants = cva(
  [
    "flex w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900",
    "placeholder:text-gray-400 transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-gray-300",
          "hover:border-gray-400",
          "focus-visible:border-brand-500 focus-visible:ring-brand-500/20",
        ],
        error: [
          "border-red-500 bg-red-50",
          "focus-visible:border-red-500 focus-visible:ring-red-500/20",
        ],
        success: [
          "border-green-500",
          "focus-visible:border-green-500 focus-visible:ring-green-500/20",
        ],
      },
      inputSize: {
        sm: "h-8 text-xs px-2.5",
        md: "h-10",
        lg: "h-11 text-base px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants> & {
    label?: string;
    helperText?: string;
    errorText?: string;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
    containerClassName?: string;
  };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      variant,
      inputSize,
      label,
      helperText,
      errorText,
      leftAddon,
      rightAddon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? React.useId();
    const hasError = !!errorText;
    const computedVariant = hasError ? "error" : variant;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-gray-400">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant: computedVariant, inputSize }),
              leftAddon && "pl-9",
              rightAddon && "pr-9",
              className
            )}
            aria-describedby={
              errorText ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            aria-invalid={hasError}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3 flex items-center text-gray-400">{rightAddon}</div>
          )}
        </div>
        {errorText && (
          <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
            {errorText}
          </p>
        )}
        {!errorText && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
