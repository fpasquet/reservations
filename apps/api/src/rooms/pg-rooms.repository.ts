import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { Equipment, Room, RoomFilters } from './room.js';
import type { RoomsRepository } from './rooms.repository.js';

interface RoomRow {
  id: number;
  name: string;
  floor: number;
  capacity: number;
  equipment: Equipment[];
  color: string;
  description: string;
  hourly_rate_cents: number;
}

const COLUMNS = 'id, name, floor, capacity, equipment, color, description, hourly_rate_cents';

const toRoom = ({ hourly_rate_cents, ...row }: RoomRow): Room => ({ ...row, hourlyRateCents: hourly_rate_cents });

@Injectable()
export class PgRoomsRepository implements RoomsRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async list({ minCapacity, equipment }: RoomFilters): Promise<Room[]> {
    const { rows } = await this.db.query<RoomRow>(
      `select ${COLUMNS} from room
       where capacity >= $1 and equipment @> $2::text[]
       order by floor, name`,
      [minCapacity ?? 1, equipment],
    );
    return rows.map(toRoom);
  }

  async get(id: number): Promise<Room | null> {
    const { rows } = await this.db.query<RoomRow>(`select ${COLUMNS} from room where id = $1`, [id]);
    return rows[0] ? toRoom(rows[0]) : null;
  }
}
