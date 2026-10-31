import { DomainError } from '../shared/domain-error.js';
import { parisDateTime, parisInstant } from '../shared/paris-time.js';
import type { Plan } from './member.js';

const MINUTE = 60_000;

/** Heures de salle par mois de chaque formule (docs/reglement.md, § 2) ; null : illimité. */
export const MONTHLY_HOURS: Record<Plan, number | null> = { nomade: 10, resident: 40, equipe: null };

/** Le crédit d'un membre pour un mois de Paris. */
export interface Credit {
  plan: Plan;
  /** Le mois, au format YYYY-MM. */
  month: string;
  /** Heures comprises dans la formule, null si elle est illimitée. */
  monthlyHours: number | null;
  usedHours: number;
  /** Heures restantes, null si la formule est illimitée. */
  remainingHours: number | null;
}

interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/** Le mois de cet instant : il commence le 1er à 0h00 à Paris ; `to` est exclu. */
export function parisMonthRange(instant: Date): { month: string; from: Date; to: Date } {
  const month = parisDateTime(instant).date.slice(0, 7);
  const [year = 0, number = 1] = month.split('-').map(Number);
  const following = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
  return { month, from: parisInstant(`${month}-01`, 0), to: parisInstant(`${following}-01`, 0) };
}

/** Les minutes consommées par ces créneaux, qui sont ceux des réservations non annulées. */
export function usedMinutes(slots: Slot[]): number {
  return slots.reduce((total, slot) => total + (slot.endsAt.getTime() - slot.startsAt.getTime()) / MINUTE, 0);
}

export function creditOf(plan: Plan, instant: Date, usedInMonth: number): Credit {
  const monthlyHours = MONTHLY_HOURS[plan];
  const usedHours = usedInMonth / 60;
  return {
    plan,
    month: parisMonthRange(instant).month,
    monthlyHours,
    usedHours,
    remainingHours: monthlyHours === null ? null : Math.max(0, monthlyHours - usedHours),
  };
}

/** La réservation tient dans les heures restantes du mois où elle commence. */
export function checkCredit(plan: Plan, requested: Slot, usedInMonth: number): void {
  const monthlyHours = MONTHLY_HOURS[plan];
  if (monthlyHours === null) return;
  if (usedInMonth + usedMinutes([requested]) > monthlyHours * 60) {
    throw new DomainError('CREDIT_EXCEEDED', `the ${plan} plan includes ${monthlyHours} hours of rooms per month`);
  }
}
