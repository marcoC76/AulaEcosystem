import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { ToastContext } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import { toastEnter, toastExit } from '../../lib/animations';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startExit = useCallback((id: number) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    const el = document.querySelector(`[data-toast-id="${id}"]`);
    if (el) {
      toastExit(el);
    }
    const timer = setTimeout(() => removeToast(id), 280);
    timersRef.current.set(id, timer);
  }, [removeToast]);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);

    const timer = setTimeout(() => startExit(id), 4000);
    timersRef.current.set(id, timer);
  }, [startExit]);

  const handleToastMount = useCallback((el: HTMLDivElement | null, _id: number) => {
    if (el) {
      toastEnter(el);
    }
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            ref={(el) => handleToastMount(el, t.id)}
            data-toast-id={t.id}
            role="alert"
            aria-live="polite"
            className={cn(
              "px-4 py-3 rounded-xl text-sm font-semibold text-center shadow-2xl backdrop-blur-md pointer-events-auto",
              t.type === 'success' && "bg-emerald-900/90 border border-emerald-500/30 text-emerald-200",
              t.type === 'error' && "bg-red-900/90 border border-red-500/30 text-red-200",
              t.type === 'info' && "bg-theme-card/95 border border-theme-border text-theme-text"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
