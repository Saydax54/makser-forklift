import * as React from "react";

import { cn } from "@/lib/utils";
import { trUpper } from "@/lib/uppercase";

type TextareaProps = React.ComponentProps<"textarea"> & { noUppercase?: boolean };

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, noUppercase, onChange, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={(e) => {
          if (!noUppercase) {
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
Textarea.displayName = "Textarea";

export { Textarea };
