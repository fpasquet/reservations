export const REMINDERS_REPOSITORY = Symbol('REMINDERS_REPOSITORY');

export interface RemindersRepository {
  /** Réserve le rappel de ce membre pour ce jour (YYYY-MM-DD) ; faux s'il l'est déjà, donc déjà envoyé. */
  claim(memberId: number, day: string, at: Date): Promise<boolean>;
  /** Annule `claim` quand l'envoi a échoué, pour réessayer. */
  release(memberId: number, day: string): Promise<void>;
}
