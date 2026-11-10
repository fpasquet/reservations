'use client';

import Link from 'next/link';
import { type KeyboardEvent, useRef, useState } from 'react';
import { formatDay, formatMinutes } from '@/lib/paris-time';
import { seatsLabel } from '@/lib/rooms';
import {
  CLOSING_TIME,
  freeSlots,
  gridColumns,
  OPENING_TIME,
  prefillFor,
  SLOT_MINUTES,
  type Span,
  spanOn,
} from '@/lib/schedule';
import type { Booking, Room } from '@/lib/types';

interface Item {
  key: string;
  span: Span;
  booking?: Booking;
}

interface Row {
  room: Room;
  busy: Span[];
  items: Item[];
}

const HOURS = Array.from({ length: (CLOSING_TIME - OPENING_TIME) / 60 }, (_, index) => OPENING_TIME / 60 + index);
const DAY_LENGTH = CLOSING_TIME - OPENING_TIME;
const percentOf = (minutes: number) => `${((minutes - OPENING_TIME) / DAY_LENGTH) * 100}%`;
// Un trait par demi-heure, sous les créneaux.
const SLOT_LINES = `repeating-linear-gradient(to right, transparent 0, transparent calc(100% / 24 - 1px), var(--color-border) calc(100% / 24 - 1px), var(--color-border) calc(100% / 24))`;

function rowsOf(rooms: Room[], bookings: Booking[], date: string, now: number | null): Row[] {
  return rooms.map((room) => {
    const placed = bookings
      .filter((booking) => booking.room.id === room.id)
      .flatMap((booking) => {
        const span = spanOn(booking, date);
        return span ? [{ key: `booking-${booking.id}`, span, booking }] : [];
      });
    const busy = placed.map((item) => item.span);
    const free = freeSlots(busy, now).map((from) => ({
      key: `free-${room.id}-${from}`,
      span: { from, to: from + SLOT_MINUTES },
    }));
    return { room, busy, items: [...placed, ...free].sort((a, b) => a.span.from - b.span.from) };
  });
}

/** Le nouvel élément actif quand on presse une flèche, Début ou Fin, ou undefined pour une autre touche. */
function moveFrom(rows: Row[], key: string, pressed: string): Item | undefined {
  const rowIndex = rows.findIndex((row) => row.items.some((item) => item.key === key));
  const row = rows[rowIndex];
  if (!row) return rows.find((candidate) => candidate.items.length > 0)?.items[0];
  const index = row.items.findIndex((item) => item.key === key);
  const current = row.items[index];
  if (!current) return undefined;

  switch (pressed) {
    case 'ArrowRight':
      return row.items[index + 1] ?? current;
    case 'ArrowLeft':
      return row.items[index - 1] ?? current;
    case 'Home':
      return row.items[0];
    case 'End':
      return row.items.at(-1);
    case 'ArrowDown':
    case 'ArrowUp': {
      const direction = pressed === 'ArrowDown' ? 1 : -1;
      for (let next = rowIndex + direction; next >= 0 && next < rows.length; next += direction) {
        const items = rows[next]?.items ?? [];
        if (items.length === 0) continue;
        return (
          items.find((item) => item.span.from <= current.span.from && current.span.from < item.span.to) ??
          items.reduce((closest, item) =>
            Math.abs(item.span.from - current.span.from) < Math.abs(closest.span.from - current.span.from)
              ? item
              : closest,
          )
        );
      }
      return current;
    }
    default:
      return undefined;
  }
}

/**
 * Le planning d'une journée : une ligne par salle, une colonne par quart d'heure de 8h00 à 20h00.
 * Une seule cellule est dans l'ordre de tabulation ; les flèches parcourent la grille.
 * `now` : l'heure de Paris si la journée est aujourd'hui, la fermeture si elle est passée, null si elle est à venir.
 */
