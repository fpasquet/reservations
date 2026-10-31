import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../testing/test-app.js';

// Novembre : Paris est à UTC+1.
const at = (date: string, time: string) => `${date}T${time}:00+01:00`;
const tuesday = '2026-11-03';

function bookingOf(overrides: Record<string, unknown> = {}) {
  return {
    roomId: 1,
    title: 'Point hebdo',
    attendees: 5,
    startsAt: at(tuesday, '10:00'),
    endsAt: at(tuesday, '11:00'),
    ...overrides,
  };
}

describe('bookings', () => {
  let api: TestApp;

  const book = (overrides: Record<string, unknown> = {}, memberId = '1') =>
    api.http.post('/bookings').set('X-Member-Id', memberId).send(bookingOf(overrides));

  beforeEach(async () => {
    api = await createTestApp(new Date(at('2026-11-02', '09:10')));
  });

  afterEach(async () => {
    await api.app.close();
  });

  describe('POST /bookings', () => {
    it('books a room for the member', async () => {
      const response = await book();
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        room: { id: 1, name: 'La Serre' },
        member: { id: 1, fullName: 'Camille Martin' },
        title: 'Point hebdo',
        attendees: 5,
        startsAt: '2026-11-03T09:00:00.000Z',
        endsAt: '2026-11-03T10:00:00.000Z',
        cancelledAt: null,
      });
    });

    it('refuses a slot that overlaps another booking of the same room', async () => {
      await book();
      const response = await book({ startsAt: at(tuesday, '10:30'), endsAt: at(tuesday, '11:30') }, '2');
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'ROOM_ALREADY_BOOKED', field: 'startsAt' });
    });

    it('accepts a booking that starts when the previous one ends', async () => {
      await book();
      const response = await book({ startsAt: at(tuesday, '11:00'), endsAt: at(tuesday, '12:00') }, '2');
      expect(response.status).toBe(201);
    });

    it('accepts the same slot in another room', async () => {
      await book();
      expect((await book({ roomId: 3 })).status).toBe(201);
    });

    it('frees the slot of a cancelled booking', async () => {
      const first = await book();
      await api.http.delete(`/bookings/${(first.body as { id: number }).id}`).set('X-Member-Id', '1');
      expect((await book({}, '2')).status).toBe(201);
    });

    it('answers 400 with the rule that refuses the booking', async () => {
      const response = await book({ attendees: 9 });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        code: 'OVER_CAPACITY',
        message: 'La Serre seats at most 8 people',
        field: 'attendees',
      });
    });

    it('requires a known member and a known room', async () => {
      expect((await api.http.post('/bookings').send(bookingOf())).body).toMatchObject({ code: 'MISSING_MEMBER' });
      expect((await book({}, '42')).body).toMatchObject({ code: 'MEMBER_NOT_FOUND' });
      expect((await book({ roomId: 42 })).body).toMatchObject({ code: 'ROOM_NOT_FOUND', field: 'roomId' });
    });
  });

  describe('GET /bookings', () => {
    it('gives the planning of a day', async () => {
      await book();
      await book({ startsAt: at('2026-11-04', '10:00'), endsAt: at('2026-11-04', '11:00') });
      const response = await api.http.get(`/bookings?date=${tuesday}`);
      expect(response.status).toBe(200);
      expect((response.body as { startsAt: string }[]).map((booking) => booking.startsAt)).toEqual([
        '2026-11-03T09:00:00.000Z',
      ]);
    });

    it('narrows the planning to one room', async () => {
      await book();
      await book({ roomId: 3 });
      const response = await api.http.get(`/bookings?date=${tuesday}&roomId=3`);
      expect((response.body as { room: { id: number } }[]).map((booking) => booking.room.id)).toEqual([3]);
    });

    it('gives the bookings of a member', async () => {
      await book();
      await book({ roomId: 3 }, '2');
      const response = await api.http.get('/bookings?memberId=2');
      expect((response.body as { member: { id: number } }[]).map((booking) => booking.member.id)).toEqual([2]);
    });

    it('requires a valid filter', async () => {
      expect((await api.http.get('/bookings')).body).toMatchObject({ code: 'MISSING_FILTER' });
      expect((await api.http.get('/bookings?date=2026-13-01')).body).toMatchObject({ code: 'INVALID_DATE' });
      expect((await api.http.get('/bookings?memberId=me')).body).toMatchObject({ field: 'memberId' });
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('cancels the booking and keeps it', async () => {
      const created = await book();
      const id = (created.body as { id: number }).id;
      const response = await api.http.delete(`/bookings/${id}`).set('X-Member-Id', '1');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id, cancelledAt: '2026-11-02T08:10:00.000Z' });
      expect(api.bookings.bookings).toHaveLength(1);
    });

    it('only lets the member who booked cancel', async () => {
      const created = await book();
      const response = await api.http
        .delete(`/bookings/${(created.body as { id: number }).id}`)
        .set('X-Member-Id', '2');
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'NOT_YOUR_BOOKING' });
    });

    it('refuses once the booking has started', async () => {
      const created = await book();
      api.clock.current = new Date(at(tuesday, '10:05'));
      const response = await api.http
        .delete(`/bookings/${(created.body as { id: number }).id}`)
        .set('X-Member-Id', '1');
      expect(response.body).toMatchObject({ statusCode: 400, code: 'ALREADY_STARTED' });
    });

    it('answers 404 for an unknown booking', async () => {
      expect((await api.http.delete('/bookings/99').set('X-Member-Id', '1')).status).toBe(404);
    });
  });
});
