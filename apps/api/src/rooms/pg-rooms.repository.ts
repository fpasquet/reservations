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
}

const COLUMNS = 'id, name, floor, capacity, equipment, color, description';

// Équivalent SQL de `normalizeSearch` pour les lettres accentuées du français, sans extension Postgres.
const ACCENTED = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ';
const PLAIN = 'aaaaaaceeeeiiiinooooouuuuyy';

const toRoom = (row: RoomRow): Room => ({ ...row });

@Injectable()
export class PgRoomsRepository implements RoomsRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async list({ minCapacity, equipment, search }: RoomFilters): Promise<Room[]> {
    // strpos plutôt que like : le fragment n'a ni joker ni échappement à gérer.
    const { rows } = await this.db.query<RoomRow>(
      `select ${COLUMNS} from room
       where capacity >= $1 and equipment @> $2::text[]
         and strpos(translate(lower(name), '${ACCENTED}', '${PLAIN}'), $3) > 0
       order by floor, name`,
      [minCapacity ?? 1, equipment, search ?? ''],
    );
    return rows.map(toRoom);
  }

  async get(id: number): Promise<Room | null> {
    const { rows } = await this.db.query<RoomRow>(`select ${COLUMNS} from room where id = $1`, [id]);
    return rows[0] ? toRoom(rows[0]) : null;
  }
}
