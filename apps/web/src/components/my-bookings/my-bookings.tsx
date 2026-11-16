'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { cancelBooking, confirmWaitlistEntry, getMemberBookings, getMemberWaitlist, leaveWaitlist } from '@/lib/api';
import { canConfirm, isCancellable, splitByTime, upcomingEntries } from '@/lib/bookings';
import { messageFor } from '@/lib/error-messages';
import { formatDay, formatMinutes, parisDateTime } from '@/lib/paris-time';
import type { Booking, Member, WaitlistEntry } from '@/lib/types';
import { useNow } from '@/lib/use-now';
import { useResource } from '@/lib/use-resource';
import { useMember } from '../member-context';
import { Badge } from '../ui/badge';
import { Button, buttonClasses } from '../ui/button';
import { Card } from '../ui/card';
import { Dialog } from '../ui/dialog';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { CalendarIcon, ClockIcon, UsersIcon } from '../ui/icons';
import { TabPanel, Tabs } from '../ui/tabs';
import { useToast } from '../ui/toast';

type TabId = 'upcoming' | 'past';

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
const dayNumberFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'Europe/Paris' });

function describe(booking: Booking | WaitlistEntry): string {
  const start = parisDateTime(new Date(booking.startsAt));
  const end = parisDateTime(new Date(booking.endsAt));
  return `${booking.room.name}, ${formatDay(start.date)} de ${formatMinutes(start.minutes)} à ${formatMinutes(end.minutes)}`;
}

export function MyBookings() {
  const { member, members } = useMember();

  if (members.status === 'loading') return <ListSkeleton />;
  if (!member) {
    return (
      <Page>
        <EmptyState
          icon={<UsersIcon className="size-6" />}
          title="Qui êtes-vous ?"
          description="Choisissez votre nom en haut de la page, à côté de « Connecté en tant que », pour retrouver vos réservations."
        />
      </Page>
    );
  }
  return <MemberBookings key={member.id} member={member} />;
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes réservations</h1>
          <p className="mt-1 text-ink-muted">Vos créneaux à venir et votre historique.</p>
        </div>
        <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
          <CalendarIcon />
          Voir le planning
        </Link>
      </div>
      {children}
    </div>
  );
}

function MemberBookings({ member }: { member: Member }) {
  const bookings = useResource(`member-bookings:${member.id}`, () => getMemberBookings(member.id));
  const waitlist = useResource(`member-waitlist:${member.id}`, () => getMemberWaitlist(member.id));
  const now = useNow();
  const notify = useToast();
  const [tab, setTab] = useState<TabId>('upcoming');
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [busyEntry, setBusyEntry] = useState<number | null>(null);

  if (bookings.status === 'loading') return <ListSkeleton />;
  if (bookings.status === 'error') {
    return (
      <Page>
        <ErrorState message={messageFor(bookings.error)} onRetry={bookings.reload} />
      </Page>
    );
  }

  const { upcoming, past } = splitByTime(bookings.data, now);
  const shown = tab === 'upcoming' ? upcoming : past;

  async function confirmCancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await cancelBooking(member.id, toCancel.id);
      notify({ tone: 'success', title: 'Réservation annulée', description: describe(toCancel) });
      setToCancel(null);
      bookings.reload();
    } catch (error) {
      notify({ tone: 'danger', title: 'Annulation impossible', description: messageFor(error) });
    } finally {
      setCancelling(false);
    }
  }

  async function answer(entry: WaitlistEntry, action: 'confirm' | 'leave') {
    setBusyEntry(entry.id);
    try {
      if (action === 'confirm') {
        await confirmWaitlistEntry(member.id, entry.id);
        notify({ tone: 'success', title: 'Salle réservée', description: describe(entry) });
      } else {
        await leaveWaitlist(member.id, entry.id);
        notify({ tone: 'success', title: 'Inscription retirée', description: describe(entry) });
      }
    } catch (error) {
      notify({ tone: 'danger', title: 'Action impossible', description: messageFor(error) });
    } finally {
      setBusyEntry(null);
      bookings.reload();
      waitlist.reload();
    }
  }

  const entries = waitlist.status === 'ready' ? upcomingEntries(waitlist.data, now) : [];

  return (
    <Page>
      <div>
        <Tabs
          idPrefix="my-bookings"
          label="Mes réservations"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'upcoming', label: 'À venir', count: upcoming.length },
            { id: 'past', label: 'Passées', count: past.length },
          ]}
        />
        <TabPanel idPrefix="my-bookings" id={tab}>
          {shown.length === 0 ? (
            tab === 'upcoming' ? (
              <EmptyState
                icon={<CalendarIcon className="size-6" />}
                title="Aucune réservation à venir"
                description="Trouvez un créneau libre dans le planning et réservez en quelques secondes."
                action={
                  <Link href="/" className={buttonClasses()}>
                    Réserver une salle
                  </Link>
                }
              />
            ) : (
              <EmptyState icon={<ClockIcon className="size-6" />} title="Aucune réservation passée" />
            )
          ) : (
            <ul className="flex flex-col gap-3">
              {shown.map((booking) => (
                <BookingItem
                  key={booking.id}
                  booking={booking}
                  cancellable={isCancellable(booking, now)}
                  isToday={parisDateTime(new Date(booking.startsAt)).date === parisDateTime(now).date}
                  onCancel={() => setToCancel(booking)}
                />
              ))}
            </ul>
          )}
          {tab === 'upcoming' && (
            <WaitlistSection
              entries={entries}
              failed={waitlist.status === 'error'}
              now={now}
              busyEntry={busyEntry}
              onAnswer={(entry, action) => void answer(entry, action)}
              onRetry={waitlist.reload}
            />
          )}
        </TabPanel>
      </div>

      <Dialog
        open={toCancel !== null}
        onClose={() => setToCancel(null)}
        size="sm"
        title="Annuler cette réservation ?"
        description={
          toCancel ? `${describe(toCancel)}. La salle redeviendra libre pour les autres membres.` : undefined
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setToCancel(null)} autoFocus>
            Garder la réservation
          </Button>
          <Button variant="danger" onClick={() => void confirmCancel()} disabled={cancelling}>
            {cancelling ? 'Annulation…' : 'Annuler la réservation'}
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

