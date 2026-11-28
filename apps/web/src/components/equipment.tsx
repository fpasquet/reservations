import type { ComponentType, SVGProps } from 'react';
import { EQUIPMENT_LABELS } from '@/lib/rooms';
import type { Equipment } from '@/lib/types';
import { AccessibleIcon, PhoneIcon, ScreenIcon, VideoIcon, WhiteboardIcon } from './ui/icons';

export const EQUIPMENT_ICONS: Record<Equipment, ComponentType<SVGProps<SVGSVGElement>>> = {
  screen: ScreenIcon,
  videoconference: VideoIcon,
  whiteboard: WhiteboardIcon,
  speakerphone: PhoneIcon,
  step_free_access: AccessibleIcon,
};

export function EquipmentList({ equipment }: { equipment: Equipment[] }) {
  if (equipment.length === 0) return null;
  return (
    <ul aria-label="Équipements" className="flex flex-wrap gap-1.5">
      {equipment.map((item) => {
        const Icon = EQUIPMENT_ICONS[item];
        return (
          <li
            key={item}
            className="inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-muted"
          >
            <Icon className="size-3.5" />
            {EQUIPMENT_LABELS[item]}
          </li>
        );
      })}
    </ul>
  );
}
