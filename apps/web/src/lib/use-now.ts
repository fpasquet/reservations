'use client';

import { useEffect, useState } from 'react';
import { currentTime } from './clock';

/** L'heure courante, mise à jour chaque minute (ligne « maintenant » du planning, créneaux passés). */
export function useNow(): Date {
  const [now, setNow] = useState(currentTime);
  useEffect(() => {
    const timer = setInterval(() => setNow(currentTime()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
