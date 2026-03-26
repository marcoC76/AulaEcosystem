import * as React from "react"
import { cn } from "../../lib/utils"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    className={cn(
                        "flex h-11 w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-theme-text ring-offset-gray-950 placeholder:text-theme-muted/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none">
                    expand_more
                </span>
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
