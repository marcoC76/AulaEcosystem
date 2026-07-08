import * as React from "react"
import { cn } from "../../lib/utils"
import { modalEnter, modalExit } from "../../lib/animations"

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    fullScreenOnMobile?: boolean;
}

export function Modal({ isOpen, onClose, title, children, className, fullScreenOnMobile = false }: ModalProps) {
    const overlayRef = React.useRef<HTMLDivElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const closeBtnRef = React.useRef<HTMLButtonElement>(null)
    const keyHandlerRef = React.useRef<((e: KeyboardEvent) => void) | null>(null)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            setMounted(true)
            const previous = document.activeElement as HTMLElement | null
            let cancelled = false

            requestAnimationFrame(() => {
                if (cancelled) return
                if (overlayRef.current && contentRef.current) {
                    overlayRef.current.style.opacity = '0'
                    contentRef.current.style.opacity = '0'
                    contentRef.current.style.transform = 'translateY(30px) scale(0.95)'
                    modalEnter(overlayRef.current, contentRef.current)
                }
                requestAnimationFrame(() => {
                    if (cancelled) return
                    closeBtnRef.current?.focus()

                    const handleKeyDown = (e: KeyboardEvent) => {
                        if (e.key === 'Escape') {
                            onClose()
                            return
                        }
                        if (e.key === 'Tab' && contentRef.current) {
                            const focusable = contentRef.current.querySelectorAll<HTMLElement>(
                                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                            )
                            if (focusable.length === 0) return
                            const first = focusable[0]
                            const last = focusable[focusable.length - 1]
                            if (e.shiftKey && document.activeElement === first) {
                                e.preventDefault()
                                last.focus()
                            } else if (!e.shiftKey && document.activeElement === last) {
                                e.preventDefault()
                                first.focus()
                            }
                        }
                    }

                    keyHandlerRef.current = handleKeyDown
                    document.addEventListener('keydown', handleKeyDown)
                })
            })

            return () => {
                cancelled = true
                if (keyHandlerRef.current) {
                    document.removeEventListener('keydown', keyHandlerRef.current)
                    keyHandlerRef.current = null
                }
                previous?.focus()
            }
        } else {
            if (overlayRef.current && contentRef.current) {
                modalExit(overlayRef.current, contentRef.current)
                setTimeout(() => setMounted(false), 300)
            } else {
                setMounted(false)
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    if (!mounted) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 sm:p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={contentRef}
                className={cn(
                    "w-full flex flex-col bg-theme-card shadow-2xl overflow-hidden print-area",
                    fullScreenOnMobile ? "h-full rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:max-w-xl" : "max-h-[85vh] rounded-t-2xl sm:rounded-2xl max-w-xl self-end sm:self-auto",
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-label={title || 'Diálogo'}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between p-4 border-b border-theme-border bg-theme-base/50">
                    <h2 className="text-xl font-semibold text-theme-text">{title}</h2>
                    <button
                        ref={closeBtnRef}
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="rounded-full p-2.5 text-theme-muted hover:bg-theme-muted/10 hover:text-theme-text transition-colors flex shrink-0 no-print"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 bg-theme-card">
                    {children}
                </div>
            </div>
        </div>
    )
}
