import type { Booking } from '../bookings/booking.js';
import type { Member } from '../members/member.js';
import { TIME_ZONE } from '../shared/paris-time.js';
import type { Email } from './mailer.js';

const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hours = (booking: Booking) =>
  `${timeFormat.format(new Date(booking.startsAt))} – ${timeFormat.format(new Date(booking.endsAt))}`;

/** L'e-mail qui récapitule les réservations d'un membre le lendemain ; `bookings` n'est jamais vide. */
export function reminderEmail(member: Member, bookings: Booking[], appUrl: string): Email {
  const day = dayFormat.format(new Date(bookings[0]!.startsAt));
  const link = `${appUrl.replace(/\/$/, '')}/my-bookings`;
  const single = bookings.length === 1;
  const subject = single
    ? 'Rappel : votre réservation de demain'
    : `Rappel : vos ${bookings.length} réservations de demain`;
  const intro = `Voici ${single ? 'votre réservation' : 'vos réservations'} de demain, ${day} :`;

  const text = [
    `Bonjour ${member.fullName},`,
    '',
    intro,
    '',
    ...bookings.map((booking) => `- ${hours(booking)} · ${booking.room.name} · ${booking.title}`),
    '',
    `Pour annuler (avant le début de la réservation) : ${link}`,
    '',
    'La Verrière',
  ].join('\n');

  const items = bookings
    .map(
      (booking) =>
        `<li><strong>${hours(booking)}</strong> · ${escapeHtml(booking.room.name)} · ${escapeHtml(booking.title)}</li>`,
    )
    .join('');
  const html = [
    `<p>Bonjour ${escapeHtml(member.fullName)},</p>`,
    `<p>${intro}</p>`,
    `<ul>${items}</ul>`,
    `<p><a href="${escapeHtml(link)}">Annuler une réservation</a> (avant son début)</p>`,
    '<p>La Verrière</p>',
  ].join('\n');

  return { to: member.email, subject, text, html };
}
