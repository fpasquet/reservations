'use client';

import { creditLabel, PLAN_LABELS } from '@/lib/credit';
import { useMember } from './member-context';
import { Badge } from './ui/badge';

/** Les heures de salle restantes du membre connecté, dans l'en-tête. */
export function CreditBadge() {
  const { member, credit } = useMember();
  if (!member) return null;

  if (credit.status === 'loading') {
    return <Badge aria-live="polite">Heures : chargement…</Badge>;
  }
  if (credit.status === 'error') {
    return (
      <Badge tone="warning" role="status">
        Heures indisponibles
      </Badge>
    );
  }

  const { remainingHours } = credit.data;
  const tone =
    remainingHours === null ? 'primary' : remainingHours === 0 ? 'danger' : remainingHours <= 2 ? 'warning' : 'success';
  return (
    <Badge tone={tone} role="status" title={`Formule ${PLAN_LABELS[credit.data.plan]}`}>
      <span className="font-semibold">{PLAN_LABELS[credit.data.plan]}</span>
      <span aria-hidden="true">·</span>
      {creditLabel(credit.data)}
    </Badge>
  );
}
