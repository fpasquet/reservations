/** L'espace est à Paris : les horaires, les journées et les créneaux s'entendent en heure de Paris. */
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

interface ParisParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsOf(instant: Date): ParisParts {
  const parts = Object.fromEntries(partsFormat.formatToParts(instant).map((part) => [part.type, part.value]));
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    hour: Number(parts['hour']),
    minute: Number(parts['minute']),
    second: Number(parts['second']),
  };
}

/** Écart entre l'heure de Paris et UTC à cet instant, en millisecondes (1 h l'hiver, 2 h l'été). */
function offsetAt(instant: Date): number {
  const p = partsOf(instant);
  const wallClock = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClock - (instant.getTime() - instant.getMilliseconds());
}

/** Vrai pour une date calendaire valide au format YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** La date (YYYY-MM-DD) et l'heure (en minutes depuis minuit) de cet instant, à Paris. */
export function parisDateTime(instant: Date): { date: string; minutes: number } {
  const p = partsOf(instant);
  const date = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { date, minutes: p.hour * 60 + p.minute };
}

/** L'instant qui correspond à cette date et cette heure de Paris (minutes depuis minuit). */
export function parisInstant(date: string, minutes: number): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day, 0, minutes);
  // Deux passes : l'écart à retenir est celui de l'instant visé, pas celui de minuit UTC.
  const first = wallClock - offsetAt(new Date(wallClock));
  return new Date(wallClock - offsetAt(new Date(first)));
}

/** Le jour qui suit cette date. */
export function nextDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Début et fin (exclue) d'une journée de Paris, en instants. */
export function parisDayRange(date: string): { from: Date; to: Date } {
  return { from: parisInstant(date, 0), to: parisInstant(nextDate(date), 0) };
}
