'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent } from 'react';
import { getDayPlanning, getRooms } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { addDays, formatColumnDay, formatDay } from '@/lib/paris-time';
import { seatsLabel } from '@/lib/rooms';
import type { Booking, Room } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { occupancy, weekDays, weekStart } from '@/lib/week';
import { Button } from '../ui/button';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { planningHref, ViewSwitch } from './view-switch';

const percent = (ratio: number) => `${Math.round(ratio * 100)} %`;

/** Les réservations du lundi au vendredi ; une réservation sur plusieurs jours n'est comptée qu'une fois. */
async function loadWeek(days: string[]): Promise<Booking[]> {
  const perDay = await Promise.all(days.map((day) => getDayPlanning(day)));
  return [...new Map(perDay.flat().map((booking) => [booking.id, booking])).values()];
}

function weekLabel(days: string[], today: string): string {
  const [first = '', last = ''] = [days[0], days.at(-1)];
  return `Semaine du ${formatDay(first)} au ${formatDay(last, today)}`;
}

/** Une colonne par jour, une ligne par salle, le taux d'occupation dans chaque case ; une case ouvre le planning du jour. */
export function WeekPlanning({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const days = weekDays(date);
  const monday = weekStart(date);
  const rooms = useResource('rooms', () => getRooms());
  const bookings = useResource(`week:${monday}`, () => loadWeek(days));

  function navigate(next: string) {
    router.push(planningHref('week', next, today), { scroll: false });
  }

  // Page précédente / suivante : le raccourci des listes paginées, sans gêner les flèches du navigateur.
  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'PageUp') navigate(addDays(monday, -7));
    else if (event.key === 'PageDown') navigate(addDays(monday, 7));
    else return;
    event.preventDefault();
  }

  const error = rooms.status === 'error' ? rooms.error : bookings.error;
  const isThisWeek = weekStart(today) === monday;

  return (
    <div className="flex flex-col gap-5" onKeyDown={onKeyDown}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
        <p className="mt-1 text-ink-muted">{weekLabel(days, today)}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <ViewSwitch view="week" date={date} today={today} />
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-control border border-border-strong bg-surface">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Semaine précédente"
                onClick={() => navigate(addDays(monday, -7))}
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
              <span aria-hidden="true" className="w-px bg-border" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Semaine suivante"
                onClick={() => navigate(addDays(monday, 7))}
              >
                <ChevronRightIcon className="size-5" />
              </Button>
            </div>
            <Button variant="secondary" onClick={() => navigate(today)} disabled={isThisWeek}>
              Cette semaine
            </Button>
          </div>
        </div>
        <p className="text-sm text-ink-subtle">Cliquez sur une case pour ouvrir le planning du jour.</p>
      </div>

      {error !== undefined ? (
        <ErrorState
          message={messageFor(error)}
          onRetry={() => {
            rooms.reload();
            bookings.reload();
          }}
        />
      ) : rooms.status !== 'ready' || bookings.status !== 'ready' ? (
        <WeekSkeleton />
      ) : rooms.data.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="size-6" />}
          title="Aucune salle pour l’instant"
          description="Les salles de l’espace apparaîtront ici dès qu’elles seront ouvertes à la réservation."
        />
      ) : !rooms.data.some((room) => days.some((day) => occupancy(bookings.data, room.id, day) > 0)) ? (
        <EmptyState
          icon={<CalendarIcon className="size-6" />}
          title="Aucune réservation cette semaine"
          description="Toutes les salles sont libres du lundi au vendredi."
          action={
            <Link
              href={planningHref('day', days[0] ?? today, today)}
              className="text-sm font-medium text-primary underline"
            >
              Ouvrir le planning du lundi
            </Link>
          }
        />
      ) : (
        <WeekGrid days={days} today={today} rooms={rooms.data} bookings={bookings.data} />
      )}
    </div>
  );
}

function WeekGrid({
  days,
  today,
  rooms,
  bookings,
}: {
  days: string[];
  today: string;
  rooms: Room[];
  bookings: Booking[];
}) {
  return (
    <div className="isolate overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">Taux d’occupation des salles, du lundi au vendredi, de 8h00 à 20h00</caption>
        <colgroup>
          <col className="w-[var(--spacing-room-column-compact)] sm:w-[var(--spacing-room-column)]" />
          {days.map((day) => (
            <col key={day} className="min-w-12" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-ink-muted">
            <th scope="col" className="px-3 py-2.5 text-left font-medium sm:px-4">
              Salle
            </th>
            {days.map((day) => (
              <th
                key={day}
                scope="col"
                aria-label={formatDay(day)}
                aria-current={day === today ? 'date' : undefined}
                className={`border-l border-border px-1 py-2.5 text-center font-medium ${day === today ? 'text-primary' : ''}`}
              >
                <span aria-hidden="true" className="block first-letter:uppercase">
                  {formatColumnDay(day)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-normal sm:px-4">
                <Link
                  href={`/rooms/${room.id}`}
                  className="focus-ring flex items-center gap-2 rounded-sm font-medium hover:underline"
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
                const ratio = occupancy(bookings, room.id, day);
                return (
                  <td key={day} className="border-l border-border p-0.5">
                    <Link
                      href={planningHref('day', day, today)}
                      aria-label={`${room.name}, ${formatDay(day)} : ${percent(ratio)} d’occupation`}
                      className="focus-ring flex h-14 items-center justify-center rounded-md text-sm font-medium tabular-nums hover:outline hover:outline-border-strong"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.round(ratio * 50)}%, var(--color-surface))`,
                      }}
                    >
                      {percent(ratio)}
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
            <Skeleton className="h-14 w-24 sm:w-36" />
            <Skeleton className="h-14 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
