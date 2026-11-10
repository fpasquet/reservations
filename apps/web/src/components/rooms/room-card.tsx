import Link from 'next/link';
import { floorLabel, seatsLabel } from '@/lib/rooms';
import type { Room } from '@/lib/types';
import { EquipmentList } from '../equipment';
import { Card } from '../ui/card';
import { LayersIcon, UsersIcon } from '../ui/icons';

/** Vignette colorée d'une salle, avec son initiale. */
export function RoomTile({ room, className = 'h-24' }: { room: Room; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-end overflow-hidden p-4 ${className}`}
      style={{ backgroundColor: room.color }}
    >
      <span className="absolute -top-6 -right-2 text-[7rem] leading-none font-bold text-white/15 select-none">
        {room.name.replace(/^(La|Le|Les)\s+/, '').charAt(0)}
      </span>
    </div>
  );
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link href={`/rooms/${room.id}`} className="group focus-ring block h-full rounded-card">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-overlay">
        <RoomTile room={room} />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h2 className="font-semibold tracking-tight group-hover:underline">{room.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{room.description}</p>
          </div>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Capacité</dt>
              <UsersIcon />
              <dd>{seatsLabel(room.capacity)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Étage</dt>
              <LayersIcon />
              <dd>{floorLabel(room.floor)}</dd>
            </div>
          </dl>
          <div className="mt-auto">
            <EquipmentList equipment={room.equipment} />
          </div>
        </div>
      </Card>
    </Link>
  );
}
