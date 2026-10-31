'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent } from 'react';
import { getDayPlanning, getRooms } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { addDays, formatDay } from '@/lib/paris-time';
import { seatsLabel } from '@/lib/rooms';
import type { Booking, Room } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { mondayOf, occupancy, weekDays } from '@/lib/week';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { TabPanel } from '../ui/tabs';
import { type PlanningView, ViewSwitch } from './view-switch';

const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const monthFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Les cinq jours d'une semaine, chargés ensemble : l'API ne sert qu'une journée à la fois. */
const loadWeek = (days: string[]) => Promise.all(days.map((day) => getDayPlanning(day)));

function levelClasses(percent: number): string {
  if (percent >= 100) return 'bg-danger-soft text-danger';
  if (percent >= 70) return 'bg-warning-soft text-warning';
  if (percent > 0) return 'bg-primary-soft text-primary';
  return 'text-ink-subtle hover:bg-surface-muted';
}

export function WeekPlanning({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const monday = mondayOf(date);
  const days = weekDays(date);
  const rooms = useResource('rooms', () => getRooms());
  const week = useResource(`week:${monday}`, () => loadWeek(days));

  const thisMonday = mondayOf(today);
  const go = (nextMonday: string) =>
    router.push(nextMonday === thisMonday ? '/?view=week' : `/?view=week&date=${nextMonday}`, { scroll: false });
  const previous = () => go(addDays(monday, -7));
  const next = () => go(addDays(monday, 7));

  // PageUp / PageDown changent de semaine sans quitter le clavier, depuis n'importe où dans la vue.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'PageUp') previous();
    else if (event.key === 'PageDown') next();
    else return;
    event.preventDefault();
  }

  function changeView(view: PlanningView) {
    if (view === 'day') router.push(date === today ? '/' : `/?date=${date}`, { scroll: false });
  }

  const friday = days[days.length - 1] ?? monday;
  const error = rooms.status === 'error' ? rooms.error : week.error;

  return (
    <div className="flex flex-col gap-5" onKeyDown={onKeyDown}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
        <p className="mt-1 text-ink-muted">
          Semaine du {monthFormat.format(atNoon(monday))} au {monthFormat.format(atNoon(friday))}
        </p>
      </div>

      <ViewSwitch value="week" onChange={changeView} />

      <TabPanel idPrefix="planning-view" id="week">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-control border border-border-strong bg-surface">
              <Button variant="ghost" size="icon" aria-label="Semaine précédente" onClick={previous}>
                <ChevronLeftIcon className="size-5" />
              </Button>
              <span aria-hidden="true" className="w-px bg-border" />
              <Button variant="ghost" size="icon" aria-label="Semaine suivante" onClick={next}>
                <ChevronRightIcon className="size-5" />
              </Button>
            </div>
            <Button variant="secondary" onClick={() => go(thisMonday)} disabled={monday === thisMonday}>
              Cette semaine
            </Button>
            <p className="text-sm text-ink-subtle">Page haut et Page bas du clavier changent de semaine.</p>
          </div>

          {error !== undefined ? (
            <ErrorState
              message={messageFor(error)}
              onRetry={() => {
                rooms.reload();
                week.reload();
              }}
            />
          ) : rooms.status !== 'ready' || week.status !== 'ready' ? (
            <WeekSkeleton />
          ) : rooms.data.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="size-6" />}
              title="Aucune salle pour l’instant"
              description="Les salles de l’espace apparaîtront ici dès qu’elles seront ouvertes à la réservation."
            />
          ) : week.data.every((day) => day.length === 0) ? (
            <EmptyState
              icon={<CalendarIcon className="size-6" />}
              title="Aucune réservation cette semaine"
              description="Toutes les salles sont libres du lundi au vendredi."
            />
          ) : (
            <WeekGrid rooms={rooms.data} days={days} bookings={week.data.flat()} today={today} />
          )}
        </div>
      </TabPanel>
    </div>
  );
}

function WeekGrid({
  rooms,
  days,
  bookings,
  today,
}: {
  rooms: Room[];
  days: string[];
  bookings: Booking[];
  today: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="w-full min-w-[calc(var(--spacing-room-column-compact)+5*var(--spacing-week-cell))] border-collapse">
        <caption className="sr-only">
          Taux d’occupation de chaque salle, jour par jour. Un clic ouvre le planning du jour.
        </caption>
        <thead>
          <tr className="border-b border-border text-xs text-ink-muted">
            <th
              scope="col"
              className="sticky left-0 z-4 w-(--spacing-room-column-compact) border-r border-border bg-surface px-3 py-2.5 text-left font-medium sm:w-(--spacing-room-column) sm:px-4"
            >
              Salle
            </th>
            {days.map((day) => (
              <th
                key={day}
                scope="col"
                aria-label={formatDay(day, today)}
                className={cn('px-1 py-2.5 text-center font-medium', day === today && 'text-primary')}
              >
                <span className="block first-letter:uppercase">{weekdayFormat.format(atNoon(day))}</span>
                <span className="block tabular-nums">{Number(day.slice(8))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-4 border-r border-border bg-surface px-3 py-2 text-left font-normal sm:px-4"
              >
                <Link
                  href={`/rooms/${room.id}`}
                  className="focus-ring flex items-center gap-2 rounded-sm text-sm font-medium hover:underline"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-pill"
                    style={{ backgroundColor: room.color }}
                  />
                  <span className="truncate">{room.name}</span>
                </Link>
                <span className="block pl-4.5 text-xs text-ink-subtle">{seatsLabel(room.capacity)}</span>
              </th>
              {days.map((day) => {
                const percent = occupancy(bookings, room.id, day);
                return (
                  <td key={day} className="p-0.5">
                    <Link
                      href={day === today ? '/' : `/?date=${day}`}
                      aria-label={`${room.name}, ${formatDay(day, today)} : ${percent} % occupée. Ouvrir le planning du jour`}
                      className={cn(
                        'focus-ring flex h-14 items-center justify-center rounded-md text-sm font-medium tabular-nums',
                        levelClasses(percent),
                      )}
                    >
                      {percent} %
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <LoadingLabel>Chargement de la semaine…</LoadingLabel>
      <Skeleton className="mb-4 h-5 w-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-2">
            <Skeleton className="h-12 w-24 sm:w-36" />
            <Skeleton className="h-12 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
