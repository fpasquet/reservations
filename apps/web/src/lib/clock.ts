/**
 * L'heure courante de l'interface : l'heure réelle, ou FAKE_NOW (démos, tickets liés à l'heure), la même que l'API.
 * next.config.ts reprend FAKE_NOW et l'instant réel où l'horloge le vaut (FAKE_NOW_SINCE) ; l'horloge avance ensuite.
 */
export function offsetFrom(fakeNow: string | undefined, since: string | undefined): number {
  if (!fakeNow) return 0;
  const sinceSeconds = Number(since);
  if (!Number.isFinite(sinceSeconds) || sinceSeconds <= 0) return 0;
  return Date.parse(fakeNow) - sinceSeconds * 1000;
}

const offset = offsetFrom(process.env.NEXT_PUBLIC_FAKE_NOW, process.env.NEXT_PUBLIC_FAKE_NOW_SINCE);

/** À utiliser à la place de `new Date()` partout où l'interface compare au présent. */
export function currentTime(): Date {
  return new Date(Date.now() + offset);
}
