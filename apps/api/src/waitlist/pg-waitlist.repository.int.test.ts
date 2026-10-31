import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { parisInstant } from '../shared/paris-time.js';
import { clearTables, insertMember, insertRoom } from '../testing/test-database.js';
import { PgWaitlistRepository } from './pg-waitlist.repository.js';

const db = connect();
const waitlist = new PgWaitlistRepository(db);
const date = '2026-11-03';
const now = new Date('2026-11-02T08:00:00Z');

let serre: number;
let camille: number;
let yanis: number;

const join = (memberId: number, from = 600, to = 660) =>
  waitlist.create(
    {
      roomId: serre,
      memberId,
      title: 'Point d’équipe',
      attendees: null,
      startsAt: parisInstant(date, from),
      endsAt: parisInstant(date, to),
    },
    now,
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
  it('creates an entry with the room and member names, not offered', async () => {
    const entry = await join(camille);
    expect(entry).toMatchObject({
      room: { id: serre, name: 'La Serre' },
      member: { id: camille, fullName: 'Camille Martin' },
      offeredAt: null,
      offerExpiresAt: null,
    });
  });

  it('refuses the same member twice on the same slot', async () => {
    await join(camille);
    await expect(join(camille)).rejects.toThrow();
  });

  it('lists every entry in order of registration', async () => {
    const first = await join(yanis);
    const second = await join(camille);
    expect((await waitlist.listAll()).map((entry) => entry.id)).toEqual([first.id, second.id]);
  });

  it('lists the entries of one member', async () => {
    await join(yanis);
    const mine = await join(camille);
    expect((await waitlist.listByMember(camille)).map((entry) => entry.id)).toEqual([mine.id]);
  });

  it('records an offer', async () => {
    const entry = await join(camille);
    const expiresAt = new Date(now.getTime() + 30 * 60_000);
    expect(await waitlist.offer(entry.id, now, expiresAt)).toMatchObject({
      offeredAt: now.toISOString(),
      offerExpiresAt: expiresAt.toISOString(),
    });
  });

  it('removes an entry', async () => {
    const entry = await join(camille);
    await waitlist.remove(entry.id);
    expect(await waitlist.get(entry.id)).toBeNull();
  });
});
