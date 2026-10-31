'use client';

import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import { cn } from './cn';

export interface Tab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** Onglets : les flèches, Début et Fin passent d'un onglet à l'autre et l'activent. */
export function Tabs<T extends string>({
  idPrefix,
  label,
  tabs,
  value,
  onChange,
}: {
  idPrefix: string;
  label: string;
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent) {
    const index = tabs.findIndex((tab) => tab.id === value);
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) refs.current.set(tab.id, element);
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'focus-ring -mb-px flex cursor-pointer items-center gap-2 rounded-t-control border-b-2 px-4 py-2.5 text-sm font-medium',
              selected ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-xs',
                  selected ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-ink-muted',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, id, children }: { idPrefix: string; id: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, id)}
      aria-labelledby={tabId(idPrefix, id)}
      tabIndex={0}
      className="focus-ring pt-5"
    >
      {children}
    </div>
  );
}
