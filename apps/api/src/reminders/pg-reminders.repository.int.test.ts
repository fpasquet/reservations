import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { clearTables, insertMember } from '../testing/test-database.js';
import { PgRemindersRepository } from './pg-reminders.repository.js';

const db = connect();
const reminders = new PgRemindersRepository(db);
const sentAt = new Date('2026-11-05T17:00:00Z');

beforeEach(async () => {
  await clearTables(db);
  await insertMember(db, 'Camille Martin');
  await insertMember(db, 'Yanis Benali');
});

afterAll(async () => {
  await db.end();
});

describe('PgRemindersRepository', () => {
  it('claims a reminder once per member and day', async () => {
    expect(await reminders.claim(1, '2026-11-06', sentAt)).toBe(true);
    expect(await reminders.claim(1, '2026-11-06', sentAt)).toBe(false);
    expect(await reminders.claim(2, '2026-11-06', sentAt)).toBe(true);
    expect(await reminders.claim(1, '2026-11-07', sentAt)).toBe(true);
  });

  it('can claim again after a release', async () => {
    await reminders.claim(1, '2026-11-06', sentAt);
    await reminders.release(1, '2026-11-06');
    expect(await reminders.claim(1, '2026-11-06', sentAt)).toBe(true);
  });
});
