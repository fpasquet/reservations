import { isIsoDate } from '../shared/paris-time.js';
import type { ClosedDay } from './closed-day.js';

export const PUBLIC_HOLIDAYS_URL = 'https://calendrier.api.gouv.fr/jours-feries/metropole.json';

/** Les jours fériés de la réponse de l'API (`{ "2026-01-01": "1er janvier", … }`) ; null si elle n'a pas cette forme. */
export function parsePublicHolidays(payload: unknown): ClosedDay[] | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const days: ClosedDay[] = [];
  for (const [date, name] of Object.entries(payload)) {
    if (!isIsoDate(date) || typeof name !== 'string' || name.trim() === '') return null;
    days.push({ date, name: name.trim() });
  }
  return days.length > 0 ? days : null;
}

export async function fetchPublicHolidays(): Promise<unknown> {
  const response = await fetch(PUBLIC_HOLIDAYS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`public holidays API answered ${response.status}`);
  return response.json();
}
