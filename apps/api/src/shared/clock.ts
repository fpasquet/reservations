export const CLOCK = Symbol('CLOCK');

/** L'heure courante, remplaçable dans les tests. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

// Fuseau obligatoire, comme pour les dates échangées par l'API.
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Horloge décalée : elle vaut `fakeNow` à l'instant réel `since` (secondes depuis 1970), puis avance normalement.
 * Un décalage plutôt qu'un instant figé, pour qu'une réservation « en cours » finisse par se terminer.
 */
export function offsetClock(fakeNow: string, since: number, realNow: () => number = Date.now): Clock {
  if (!INSTANT_PATTERN.test(fakeNow) || Number.isNaN(Date.parse(fakeNow))) {
    throw new Error(`FAKE_NOW must be an ISO 8601 date-time with a time zone, got "${fakeNow}"`);
  }
  const offset = Date.parse(fakeNow) - since * 1000;
  return { now: () => new Date(realNow() + offset) };
}

/**
 * L'horloge de l'API et du seed : l'heure réelle, ou FAKE_NOW (démos, tickets liés à l'heure).
 * FAKE_NOW_SINCE, posé par docker-compose.yml au démarrage du conteneur, garde la même heure à chaque rechargement
 * du code ; sans lui, l'horloge part de FAKE_NOW au démarrage du processus.
 */
export function clockFromEnv(env: NodeJS.ProcessEnv = process.env): Clock {
  const fakeNow = env['FAKE_NOW']?.trim();
  if (!fakeNow) return systemClock;
  const since = Number(env['FAKE_NOW_SINCE']);
  return offsetClock(fakeNow, Number.isInteger(since) && since > 0 ? since : Date.now() / 1000);
}
