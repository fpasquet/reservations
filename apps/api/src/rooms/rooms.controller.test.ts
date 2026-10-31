import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../testing/test-app.js';

describe('rooms', () => {
  let api: TestApp;

  beforeEach(async () => {
    api = await createTestApp(new Date('2026-11-02T08:00:00Z'));
  });

  afterEach(async () => {
    await api.app.close();
  });

  it('lists the rooms by floor, then by name', async () => {
    const response = await api.http.get('/rooms');
    expect(response.status).toBe(200);
    expect((response.body as { name: string }[]).map((room) => room.name)).toEqual(['Atelier', 'Cabine 1', 'La Serre']);
  });

  it('filters on the capacity and the equipment', async () => {
    const response = await api.http.get('/rooms?capacity=4&equipment=screen,whiteboard');
    expect((response.body as { name: string }[]).map((room) => room.name)).toEqual(['Atelier', 'La Serre']);
  });

  it('answers 400 with an error code on an invalid filter', async () => {
    const response = await api.http.get('/rooms?capacity=-2');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'INVALID_FIELD', field: 'capacity' });
  });

  it('gives one room, or 404', async () => {
    expect((await api.http.get('/rooms/2')).body).toMatchObject({ name: 'Cabine 1', capacity: 2 });
    expect((await api.http.get('/rooms/99')).body).toMatchObject({ statusCode: 404, code: 'ROOM_NOT_FOUND' });
    expect((await api.http.get('/rooms/salle')).status).toBe(404);
  });
});
