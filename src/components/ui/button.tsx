import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@open-mercato/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-none border text-sm font-bold tracking-[0.25px] transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-in-out disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:border-[#0053cc] hover:bg-[#0053cc]",
        destructive:
          "border-destructive bg-destructive text-white hover:brightness-95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
        secondary:
          "border-[#fc3c00] bg-[#fc3c00] text-white hover:border-[#ca3000] hover:bg-[#ca3000]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:border-foreground/10 hover:bg-foreground/5 dark:hover:border-white/10 dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-5 py-2.5 has-[>svg]:px-4",
        sm: "min-h-9 gap-1.5 px-3 py-1.5 text-xs has-[>svg]:px-2.5",
        lg: "min-h-12 px-7 py-3 text-lg has-[>svg]:px-5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
