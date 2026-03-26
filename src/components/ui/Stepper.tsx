import { cn } from "../../lib/utils"

interface StepperProps {
    steps: string[];
    currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
    return (
        <div className="w-full pb-8">
            <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-gray-800" />

                {/* Active Line Progress */}
                <div
                    className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-theme-accent1-600 transition-all duration-500 ease-out"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((label, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isActive = isCompleted || isCurrent;

                    return (
                        <div key={label} className="relative z-10 flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                                    isActive
                                        ? "border-theme-accent1-500 bg-theme-accent1-600 text-theme-text shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                        : "border-gray-700 bg-gray-850 text-theme-muted/80",
                                    isCurrent && "ring-4 ring-blue-500/20 scale-110"
                                )}
                            >
                                {isCompleted ? <span className="material-icons-round text-sm">check</span> : index + 1}
                            </div>
                            <span className={cn(
                                "absolute top-10 text-[11px] sm:text-xs font-semibold whitespace-nowrap text-center transition-colors",
                                isCurrent ? "text-theme-accent1-400" : isCompleted ? "text-gray-300" : "text-gray-600"
                            )}>
                                {label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
