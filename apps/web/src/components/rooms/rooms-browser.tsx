'use client';

import { useState } from 'react';
import { getRooms } from '@/lib/api';
import { messageFor } from '@/lib/error-messages';
import { EQUIPMENT_LABELS } from '@/lib/rooms';
import { EQUIPMENT, type Equipment } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { EQUIPMENT_ICONS } from '../equipment';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../ui/cn';
import { EmptyState, ErrorState, LoadingLabel, Skeleton } from '../ui/feedback';
import { LayersIcon } from '../ui/icons';
import { Label } from '../ui/input';
import { Select } from '../ui/select';
import { RoomCard } from './room-card';

const CAPACITIES = [2, 4, 6, 10, 15];

export function RoomsBrowser() {
  const [capacity, setCapacity] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const rooms = useResource(`rooms:${capacity ?? ''}:${equipment.join(',')}`, () =>
    getRooms({ capacity: capacity ?? undefined, equipment }),
  );
  const filtered = capacity !== null || equipment.length > 0;

  const toggle = (item: Equipment) =>
    setEquipment((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : EQUIPMENT.filter((value) => value === item || current.includes(value)),
    );

  const clear = () => {
    setCapacity(null);
    setEquipment([]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salles</h1>
        <p className="mt-1 text-ink-muted">Neuf espaces, de la cabine pour un appel au salon pour vingt personnes.</p>
      </div>

      <Card className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5 md:w-52">
          <Label htmlFor="rooms-capacity">Capacité</Label>
          <Select
            id="rooms-capacity"
            value={capacity ?? ''}
            onChange={(event) => setCapacity(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Toutes les tailles</option>
            {CAPACITIES.map((value) => (
              <option key={value} value={value}>
                {value} personnes ou plus
              </option>
            ))}
          </Select>
        </div>
        <fieldset className="flex-1">
          <legend className="mb-1.5 text-sm font-medium">Équipements</legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((item) => {
              const Icon = EQUIPMENT_ICONS[item];
              const pressed = equipment.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => toggle(item)}
                  className={cn(
                    'focus-ring inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 text-sm font-medium transition-colors',
                    pressed
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border-strong bg-surface text-ink-muted hover:text-ink',
                  )}
                >
                  <Icon />
                  {EQUIPMENT_LABELS[item]}
                </button>
              );
            })}
          </div>
        </fieldset>
        {filtered && (
          <Button variant="ghost" onClick={clear}>
            Effacer les filtres
          </Button>
        )}
      </Card>

      <p aria-live="polite" className="text-sm text-ink-muted">
        {rooms.status === 'ready' &&
          (rooms.data.length > 1 ? `${rooms.data.length} salles` : `${rooms.data.length} salle`)}
      </p>

      {rooms.status === 'error' ? (
        <ErrorState message={messageFor(rooms.error)} onRetry={rooms.reload} />
      ) : rooms.status === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <LoadingLabel>Chargement des salles…</LoadingLabel>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-72 rounded-card" />
          ))}
        </div>
      ) : rooms.data.length === 0 ? (
        <EmptyState
          icon={<LayersIcon className="size-6" />}
          title="Aucune salle ne correspond"
          description="Essayez une capacité plus petite ou moins d’équipements."
          action={
            <Button variant="secondary" onClick={clear}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.data.map((room) => (
            <li key={room.id}>
              <RoomCard room={room} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
