import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { DATABASE } from '../database.js';
import type { Member, Plan } from './member.js';
import type { MembersRepository } from './members.repository.js';

interface MemberRow {
  id: number;
  full_name: string;
  email: string;
  company: string;
  plan: Plan;
}

const COLUMNS = 'id, full_name, email, company, plan';

const toMember = (row: MemberRow): Member => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  company: row.company,
  plan: row.plan,
});

@Injectable()
export class PgMembersRepository implements MembersRepository {
  constructor(@Inject(DATABASE) private readonly db: pg.Pool) {}

  async list(): Promise<Member[]> {
    const { rows } = await this.db.query<MemberRow>(`select ${COLUMNS} from member order by full_name`);
    return rows.map(toMember);
  }

  async get(id: number): Promise<Member | null> {
    const { rows } = await this.db.query<MemberRow>(`select ${COLUMNS} from member where id = $1`, [id]);
    return rows[0] ? toMember(rows[0]) : null;
  }
}
