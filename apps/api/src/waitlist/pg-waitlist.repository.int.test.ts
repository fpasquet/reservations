import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { parisInstant } from '../shared/paris-time.js';
import { clearTables, insertMember, insertRoom } from '../testing/test-database.js';
import { PgWaitlistRepository } from './pg-waitlist.repository.js';

const db = connect();
const waitlist = new PgWaitlistRepository(db);
const date = '2026-11-03';

let serre: number;
let camille: number;
let yanis: number;

const join = (memberId: number, at: Date) =>
  waitlist.create(
    {
      roomId: serre,
      memberId,
      title: 'Point d’équipe',
      attendees: 4,
      startsAt: parisInstant(date, 10 * 60),
      endsAt: parisInstant(date, 11 * 60),
    },
    at,
  );

beforeEach(async () => {
  await clearTables(db);
  serre = await insertRoom(db, { name: 'La Serre', capacity: 8 });
  camille = await insertMember(db, 'Camille Martin');
  yanis = await insertMember(db, 'Yanis Benali');
});

afterAll(async () => {
  await db.end();
});

describe('PgWaitlistRepository', () => {
  it('stores an entry with its room and member, waiting', async () => {
    const entry = await join(camille, new Date('2026-11-02T08:00:00Z'));
    expect(entry).toMatchObject({
      room: { id: serre, name: 'La Serre' },
      member: { id: camille, fullName: 'Camille Martin' },
      attendees: 4,
      startsAt: '2026-11-03T09:00:00.000Z',
      createdAt: '2026-11-02T08:00:00.000Z',
      offeredAt: null,
      offerExpiresAt: null,
    });
  });

  it('lists in order of sign-up, and by member', async () => {
    await join(yanis, new Date('2026-11-02T08:00:00Z'));
    await join(camille, new Date('2026-11-02T07:00:00Z'));
    expect((await waitlist.list()).map((entry) => entry.member.id)).toEqual([camille, yanis]);
    expect((await waitlist.listByMember(yanis)).map((entry) => entry.member.id)).toEqual([yanis]);
  });

  it('records an offer', async () => {
    const { id } = await join(camille, new Date('2026-11-02T08:00:00Z'));
    const offered = await waitlist.offer(id, new Date('2026-11-02T09:00:00Z'), new Date('2026-11-02T09:30:00Z'));
    expect(offered).toMatchObject({
      offeredAt: '2026-11-02T09:00:00.000Z',
      offerExpiresAt: '2026-11-02T09:30:00.000Z',
    });
  });

  it('removes an entry', async () => {
    const { id } = await join(camille, new Date('2026-11-02T08:00:00Z'));
    await waitlist.remove(id);
    expect(await waitlist.get(id)).toBeNull();
  });
});
