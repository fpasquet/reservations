'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { getMembers } from '@/lib/api';
import type { Member } from '@/lib/types';
import { type Resource, useResource } from '@/lib/use-resource';

// Pas encore d'authentification : le membre se choisit dans l'en-tête et reste mémorisé dans ce navigateur.
const STORAGE_KEY = 'reservations.member-id';
const CHANGE_EVENT = 'reservations:member-change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface MemberContextValue {
  members: Resource<Member[]>;
  /** Le membre connecté, ou null s'il n'a pas encore choisi. */
  member: Member | null;
  selectMember: (id: number | null) => void;
}

const MemberContext = createContext<MemberContextValue | null>(null);

export function MemberProvider({ children }: { children: ReactNode }) {
  const members = useResource('members', getMembers);
  const storedId = useSyncExternalStore(subscribe, readStoredId, () => null);

  const selectMember = useCallback((id: number | null) => {
    try {
      if (id === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la page seulement.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const member = members.data?.find((candidate) => String(candidate.id) === storedId) ?? null;
  const value = useMemo(() => ({ members, member, selectMember }), [members, member, selectMember]);
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMember(): MemberContextValue {
  const context = useContext(MemberContext);
  if (!context) throw new Error('useMember must be used inside a MemberProvider');
  return context;
}

/** « CM » pour Camille Martin. */
export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
