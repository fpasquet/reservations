'use client';

import { useCallback, useEffect, useState } from 'react';

export type Resource<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'error'; data?: undefined; error: unknown }
  | { status: 'ready'; data: T; error?: undefined };

/**
 * Charge une ressource de l'API, à nouveau quand `key` change ; `key` à null ne charge rien.
 * `reload` recharge sans repasser par l'état de chargement, pour ne pas faire clignoter la page.
 */
export function useResource<T>(key: string | null, load: () => Promise<T>): Resource<T> & { reload: () => void } {
  const [state, setState] = useState<{ key: string | null; resource: Resource<T> }>({
    key,
    resource: { status: 'loading' },
  });
  const [version, setVersion] = useState(0);

  // Remise à l'état de chargement pendant le rendu quand la clé change (pas d'effet en cascade).
  if (state.key !== key) setState({ key, resource: { status: 'loading' } });

  useEffect(() => {
    if (key === null) return;
    let current = true;
    load().then(
      (data) => current && setState({ key, resource: { status: 'ready', data } }),
      (error: unknown) => current && setState({ key, resource: { status: 'error', error } }),
    );
    return () => {
      current = false;
    };
    // `load` change à chaque rendu : la clé dit quand recharger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state.resource, reload };
}
