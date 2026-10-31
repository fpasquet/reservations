export const PLANS = ['nomade', 'resident', 'equipe'] as const;
export type Plan = (typeof PLANS)[number];

export interface Member {
  id: number;
  fullName: string;
  email: string;
  /** Entreprise ou activité du membre, affichée sous son nom. */
  company: string;
  plan: Plan;
}
