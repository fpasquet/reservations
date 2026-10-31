import type { Credit, Plan } from './types';

export const PLAN_LABELS: Record<Plan, string> = { nomade: 'Nomade', resident: 'Résident', equipe: 'Équipe' };

const hoursFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** « 7,5 h » */
export const formatHours = (hours: number): string => `${hoursFormat.format(hours)} h`;

/** Le texte de l'en-tête : les heures restantes ce mois-ci, ou la formule illimitée. */
export function creditLabel(credit: Credit): string {
  if (credit.remainingHours === null) return 'Heures illimitées';
  return `${formatHours(credit.remainingHours)} restantes ce mois-ci`;
}
