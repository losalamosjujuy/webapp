import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-sand-200 bg-white px-4 text-sm text-night placeholder:text-sand-500 focus:border-clay",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = "Input";
