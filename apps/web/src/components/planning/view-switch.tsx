import Link from 'next/link';
import { cn } from '../ui/cn';

export type PlanningView = 'day' | 'week';

/** Le lien vers le planning d'un jour ou d'une semaine ; aujourd'hui est la date par défaut du jour. */
export function planningHref(view: PlanningView, date: string, today: string): string {
  const params = new URLSearchParams();
  if (view === 'week') params.set('view', 'week');
  if (view === 'week' || date !== today) params.set('date', date);
  const search = params.toString();
  return search ? `/?${search}` : '/';
}

const OPTIONS: { view: PlanningView; label: string }[] = [
  { view: 'day', label: 'Jour' },
  { view: 'week', label: 'Semaine' },
];

/** Sélecteur Jour / Semaine : deux liens, l'adresse garde la vue et la date. */
export function ViewSwitch({ view, date, today }: { view: PlanningView; date: string; today: string }) {
  return (
    <nav
      aria-label="Vue du planning"
      className="inline-flex rounded-control border border-border-strong bg-surface p-0.5"
    >
      {OPTIONS.map((option) => (
        <Link
          key={option.view}
          href={planningHref(option.view, date, today)}
          scroll={false}
          aria-current={option.view === view ? 'page' : undefined}
          className={cn(
            'focus-ring inline-flex h-9 items-center rounded-control px-4 text-sm font-medium',
            option.view === view
              ? 'bg-primary text-primary-ink'
              : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
