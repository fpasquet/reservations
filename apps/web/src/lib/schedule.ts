import { parisDateTime } from './paris-time';
import type { Booking } from './types';

/** Horaires d'ouverture, en minutes depuis minuit (heure de Paris). */
export const OPENING_TIME = 8 * 60;
export const CLOSING_TIME = 20 * 60;
/** Les réservations se font au quart d'heure ; le planning s'affiche par demi-heure. */
export const STEP_MINUTES = 15;
export const SLOT_MINUTES = 30;
export const DEFAULT_DURATION = 60;
/** Nombre de quarts d'heure dans une journée d'ouverture : les colonnes de la grille. */
export const QUARTERS = (CLOSING_TIME - OPENING_TIME) / STEP_MINUTES;

export interface Span {
  from: number;
  to: number;
}

/** Les débuts de demi-heure de la journée : 8h00, 8h30… 19h30. */
export function slotStarts(): number[] {
  const starts: number[] = [];
  for (let minutes = OPENING_TIME; minutes < CLOSING_TIME; minutes += SLOT_MINUTES) starts.push(minutes);
  return starts;
}

/** Les heures proposées dans un sélecteur, au quart d'heure, de `from` à `to` inclus. */
export function timeOptions(from: number, to: number): number[] {
  const options: number[] = [];
  for (let minutes = from; minutes <= to; minutes += STEP_MINUTES) options.push(minutes);
  return options;
}

const ceilToStep = (minutes: number) => Math.ceil(minutes / STEP_MINUTES) * STEP_MINUTES;

/** La part d'une réservation qui tombe dans les horaires de ce jour, ou null si elle n'y tombe pas. */
export function spanOn(booking: Pick<Booking, 'startsAt' | 'endsAt'>, date: string): Span | null {
  const start = parisDateTime(new Date(booking.startsAt));
  const end = parisDateTime(new Date(booking.endsAt));
  if (start.date > date || end.date < date) return null;
  const from = Math.max(start.date < date ? OPENING_TIME : start.minutes, OPENING_TIME);
  const to = Math.min(end.date > date ? CLOSING_TIME : end.minutes, CLOSING_TIME);
  return to > from ? { from, to } : null;
}

/** Colonnes CSS (1 à QUARTERS + 1) d'un intervalle de la journée. */
export function gridColumns({ from, to }: Span): { start: number; end: number } {
  return { start: (from - OPENING_TIME) / STEP_MINUTES + 1, end: (to - OPENING_TIME) / STEP_MINUTES + 1 };
}

const overlapsSpan = (a: Span, b: Span) => a.from < b.to && b.from < a.to;

/**
 * Les demi-heures libres d'une salle : aucune réservation ne les touche et elles ne sont pas passées.
 * `now` est l'heure de Paris si la journée est aujourd'hui, null pour une journée à venir.
 */
export function freeSlots(busy: Span[], now: number | null): number[] {
  return slotStarts().filter((from) => {
    const slot = { from, to: from + SLOT_MINUTES };
    return (now === null || slot.to > now) && !busy.some((span) => overlapsSpan(span, slot));
  });
}

/** Le créneau proposé quand on clique une demi-heure libre : une heure, raccourcie par la réservation suivante. */
export function prefillFor(slot: number, busy: Span[], now: number | null): Span {
  const from = now === null ? slot : Math.max(slot, ceilToStep(now));
  const next = busy
    .filter((span) => span.from >= from)
    .reduce((earliest, span) => Math.min(earliest, span.from), CLOSING_TIME);
  return { from, to: Math.min(from + DEFAULT_DURATION, next) };
}

export type AgendaItem<T> =
  { kind: 'free'; from: number; to: number } | { kind: 'booking'; from: number; to: number; booking: T };

/** La journée d'une salle, dans l'ordre : réservations et plages libres qui les séparent. */
export function agenda<T>(items: { span: Span; booking: T }[]): AgendaItem<T>[] {
  const sorted = [...items].sort((a, b) => a.span.from - b.span.from);
  const result: AgendaItem<T>[] = [];
  let cursor = OPENING_TIME;
  for (const { span, booking } of sorted) {
    if (span.from > cursor) result.push({ kind: 'free', from: cursor, to: span.from });
    result.push({ kind: 'booking', from: span.from, to: span.to, booking });
    cursor = Math.max(cursor, span.to);
  }
  if (cursor < CLOSING_TIME) result.push({ kind: 'free', from: cursor, to: CLOSING_TIME });
  return result;
}

/** Le premier créneau qu'on peut encore réserver à partir de ce jour : le prochain quart d'heure, ou 9h00 un autre jour. */
export function firstBookableStart(
  date: string,
  now: { date: string; minutes: number },
): { date: string; from: number } {
  const day = date < now.date ? now.date : date;
  if (day !== now.date) return { date: day, from: 9 * 60 };
  const from = Math.max(OPENING_TIME, ceilToStep(now.minutes));
  if (from <= CLOSING_TIME - STEP_MINUTES) return { date: day, from };
  const tomorrow = new Date(`${day}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { date: tomorrow.toISOString().slice(0, 10), from: 9 * 60 };
}