export function PlanningGrid({
  date,
  rooms,
  bookings,
  now,
  isToday,
  onSelectSlot,
}: {
  date: string;
  rooms: Room[];
  bookings: Booking[];
  now: number | null;
  isToday: boolean;
  onSelectSlot: (roomId: number, span: Span) => void;
}) {
  const rows = rowsOf(rooms, bookings, date, now);
  const refs = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState<string | null>(null);
  const allKeys = rows.flatMap((row) => row.items.map((item) => item.key));
  const activeKey = active !== null && allKeys.includes(active) ? active : (allKeys[0] ?? null);

  function onKeyDown(event: KeyboardEvent) {
    if (activeKey === null) return;
    const target = moveFrom(rows, activeKey, event.key);
    if (!target) return;
    event.preventDefault();
    setActive(target.key);
    refs.current.get(target.key)?.focus();
  }

  const register = (key: string) => (element: HTMLElement | null) => {
    if (element) refs.current.set(key, element);
    else refs.current.delete(key);
  };

  const nowInDay = isToday && now !== null && now > OPENING_TIME && now < CLOSING_TIME;

  return (
    <div className="isolate overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <p id="planning-help" className="sr-only">
        Les flèches passent d’un créneau à l’autre ; Entrée réserve le créneau libre sélectionné.
      </p>
      <div
        role="grid"
        aria-label={`Planning du ${formatDay(date)}`}
        aria-describedby="planning-help"
        aria-rowcount={rows.length + 1}
        onKeyDown={onKeyDown}
        className="min-w-[calc(var(--spacing-room-column)+48*var(--spacing-quarter))]"
      >
        <div
          role="row"
          aria-rowindex={1}
          className="grid grid-cols-[var(--spacing-room-column-compact)_1fr] sm:grid-cols-[var(--spacing-room-column)_1fr] border-b border-border text-xs text-ink-muted"
        >
          <div
            role="columnheader"
            className="sticky left-0 z-4 border-r border-border bg-surface px-3 py-2.5 font-medium sm:px-4"
          >
            Salle
          </div>
          <div className="grid grid-cols-12">
            {HOURS.map((hour) => (
              <div
                key={hour}
                role="columnheader"
                className="border-l border-border px-1.5 py-2.5 tabular-nums first:border-l-0"
              >
                {hour}h
              </div>
            ))}
          </div>
        </div>

        {rows.map((row, rowIndex) => (
          <div
            key={row.room.id}
            role="row"
            aria-rowindex={rowIndex + 2}
            className="grid grid-cols-[var(--spacing-room-column-compact)_1fr] sm:grid-cols-[var(--spacing-room-column)_1fr] border-b border-border last:border-b-0"
          >
            <div
              role="rowheader"
              className="sticky left-0 z-4 flex flex-col justify-center border-r border-border bg-surface px-3 py-2 sm:px-4"
            >
              <Link
                href={`/rooms/${row.room.id}?date=${date}`}
                className="focus-ring flex items-center gap-2 rounded-sm text-sm font-medium hover:underline"
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-pill"
                  style={{ backgroundColor: row.room.color }}
                />
                <span className="truncate">{row.room.name}</span>
              </Link>
              <span className="pl-4.5 text-xs text-ink-subtle">{seatsLabel(row.room.capacity)}</span>
            </div>

            <div className="relative grid h-16 grid-cols-48" style={{ backgroundImage: SLOT_LINES }}>
              {now !== null && now > OPENING_TIME && (
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-surface-muted/70"
                  style={{ width: percentOf(Math.min(now, CLOSING_TIME)) }}
                />
              )}

              {row.items.map((item) => {
                const { start, end } = gridColumns(item.span);
                const tabIndex = item.key === activeKey ? 0 : -1;
                const placement = { gridColumn: `${start} / ${end}`, gridRow: 1 };

                if (!item.booking) {
                  const label = `Réserver ${row.room.name} à ${formatMinutes(item.span.from)}`;
                  return (
                    <div key={item.key} role="gridcell" className="z-1 p-0.5" style={placement}>
                      <button
                        ref={register(item.key)}
                        type="button"
                        tabIndex={tabIndex}
                        aria-label={label}
                        title={label}
                        onFocus={() => setActive(item.key)}
                        onClick={() => onSelectSlot(row.room.id, prefillFor(item.span.from, row.busy, now))}
                        className="group focus-ring flex size-full cursor-pointer items-center justify-center rounded-md text-base font-medium text-primary hover:bg-primary-soft"
                      >
                        <span
                          aria-hidden="true"
                          className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                        >
                          +
                        </span>
                      </button>
                    </div>
                  );
                }

                const { booking } = item;
                const time = `${formatMinutes(item.span.from)} – ${formatMinutes(item.span.to)}`;
                return (
                  <div
                    key={item.key}
                    ref={register(item.key)}
                    role="gridcell"
                    tabIndex={tabIndex}
                    aria-label={`${booking.title}, réservé par ${booking.member.fullName}, de ${time}`}
                    title={`${booking.title} · ${booking.member.fullName} · ${time}`}
                    onFocus={() => setActive(item.key)}
                    className="focus-ring z-2 my-1.5 mr-0.5 flex min-w-0 flex-col justify-center overflow-hidden rounded-md border-l-4 px-2 text-xs"
                    style={{ ...placement, borderLeftColor: row.room.color, backgroundColor: `${row.room.color}1f` }}
                  >
                    <span className="truncate font-medium text-ink">{booking.title}</span>
                    <span className="truncate text-ink-muted">
                      {time} · {booking.member.fullName}
                    </span>
                  </div>
                );
              })}

              {nowInDay && now !== null && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 z-3 w-0.5 -translate-x-1/2 bg-now"
                  style={{ left: percentOf(now) }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
