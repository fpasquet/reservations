'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, getDayPlanning, getRoom } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { formatDay, formatMinutes, parisDateTime } from '@/lib/paris-time';
import { floorLabel, seatsLabel } from '@/lib/rooms';
import { agenda, CLOSING_TIME, prefillFor, type Span, spanOn, STEP_MINUTES } from '@/lib/schedule';
import type { Booking, Room } from '@/lib/types';
import { useNow } from '@/lib/use-now';
import { useResource } from '@/lib/use-resource';
import { type BookingDraft, BookingDialog } from '../booking-dialog';
import { EquipmentList } from '../equipment';
import { DateNav } from '../planning/date-nav';
import { Button, buttonClasses } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { ChevronLeftIcon, LayersIcon, UsersIcon } from '../ui/icons';
import { RoomTile } from './room-card';

export function RoomDetail({ roomId, date, today }: { roomId: number; date: string; today: string }) {
  const room = useResource(`room:${roomId}`, () => getRoom(roomId));

  if (room.status === 'loading') {
    return (
      <div className="flex flex-col gap-5">
        <LoadingLabel>Chargement de la salle…</LoadingLabel>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }
  if (room.status === 'error') {
    if (room.error instanceof ApiError && room.error.status === 404) {
      return (
        <EmptyState
          icon={<LayersIcon className="size-6" />}
          title="Cette salle n’existe pas"
          description="Elle a peut-être été renommée ou fermée."
          action={
            <Link href="/rooms" className={buttonClasses({ variant: 'secondary' })}>
              Voir toutes les salles
            </Link>
          }
        />
      );
    }
    return <ErrorState message={messageFor(room.error)} onRetry={room.reload} />;
  }
  return <RoomDay room={room.data} date={date} today={today} />;
}

function RoomDay({ room, date, today }: { room: Room; date: string; today: string }) {
  const router = useRouter();
  const bookings = useResource(`room-planning:${room.id}:${date}`, () => getDayPlanning(date, room.id));
  const current = parisDateTime(useNow());
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const now = date < current.date ? CLOSING_TIME : date === current.date ? current.minutes : null;

  const placed = (bookings.data ?? []).flatMap((booking) => {
    const span = spanOn(booking, date);
    return span ? [{ span, booking }] : [];
  });
  const busy = placed.map((item) => item.span);

  function navigate(next: string) {
    router.push(next === today ? `/rooms/${room.id}` : `/rooms/${room.id}?date=${next}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/rooms"
        className="focus-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink"
      >
        <ChevronLeftIcon />
        Toutes les salles
      </Link>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <Card className="h-fit overflow-hidden">
          <RoomTile room={room} className="h-32" />
          <div className="flex flex-col gap-4 p-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
              <p className="mt-2 text-sm text-ink-muted">{room.description}</p>
            </div>
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Capacité</dt>
                <UsersIcon />
                <dd>{seatsLabel(room.capacity)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Étage</dt>
                <LayersIcon />
                <dd>{floorLabel(room.floor)}</dd>
              </div>
            </dl>
            <EquipmentList equipment={room.equipment} />
          </div>
        </Card>

        <section aria-labelledby="room-day-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="room-day-title" className="text-lg font-semibold tracking-tight first-letter:uppercase">
              {formatDay(date, today)}
            </h2>
            <DateNav id="room-date" date={date} today={today} onChange={navigate} />
          </div>

          {bookings.status === 'error' ? (
            <ErrorState message={messageFor(bookings.error)} onRetry={bookings.reload} />
          ) : bookings.status === 'loading' ? (
            <div className="flex flex-col gap-2">
              <LoadingLabel>Chargement des réservations…</LoadingLabel>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {agenda(placed).map((item) =>
                item.kind === 'booking' ? (
                  <AgendaBooking key={`booking-${item.booking.id}`} span={item} booking={item.booking} />
                ) : (
                  <AgendaFree
                    key={`free-${item.from}`}
                    span={item}
                    now={now}
                    onBook={(slot) => setDraft({ roomId: room.id, date, ...prefillFor(slot, busy, now) })}
                  />
                ),
              )}
            </ol>
          )}
        </section>
      </div>

      <BookingDialog
        draft={draft}
        rooms={[room]}
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

function TimeRange({ span }: { span: Span }) {
  return (
    <span className="w-28 shrink-0 text-sm font-medium tabular-nums">
      {formatMinutes(span.from)} – {formatMinutes(span.to)}
    </span>
  );
}

function AgendaBooking({ span, booking }: { span: Span; booking: Booking }) {
  return (
    <li className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:gap-4">
      <TimeRange span={span} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{booking.title}</p>
        <p className="text-sm text-ink-muted">
          {booking.member.fullName}
          {booking.attendees !== null &&
            ` · ${booking.attendees > 1 ? `${booking.attendees} participants` : '1 participant'}`}
        </p>
      </div>
    </li>
  );
}

function AgendaFree({ span, now, onBook }: { span: Span; now: number | null; onBook: (slot: number) => void }) {
  // Une plage libre en partie passée ne se réserve qu'à partir du prochain quart d'heure.
  const from = now === null ? span.from : Math.max(span.from, Math.ceil(now / STEP_MINUTES) * STEP_MINUTES);
  const bookable = from < span.to;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-dashed border-border-strong px-4 py-3">
      <TimeRange span={span} />
      <p className="flex-1 text-sm text-ink-subtle">{bookable ? 'Libre' : 'Libre, créneau passé'}</p>
      {bookable && (
        <Button variant="secondary" size="sm" onClick={() => onBook(from)}>
          Réserver à {formatMinutes(from)}
        </Button>
      )}
    </li>
  );
}
