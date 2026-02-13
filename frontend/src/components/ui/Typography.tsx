import * as React from "react"
import { cn } from "@/lib/utils"

// --- Headings ---
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({ className, level = 1, ...props }, ref) => {
        const Comp = `h${level}` as React.ElementType;
        const sizeClasses = {
            1: "text-4xl md:text-5xl font-black tracking-tight",
            2: "text-3xl font-bold tracking-tight",
            3: "text-2xl font-bold tracking-tight",
            4: "text-xl font-bold tracking-tight",
            5: "text-lg font-bold tracking-tight",
            6: "text-base font-bold tracking-tight",
        };

        return (
            <Comp
                ref={ref}
                className={cn(
                    "font-display text-slate-900 drop-shadow-sm",
                    sizeClasses[level],
                    className
                )}
                {...props}
            />
        )
    }
)
Heading.displayName = "Heading"

// --- Text ---
export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
    variant?: "default" | "muted" | "small" | "large";
}

const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
    ({ className, variant = "default", ...props }, ref) => {
        const variantClasses = {
            default: "text-base text-slate-700",
            muted: "text-sm text-slate-500",
            small: "text-xs text-slate-500",
            large: "text-lg font-medium text-slate-700",
        };

        return (
            <p
                ref={ref}
                className={cn(variantClasses[variant], className)}
                {...props}
            />
        )
    }
)
Text.displayName = "Text"

export { Heading, Text }
