'use client';

import { addDays, isIsoDate } from '@/lib/paris-time';
import { Button } from '../ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { Input } from '../ui/input';

/** Jour précédent, jour suivant, aujourd'hui, ou une date au choix. */
export function DateNav({
  id,
  date,
  today,
  onChange,
}: {
  id: string;
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-control border border-border-strong bg-surface">
        <Button variant="ghost" size="icon" aria-label="Jour précédent" onClick={() => onChange(addDays(date, -1))}>
          <ChevronLeftIcon className="size-5" />
        </Button>
        <span aria-hidden="true" className="w-px bg-border" />
        <Button variant="ghost" size="icon" aria-label="Jour suivant" onClick={() => onChange(addDays(date, 1))}>
          <ChevronRightIcon className="size-5" />
        </Button>
      </div>
      <Button variant="secondary" onClick={() => onChange(today)} disabled={date === today}>
        Aujourd’hui
      </Button>
      <label htmlFor={id} className="sr-only">
        Aller à la date
      </label>
      <div className="w-44">
        <Input
          id={id}
          type="date"
          value={date}
          onChange={(event) => {
            if (isIsoDate(event.target.value)) onChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
