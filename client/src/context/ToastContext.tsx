import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Info, X, XCircle } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  push: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? Check : t.type === 'error' ? XCircle : Info;
          return (
            <div
              key={t.id}
              className="animate-slide-in-right pointer-events-auto relative overflow-hidden rounded-[5px] border border-line bg-panel"
            >
              <div className="flex items-start gap-3 px-3.5 py-3">
                <Icon
                  size={15}
                  className={t.type === 'error' ? 'mt-0.5 shrink-0 text-[#ff9b8d]' : 'mt-0.5 shrink-0 text-[#8ce3b5]'}
                />
                <p className="flex-1 text-[12.5px] leading-relaxed text-ink-muted">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="rounded-[3px] p-0.5 text-[#8f96a3] transition-colors duration-150 hover:bg-white/5 hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
              <div
                className={`toast-progress h-0.5 w-full ${t.type === 'error' ? 'bg-[#ff8a7a]' : 'bg-[#7bd8a6]'}`}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
