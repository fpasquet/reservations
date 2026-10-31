'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getDayPlanning, getRooms } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { formatDay, parisDateTime } from '@/lib/paris-time';
import { CLOSING_TIME, DEFAULT_DURATION, firstBookableStart } from '@/lib/schedule';
import { useNow } from '@/lib/use-now';
import { useResource } from '@/lib/use-resource';
import { type BookingDraft, BookingDialog } from '../booking-dialog';
import { Button } from '../ui/button';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { CalendarIcon, PlusIcon } from '../ui/icons';
import { DateNav } from './date-nav';
import { PlanningGrid } from './planning-grid';

export function DayPlanning({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const rooms = useResource('rooms', () => getRooms());
  const bookings = useResource(`planning:${date}`, () => getDayPlanning(date));
  const current = parisDateTime(useNow());
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  const isToday = date === current.date;
  const now = date < current.date ? CLOSING_TIME : isToday ? current.minutes : null;

  function navigate(next: string) {
    router.push(next === today ? '/' : `/?date=${next}`, { scroll: false });
  }

  function openBlankDraft() {
    const start = firstBookableStart(date, current);
    setDraft({
      roomId: null,
      date: start.date,
      from: start.from,
      to: Math.min(start.from + DEFAULT_DURATION, CLOSING_TIME),
    });
  }

  const error = rooms.status === 'error' ? rooms.error : bookings.error;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="mt-1 text-ink-muted first-letter:uppercase">{formatDay(date, today)}</p>
        </div>
        <Button onClick={openBlankDraft} disabled={rooms.status !== 'ready'}>
          <PlusIcon />
          Réserver une salle
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateNav id="planning-date" date={date} today={today} onChange={navigate} />
        <p className="text-sm text-ink-subtle">Cliquez sur un créneau libre pour le réserver.</p>
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
        <PlanningSkeleton />
      ) : rooms.data.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="size-6" />}
          title="Aucune salle pour l’instant"
          description="Les salles de l’espace apparaîtront ici dès qu’elles seront ouvertes à la réservation."
        />
      ) : (
        <PlanningGrid
          date={date}
          rooms={rooms.data}
          bookings={bookings.data}
          now={now}
          isToday={isToday}
          onSelectSlot={(roomId, span) => setDraft({ roomId, date, ...span })}
        />
      )}

      <BookingDialog
        draft={draft}
        rooms={rooms.data ?? []}
        onClose={() => setDraft(null)}
        onBooked={(booking) => {
          setDraft(null);
          bookings.reload();
          const day = parisDateTime(new Date(booking.startsAt)).date;
          if (day !== date) navigate(day);
        }}
      />
    </div>
  );
}

function PlanningSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <LoadingLabel>Chargement du planning…</LoadingLabel>
      <Skeleton className="mb-4 h-5 w-full" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-12 w-36" />
            <Skeleton className="h-12 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
