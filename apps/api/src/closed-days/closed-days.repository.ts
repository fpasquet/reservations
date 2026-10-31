import type { ClosedDay } from './closed-day.js';

export const CLOSED_DAYS_REPOSITORY = Symbol('CLOSED_DAYS_REPOSITORY');

export interface ClosedDaysRepository {
  find(date: string): Promise<ClosedDay | null>;
  /** Remplace d'un bloc les jours fériés connus ; les autres jours de fermeture restent. */
  replacePublicHolidays(days: ClosedDay[]): Promise<void>;
}
