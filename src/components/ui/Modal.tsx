import * as React from "react"
import { cn } from "../../lib/utils"

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    fullScreenOnMobile?: boolean;
}

export function Modal({ isOpen, onClose, title, children, className, fullScreenOnMobile = false }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 sm:p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={cn(
                    "w-full flex flex-col bg-gray-900 shadow-2xl overflow-hidden animate-fade-in-up print-area",
                    fullScreenOnMobile ? "h-full rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:max-w-xl" : "max-h-[85vh] rounded-t-2xl sm:rounded-2xl max-w-xl self-end sm:self-auto",
                    className
                )}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between p-4 border-b border-gray-800 bg-gray-850">
                    <h2 className="text-xl font-semibold text-theme-text">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-theme-muted hover:bg-gray-800 hover:text-theme-text transition-colors flex shrink-0 no-print"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 bg-gray-900">
                    {children}
                </div>
            </div>
        </div>
    )
}
