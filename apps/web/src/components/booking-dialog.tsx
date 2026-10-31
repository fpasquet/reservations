'use client';

import { type FormEvent, useState } from 'react';
import { ApiError, createBooking } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { formatDay, formatMinutes, parisInstant, todayInParis } from '@/lib/paris-time';
import { seatsLabel } from '@/lib/rooms';
import { CLOSING_TIME, DEFAULT_DURATION, OPENING_TIME, STEP_MINUTES, timeOptions } from '@/lib/schedule';
import type { Booking, Room } from '@/lib/types';
import { useMember } from './member-context';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { AlertIcon } from './ui/icons';
import { Field, fieldProps, Input } from './ui/input';
import { Select } from './ui/select';
import { useToast } from './ui/toast';

/** Ce que le formulaire propose en s'ouvrant : la salle, le jour et les heures (minutes depuis minuit, à Paris). */
export interface BookingDraft {
  roomId: number | null;
  date: string;
  from: number;
  to: number;
}

type FieldName = 'room' | 'date' | 'start' | 'end' | 'title' | 'attendees';

// Les champs de l'API et ceux du formulaire.
const API_FIELDS: Record<string, FieldName> = {
  roomId: 'room',
  startsAt: 'start',
  endsAt: 'end',
  title: 'title',
  attendees: 'attendees',
};

const TITLE_MAX_LENGTH = 80;

function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

export function BookingDialog({
  draft,
  rooms,
  onClose,
  onBooked,
}: {
  draft: BookingDraft | null;
  rooms: Room[];
  onClose: () => void;
  onBooked: (booking: Booking) => void;
}) {
  return (
    <Dialog
      open={draft !== null}
      onClose={onClose}
      title="Réserver une salle"
      description="Les salles se réservent au quart d’heure, de 8h00 à 20h00, pour 4 heures au plus."
    >
      {draft && <BookingForm draft={draft} rooms={rooms} onCancel={onClose} onBooked={onBooked} />}
    </Dialog>
  );
}

function BookingForm({
  draft,
  rooms,
  onCancel,
  onBooked,
}: {
  draft: BookingDraft;
  rooms: Room[];
  onCancel: () => void;
  onBooked: (booking: Booking) => void;
}) {
  const { member } = useMember();
  const notify = useToast();
  const [roomId, setRoomId] = useState(draft.roomId === null ? '' : String(draft.roomId));
  const [date, setDate] = useState(draft.date);
  const [start, setStart] = useState(draft.from);
  const [end, setEnd] = useState(draft.to);
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const room = rooms.find((candidate) => String(candidate.id) === roomId);

  function changeStart(value: number) {
    setStart(value);
    // L'heure de fin suit l'heure de début, pour garder un créneau valide.
    if (end <= value) setEnd(Math.min(value + DEFAULT_DURATION, CLOSING_TIME));
  }

  function validate(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!room) found.room = 'Choisissez une salle.';
    if (!date) found.date = 'Choisissez une date.';
    if (end <= start) found.end = messageFor(new ApiError(400, 'END_BEFORE_START'));
    if (title.trim() === '') found.title = 'Donnez un titre à la réservation, par exemple « Point d’équipe ».';
    const count = Number(attendees);
    if (attendees !== '' && (!Number.isInteger(count) || count < 1)) {
      found.attendees = 'Indiquez un nombre entier de participants.';
    }
    return found;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!member) {
      setFormError(messageFor(new ApiError(400, 'MISSING_MEMBER')));
      return;
    }
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !room) return;

    setSubmitting(true);
    try {
      const booking = await createBooking(member.id, {
        roomId: room.id,
        title: title.trim(),
        attendees: attendees === '' ? null : Number(attendees),
        startsAt: parisInstant(date, start).toISOString(),
        endsAt: parisInstant(date, end).toISOString(),
      });
      notify({
        tone: 'success',
        title: 'Salle réservée',
        description: `${room.name}, ${formatDay(date)} de ${formatMinutes(start)} à ${formatMinutes(end)}.`,
      });
      onBooked(booking);
    } catch (error) {
      const field = error instanceof ApiError && error.field ? API_FIELDS[error.field] : undefined;
      if (field && !(error instanceof ApiError && error.code === 'ROOM_ALREADY_BOOKED')) {
        setErrors({ [field]: messageFor(error) });
      } else {
        setFormError(messageFor(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const endHint = end > start ? `Durée : ${durationLabel(end - start)}` : undefined;
  const attendeesHint = room ? `Facultatif · jusqu’à ${seatsLabel(room.capacity)}` : 'Facultatif';

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert" className="flex gap-2 rounded-control bg-danger-soft p-3 text-sm text-danger">
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      <Field id="booking-room" label="Salle" error={errors.room}>
        <Select
          {...fieldProps('booking-room', { error: errors.room })}
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
        >
          <option value="">Choisir une salle</option>
          {rooms.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {seatsLabel(candidate.capacity)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="booking-date" label="Date" error={errors.date}>
          <Input
            {...fieldProps('booking-date', { error: errors.date })}
            type="date"
            min={todayInParis()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <Field id="booking-start" label="Début" error={errors.start}>
          <Select
            {...fieldProps('booking-start', { error: errors.start })}
            value={start}
            onChange={(event) => changeStart(Number(event.target.value))}
          >
            {timeOptions(OPENING_TIME, CLOSING_TIME - STEP_MINUTES).map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="booking-end" label="Fin" hint={endHint} error={errors.end}>
          <Select
            {...fieldProps('booking-end', { hint: endHint, error: errors.end })}
            value={end}
            onChange={(event) => setEnd(Number(event.target.value))}
          >
            {timeOptions(OPENING_TIME + STEP_MINUTES, CLOSING_TIME).map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatMinutes(minutes)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field id="booking-title" label="Titre" error={errors.title}>
        <Input
          {...fieldProps('booking-title', { error: errors.title })}
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Point d’équipe, rendez-vous client…"
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
        />
      </Field>

      <Field id="booking-attendees" label="Participants" hint={attendeesHint} error={errors.attendees}>
        <Input
          {...fieldProps('booking-attendees', { hint: attendeesHint, error: errors.attendees })}
          type="number"
          inputMode="numeric"
          min={1}
          max={room?.capacity}
          value={attendees}
          onChange={(event) => setAttendees(event.target.value)}
          className="sm:w-40"
        />
      </Field>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Réservation…' : 'Réserver'}
        </Button>
      </div>
    </form>
  );
}
