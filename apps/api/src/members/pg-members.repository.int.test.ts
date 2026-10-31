import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { clearTables, insertMember } from '../testing/test-database.js';
import { PgMembersRepository } from './pg-members.repository.js';

const db = connect();
const members = new PgMembersRepository(db);

beforeEach(async () => {
  await clearTables(db);
  await insertMember(db, 'Yanis Benali', 'Développeur indépendant');
  await insertMember(db, 'Camille Martin', 'Studio Ondes');
});

afterAll(async () => {
  await db.end();
});

describe('PgMembersRepository', () => {
  it('lists the members by name', async () => {
    expect((await members.list()).map((member) => member.fullName)).toEqual(['Camille Martin', 'Yanis Benali']);
  });

  it('gives one member with the email and the company, or null', async () => {
    expect(await members.get(1)).toEqual({
      id: 1,
      fullName: 'Yanis Benali',
      email: 'yanis.benali@example.com',
      company: 'Développeur indépendant',
    });
    expect(await members.get(99)).toBeNull();
  });
});
