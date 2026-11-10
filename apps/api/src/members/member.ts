export interface Member {
  id: number;
  fullName: string;
  email: string;
  /** Entreprise ou activité du membre, affichée sous son nom. */
  company: string;
}
