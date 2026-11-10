import { currentTime } from './clock';

/** L'espace est à Paris : journées et horaires s'affichent en heure de Paris, quel que soit le fuseau du navigateur. */
export const TIME_ZONE = 'Europe/Paris';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function partsOf(instant: Date): Record<string, number> {
  return Object.fromEntries(partsFormat.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
}

/** Écart entre l'heure de Paris et UTC à cet instant, en millisecondes. */
function offsetAt(instant: Date): number {
  const p = partsOf(instant);
  const wallClock = Date.UTC(p['year'] ?? 0, (p['month'] ?? 1) - 1, p['day'], p['hour'], p['minute'], p['second']);
  return wallClock - (instant.getTime() - instant.getMilliseconds());
}

/** Vrai pour une date calendaire valide au format YYYY-MM-DD. */
export function isIsoDate(value: string | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** La date (YYYY-MM-DD) et l'heure (minutes depuis minuit) de cet instant, à Paris. */
export function parisDateTime(instant: Date): { date: string; minutes: number } {
  const p = partsOf(instant);
  const pad = (value: number | undefined) => String(value ?? 0).padStart(2, '0');
  return {
    date: `${p['year']}-${pad(p['month'])}-${pad(p['day'])}`,
    minutes: (p['hour'] ?? 0) * 60 + (p['minute'] ?? 0),
  };
}

/** L'instant qui correspond à cette date et cette heure de Paris (minutes depuis minuit). */
export function parisInstant(date: string, minutes: number): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, 0, minutes);
  // Deux passes : l'écart à retenir est celui de l'instant visé, pas celui de minuit UTC.
  const first = wallClock - offsetAt(new Date(wallClock));
  return new Date(wallClock - offsetAt(new Date(first)));
}

export function todayInParis(now = currentTime()): string {
  return parisDateTime(now).date;
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

// Une date seule n'a pas de fuseau : on la formate à midi UTC pour ne jamais changer de jour.
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);
const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortDayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const yearFormat = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', timeZone: 'UTC' });

/** « jeudi 29 octobre », avec l'année si elle n'est pas celle de `reference`. */
export function formatDay(date: string, reference?: string): string {
  const label = dayFormat.format(atNoon(date));
  return reference && date.slice(0, 4) !== reference.slice(0, 4)
    ? `${label} ${yearFormat.format(atNoon(date))}`
    : label;
}

/** « jeu. 29 oct. » */
export function formatShortDay(date: string): string {
  return shortDayFormat.format(atNoon(date));
}

/** « 9h00 », « 14h30 » */
export function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;
}

/** « 09:30 » → 570 */
export function parseTime(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 570 → « 09:30 » */
export function toTimeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
