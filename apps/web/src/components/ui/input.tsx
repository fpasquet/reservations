import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export const controlClasses =
  'focus-ring h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle disabled:opacity-60 aria-invalid:border-danger';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-sm font-medium text-ink', className)} {...props} />;
}

/** Un champ de formulaire : libellé, contrôle, aide et message d'erreur reliés par leurs identifiants. */
export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Les attributs d'accessibilité d'un contrôle placé dans un Field. */
export function fieldProps(id: string, { hint, error }: { hint?: string; error?: string }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
}
