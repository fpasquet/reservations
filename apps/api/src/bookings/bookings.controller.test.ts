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

  describe('hours credit', () => {
    const wednesday = '2026-11-04';
    const thursday = '2026-11-05';
    const day = (date: string, from: string, to: string) => ({ startsAt: at(date, from), endsAt: at(date, to) });
    // Yanis (membre 2) est Nomade : 10 h par mois.
    const fillNomadeCredit = async () => {
      await book(day(tuesday, '09:00', '13:00'), '2');
      await book(day(wednesday, '09:00', '13:00'), '2');
      await book(day(thursday, '09:00', '11:00'), '2');
    };
    const credit = (memberId: number) => api.http.get(`/members/${memberId}/credit`);

    it('refuses a booking beyond the credit with CREDIT_EXCEEDED', async () => {
      await fillNomadeCredit();
      const response = await book(day(thursday, '14:00', '14:15'), '2');
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'CREDIT_EXCEEDED' });
      expect(api.bookings.bookings).toHaveLength(3);
    });

    it('accepts a booking that uses the last hour exactly', async () => {
      await book(day(tuesday, '09:00', '13:00'), '2');
      await book(day(wednesday, '09:00', '13:00'), '2');
      expect((await book(day(thursday, '09:00', '11:00'), '2')).status).toBe(201);
    });

    it('gives the hours back when a booking is cancelled before it starts', async () => {
      await fillNomadeCredit();
      await api.http.delete('/bookings/1').set('X-Member-Id', '2');
      expect((await credit(2)).body).toMatchObject({ usedHours: 6, remainingHours: 4 });
      expect((await book(day(thursday, '14:00', '18:00'), '2')).status).toBe(201);
    });

    it('keeps the hours of a booking that has started', async () => {
      await fillNomadeCredit();
      api.clock.current = new Date(at(tuesday, '10:00'));
      expect((await api.http.delete('/bookings/1').set('X-Member-Id', '2')).status).toBe(400);
      expect((await credit(2)).body).toMatchObject({ usedHours: 10, remainingHours: 0 });
    });

    it('counts each month apart, from the 1st at midnight in Paris', async () => {
      await fillNomadeCredit();
      // Le lundi 30 novembre à 19h est encore en novembre, le mardi 1er décembre à 9h est en décembre.
      expect((await book(day('2026-11-30', '18:00', '19:00'), '2')).body).toMatchObject({ code: 'CREDIT_EXCEEDED' });
      expect((await book(day('2026-12-01', '09:00', '13:00'), '2')).status).toBe(201);
    });

    it('does not carry unused hours over to the next month', async () => {
      api.clock.current = new Date(at('2026-12-01', '08:00'));
      expect((await credit(2)).body).toMatchObject({ month: '2026-12', monthlyHours: 10, remainingHours: 10 });
      expect((await book(day('2026-12-02', '09:00', '13:00'), '2')).status).toBe(201);
      expect((await book(day('2026-12-03', '09:00', '13:00'), '2')).status).toBe(201);
      expect((await book(day('2026-12-04', '09:00', '13:00'), '2')).body).toMatchObject({ code: 'CREDIT_EXCEEDED' });
    });

    it('gives the Résident plan 40 hours', async () => {
      expect((await credit(1)).body).toEqual({
        plan: 'resident',
        month: '2026-11',
        monthlyHours: 40,
        usedHours: 0,
        remainingHours: 40,
      });
    });

    it('does not limit the Équipe plan', async () => {
      for (const date of [tuesday, wednesday, thursday, '2026-11-06', '2026-11-09', '2026-11-10']) {
        expect((await book(day(date, '09:00', '13:00'), '3')).status).toBe(201);
      }
      expect((await credit(3)).body).toMatchObject({ plan: 'equipe', monthlyHours: null, remainingHours: null });
    });

    it('answers 404 for an unknown member', async () => {
      expect((await credit(99)).status).toBe(404);
    });
  });
});
