import * as React from "react"

import { cn } from "@/lib/utils"

function DenseInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="dense-input"
      className={cn(
        "w-full h-8 px-2 text-sm bg-input border border-border rounded transition-all focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { DenseInput }