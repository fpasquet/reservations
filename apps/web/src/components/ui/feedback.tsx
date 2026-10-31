import type { ReactNode } from 'react';
import { Button } from './button';
import { cn } from './cn';
import { AlertIcon } from './icons';

/** Bloc gris animé qui tient la place d'un contenu en cours de chargement. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-control bg-surface-muted', className)} />;
}

/** Annonce discrète d'un chargement, pour les lecteurs d'écran. */
export function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      {icon && <div className="mb-3 rounded-pill bg-surface-muted p-3 text-ink-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center"
    >
      <AlertIcon className="size-5 shrink-0" />
      <p className="flex-1">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
