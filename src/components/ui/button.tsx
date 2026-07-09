import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-night px-5 py-3 text-white hover:bg-sand-800",
        secondary: "bg-white px-5 py-3 text-night shadow-card hover:bg-sand-50",
        outline: "border border-sand-300 px-5 py-3 text-night hover:border-clay hover:text-clay",
        ghost: "px-3 py-2 text-sand-700 hover:bg-sand-100 hover:text-night"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />
  )
);

Button.displayName = "Button";
