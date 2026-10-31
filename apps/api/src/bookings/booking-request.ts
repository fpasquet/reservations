import { DomainError } from '../shared/domain-error.js';
import type { BookingRequest, SeriesRequest } from './booking.js';
import { MAX_WEEKS, MIN_WEEKS } from './series-rules.js';

export const TITLE_MAX_LENGTH = 80;
const ATTENDEES_MAX = 100;
// Le fuseau est obligatoire : une heure sans fuseau serait lue dans celui du serveur.
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const invalid = (field: string, message: string) => new DomainError('INVALID_FIELD', message, field);

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function instant(body: Record<string, unknown>, field: 'startsAt' | 'endsAt'): Date {
  const value = body[field];
  if (typeof value !== 'string' || !INSTANT_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw invalid(field, `${field} must be an ISO 8601 date-time with a time zone`);
  }
  return new Date(value);
}

/** Corps de POST /bookings : `{ roomId, title, attendees?, startsAt, endsAt }`. */
export function parseBookingRequest(body: unknown): BookingRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new DomainError('INVALID_BODY', 'body must be a JSON object');
  }
  const fields = body as Record<string, unknown>;

  const roomId = positiveInteger(fields['roomId']);
  if (roomId === null) throw invalid('roomId', 'roomId must be a positive integer');

  const title = typeof fields['title'] === 'string' ? fields['title'].trim() : '';
  if (title === '') throw invalid('title', 'title is required');
  if (title.length > TITLE_MAX_LENGTH) throw invalid('title', `title must be at most ${TITLE_MAX_LENGTH} characters`);

  let attendees: number | null = null;
  if (fields['attendees'] !== undefined && fields['attendees'] !== null) {
    attendees = positiveInteger(fields['attendees']);
    if (attendees === null || attendees > ATTENDEES_MAX) {
      throw invalid('attendees', `attendees must be an integer between 1 and ${ATTENDEES_MAX}`);
    }
  }

  return { roomId, title, attendees, startsAt: instant(fields, 'startsAt'), endsAt: instant(fields, 'endsAt') };
}

/**
 * Corps de POST /bookings/series : celui d'une réservation, plus `weeks` (2 à 12) ; avec `preview: true`, la série
 * n'est pas créée, l'API répond seulement avec ses occurrences.
 */
export function parseSeriesRequest(body: unknown): { request: SeriesRequest; preview: boolean } {
  const request = parseBookingRequest(body);
  const fields = body as Record<string, unknown>;

  const weeks = fields['weeks'];
  if (typeof weeks !== 'number' || !Number.isInteger(weeks) || weeks < MIN_WEEKS || weeks > MAX_WEEKS) {
    throw invalid('weeks', `weeks must be an integer between ${MIN_WEEKS} and ${MAX_WEEKS}`);
  }
  const preview = fields['preview'];
  if (preview !== undefined && typeof preview !== 'boolean') throw invalid('preview', 'preview must be a boolean');

  return { request: { ...request, weeks }, preview: preview === true };
}

/** Le membre connecté, passé dans l'en-tête `X-Member-Id` (pas d'authentification pour l'instant). */
export function parseMemberHeader(value: string | undefined): number {
  const id = Number(value);
  if (!value || !Number.isInteger(id) || id < 1) {
    throw new DomainError('MISSING_MEMBER', 'X-Member-Id header must identify a member');
  }
  return id;
}
