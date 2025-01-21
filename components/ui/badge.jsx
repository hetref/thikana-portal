<<<<<<< HEAD
import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
=======
export function Badge({ children, onClick, className = "" }) {
    return (
        <span
            className={`inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 ${className}`}
            onClick={onClick}
        >
            {children}
        </span>
    );
}
>>>>>>> 895dc218c399f6bc73343c388631c13d74de1f42
