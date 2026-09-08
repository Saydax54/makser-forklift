import * as React from "react";

import { cn } from "@/lib/utils";
import { shouldUppercase, trUpper } from "@/lib/uppercase";

type InputProps = React.ComponentProps<"input"> & { noUppercase?: boolean };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, noUppercase, onChange, ...props }, ref) => {
    const upper = shouldUppercase(type, noUppercase);
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={(e) => {
          if (upper) {
            const next = trUpper(e.target.value);
            if (next !== e.target.value) {
              const pos = e.target.selectionStart;
              e.target.value = next;
              if (pos !== null) e.target.setSelectionRange(pos, pos);
            }
          }
          onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
