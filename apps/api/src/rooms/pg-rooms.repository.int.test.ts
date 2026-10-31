import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { connect } from '../database.js';
import { clearTables, insertRoom } from '../testing/test-database.js';
import { PgRoomsRepository } from './pg-rooms.repository.js';

const db = connect();
const rooms = new PgRoomsRepository(db);

beforeEach(async () => {
  await clearTables(db);
  await insertRoom(db, { name: 'La Serre', floor: 1, capacity: 8, equipment: ['screen', 'whiteboard'] });
  await insertRoom(db, { name: 'Cabine 1', floor: 0, capacity: 2, equipment: ['videoconference'] });
  await insertRoom(db, {
    name: 'Atelier',
    floor: 0,
    capacity: 14,
    equipment: ['screen', 'whiteboard', 'videoconference'],
  });
});

afterAll(async () => {
  await db.end();
});

describe('PgRoomsRepository', () => {
  it('lists the rooms by floor, then by name', async () => {
    expect((await rooms.list({ equipment: [] })).map((room) => room.name)).toEqual(['Atelier', 'Cabine 1', 'La Serre']);
  });

  it('keeps the rooms with at least the capacity asked', async () => {
    expect((await rooms.list({ minCapacity: 8, equipment: [] })).map((room) => room.name)).toEqual([
      'Atelier',
      'La Serre',
    ]);
  });

  it('keeps the rooms with every equipment asked', async () => {
    const found = await rooms.list({ equipment: ['screen', 'videoconference'] });
    expect(found.map((room) => room.name)).toEqual(['Atelier']);
    expect(found[0]).toMatchObject({ floor: 0, capacity: 14, equipment: ['screen', 'whiteboard', 'videoconference'] });
  });

  it('combines both filters', async () => {
    expect(await rooms.list({ minCapacity: 3, equipment: ['videoconference'] })).toHaveLength(1);
    expect(await rooms.list({ minCapacity: 20, equipment: [] })).toEqual([]);
  });

  it('gives one room, or null', async () => {
    expect(await rooms.get(2)).toMatchObject({ id: 2, name: 'Cabine 1', color: '#5b8a72', description: '' });
    expect(await rooms.get(99)).toBeNull();
  });
});
