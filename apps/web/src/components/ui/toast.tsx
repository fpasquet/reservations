'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { AlertIcon, CheckIcon, CloseIcon } from './icons';

type Tone = 'success' | 'danger';

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

const DURATION_MS = 5000;

const ToastContext = createContext<((toast: Omit<Toast, 'id'>) => void) | null>(null);

/** Notifications brèves, annoncées aux lecteurs d'écran ; elles disparaissent seules. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...toast, id }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-overlay"
          >
            <span
              className={cn(
                'mt-0.5 rounded-pill p-1',
                toast.tone === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
              )}
            >
              {toast.tone === 'success' ? <CheckIcon /> : <AlertIcon />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-sm text-ink-muted">{toast.description}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 -mr-2 size-7"
              aria-label="Fermer la notification"
              onClick={() => dismiss(toast.id)}
            >
              <CloseIcon />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error('useToast must be used inside a ToastProvider');
  return notify;
}
