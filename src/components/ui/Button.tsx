import * as React from "react"
import { cn } from "../../lib/utils"
import { rippleEffect } from "../../lib/animations"
import feedback from "../../lib/feedback"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disableRipple?: boolean;
    disableFeedback?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", disableRipple, disableFeedback, onClick, ...props }, ref) => {
        const innerRef = React.useRef<HTMLButtonElement>(null);

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            if (!disableRipple && innerRef.current) {
                rippleEffect(innerRef.current, e.clientX, e.clientY);
            }
            if (!disableFeedback) {
                if (variant === 'destructive') {
                    feedback.medium('error');
                } else {
                    feedback.light('click');
                }
            }
            onClick?.(e);
        };

        return (
            <button
                ref={(node) => {
                    (innerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
                    if (typeof ref === 'function') ref(node);
                    else if (ref) ref.current = node;
                }}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-base disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] overflow-hidden relative",
                    {
                        "bg-theme-accent1-600 text-white hover:brightness-110 shadow-[var(--shadow-button-default)]": variant === "default",
                        "bg-red-600 text-white hover:bg-red-700 shadow-[var(--shadow-button-destructive)]": variant === "destructive",
                        "border border-theme-border bg-transparent hover:bg-theme-muted/10 text-theme-text": variant === "outline",
                        "bg-theme-base/80 border border-theme-border text-theme-text hover:bg-theme-muted/20": variant === "secondary",
                        "hover:bg-theme-muted/10 hover:text-theme-text text-theme-muted": variant === "ghost",
                        "text-theme-accent1-500 underline-offset-4 hover:underline": variant === "link",
                        "h-12 px-5": size === "default",
                        "h-9 rounded-lg px-3 text-sm": size === "sm",
                        "h-14 rounded-xl px-8 text-lg": size === "lg",
                        "h-12 w-12": size === "icon",
                    },
                    className
                )}
                onClick={handleClick}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
