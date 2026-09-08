import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-[15px] font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-hairline disabled:text-gray hover-elevate",
  {
    variants: {
      variant: {
        default: "bg-ink text-[hsl(var(--brass-lt))] hover:bg-[hsl(var(--ink-2))]",
        pop: "bg-pop text-[#FFF7F2] shadow-[0_10px_22px_-12px_rgba(196,87,58,0.7)] hover:bg-[hsl(var(--pop-dk))]",
        secondary: "bg-white text-ink border border-hairline hover:border-[#D8C9A9] hover:bg-background",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        quiet: "bg-bronze-wash text-bronze hover:bg-[#E8DFCC]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-[22px] py-3",
        sm: "h-9 px-[14px] py-2 text-[13.5px]",
        lg: "h-14 px-[30px] py-[15px] text-[16px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
