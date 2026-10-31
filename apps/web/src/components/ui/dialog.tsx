'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { CloseIcon } from './icons';

/**
 * Fenêtre modale, sur l'élément <dialog> natif : focus piégé, Échap et clic sur le fond la ferment.
 * Le contenu n'est monté que pendant l'ouverture, pour repartir d'un formulaire vierge.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md';
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] rounded-card bg-surface p-0 text-ink shadow-overlay',
        size === 'sm' ? 'max-w-md' : 'max-w-xl',
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer" className="-mt-1 -mr-2">
              <CloseIcon className="size-5" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