function BookingItem({
  booking,
  cancellable,
  isToday,
  onCancel,
}: {
  booking: Booking;
  cancellable: boolean;
  isToday: boolean;
  onCancel: () => void;
}) {
  const start = new Date(booking.startsAt);
  const startTime = parisDateTime(start);
  const endTime = parisDateTime(new Date(booking.endsAt));
  const cancelled = booking.cancelledAt !== null;

  return (
    <li>
      <Card className={`flex gap-4 p-4 ${cancelled ? 'opacity-70' : ''}`}>
        <div
          aria-hidden="true"
          className="flex w-14 shrink-0 flex-col items-center justify-center rounded-control bg-surface-muted py-2"
        >
          <span className="text-xl leading-none font-semibold">{dayNumberFormat.format(start)}</span>
          <span className="mt-1 text-xs text-ink-muted uppercase">{monthFormat.format(start).replace('.', '')}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`truncate font-medium ${cancelled ? 'line-through' : ''}`}>{booking.title}</h2>
              {cancelled && <Badge tone="danger">Annulée</Badge>}
              {!cancelled && isToday && <Badge tone="primary">Aujourd’hui</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">
              <span className="first-letter:uppercase">{formatDay(startTime.date)}</span>,{' '}
              {formatMinutes(startTime.minutes)} – {formatMinutes(endTime.minutes)} ·{' '}
              <Link
                href={`/rooms/${booking.room.id}?date=${startTime.date}`}
                className="focus-ring rounded-sm underline-offset-2 hover:underline"
              >
                {booking.room.name}
              </Link>
              {booking.attendees !== null &&
                ` · ${booking.attendees > 1 ? `${booking.attendees} participants` : '1 participant'}`}
            </p>
          </div>
          {cancellable && (
            <Button variant="secondary" size="sm" onClick={onCancel} className="self-start sm:self-center">
              Annuler<span className="sr-only"> la réservation « {booking.title} »</span>
            </Button>
          )}
        </div>
      </Card>
    </li>
  );
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

function WaitlistSection({
  entries,
  failed,
  now,
  busyEntry,
  onAnswer,
  onRetry,
}: {
  entries: WaitlistEntry[];
  failed: boolean;
  now: Date;
  busyEntry: number | null;
  onAnswer: (entry: WaitlistEntry, action: 'confirm' | 'leave') => void;
  onRetry: () => void;
}) {
  if (failed)
    return <ErrorState message="Vos inscriptions sur liste d’attente n’ont pas pu être chargées." onRetry={onRetry} />;
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="my-waitlist" className="mt-6">
      <h2 id="my-waitlist" className="mb-3 text-lg font-semibold tracking-tight">
        Sur liste d’attente
      </h2>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => {
          const offered = canConfirm(entry, now);
          const start = parisDateTime(new Date(entry.startsAt));
          const end = parisDateTime(new Date(entry.endsAt));
          return (
            <li key={entry.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium">{entry.title}</h3>
                    {offered ? <Badge tone="success">Créneau libéré</Badge> : <Badge tone="warning">En attente</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    <span className="first-letter:uppercase">{formatDay(start.date)}</span>,{' '}
                    {formatMinutes(start.minutes)} – {formatMinutes(end.minutes)} · {entry.room.name}
                  </p>
                  {offered && entry.offerExpiresAt && (
                    <p className="mt-1 text-sm">
                      Le créneau s’est libéré : confirmez avant {timeFormat.format(new Date(entry.offerExpiresAt))}.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  {offered && (
                    <Button size="sm" disabled={busyEntry === entry.id} onClick={() => onAnswer(entry, 'confirm')}>
                      Confirmer<span className="sr-only"> la réservation « {entry.title} »</span>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyEntry === entry.id}
                    onClick={() => onAnswer(entry, 'leave')}
                  >
                    {offered ? 'Renoncer' : 'Me retirer'}
                    <span className="sr-only"> de la liste d’attente « {entry.title} »</span>
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <LoadingLabel>Chargement de vos réservations…</LoadingLabel>
      <Skeleton className="mb-4 h-8 w-64" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-card" />
      ))}
    </div>
  );
}
