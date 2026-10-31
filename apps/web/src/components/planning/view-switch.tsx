'use client';

import { type Tab, Tabs } from '../ui/tabs';

export type PlanningView = 'day' | 'week';

const TABS: Tab<PlanningView>[] = [
  { id: 'day', label: 'Jour' },
  { id: 'week', label: 'Semaine' },
];

export const planningPanelId = (view: PlanningView) => `planning-view-panel-${view}`;

/** Sélecteur Jour / Semaine du planning. */
export function ViewSwitch({ value, onChange }: { value: PlanningView; onChange: (view: PlanningView) => void }) {
  return <Tabs idPrefix="planning-view" label="Affichage du planning" tabs={TABS} value={value} onChange={onChange} />;
}
