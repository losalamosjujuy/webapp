import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "min-h-28 w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-night placeholder:text-sand-500 focus:border-clay",
      className
    )}
    ref={ref}
    {...props}
  />
));

Textarea.displayName = "Textarea";
