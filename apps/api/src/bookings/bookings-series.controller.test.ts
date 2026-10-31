import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../testing/test-app.js';

// Novembre : Paris est à UTC+1.
const at = (date: string, time: string) => `${date}T${time}:00+01:00`;
const tuesday = '2026-11-03';

function seriesOf(overrides: Record<string, unknown> = {}) {
  return {
    roomId: 1,
    title: 'Point hebdo',
    attendees: 5,
    startsAt: at(tuesday, '10:00'),
    endsAt: at(tuesday, '11:00'),
    weeks: 4,
    ...overrides,
  };
}

describe('bookings series', () => {
  let api: TestApp;

  const post = (overrides: Record<string, unknown> = {}, memberId = '1') =>
    api.http.post('/bookings/series').set('X-Member-Id', memberId).send(seriesOf(overrides));

  const bookOne = (date: string, from: string, to: string, memberId = '2') =>
    api.http
      .post('/bookings')
      .set('X-Member-Id', memberId)
      .send({ roomId: 1, title: 'Autre réunion', startsAt: at(date, from), endsAt: at(date, to) });

  beforeEach(async () => {
    api = await createTestApp(new Date(at('2026-11-02', '09:10')));
  });

  afterEach(async () => {
    await api.app.close();
  });

  describe('POST /bookings/series', () => {
    it('creates one booking per week, linked by the series', async () => {
      const response = await post();
      expect(response.status).toBe(201);
      const body = response.body as { seriesId: number; bookings: { startsAt: string; seriesId: number }[] };
      expect(body.seriesId).toBe(1);
      expect(body.bookings.map((booking) => booking.startsAt)).toEqual([
        '2026-11-03T09:00:00.000Z',
        '2026-11-10T09:00:00.000Z',
        '2026-11-17T09:00:00.000Z',
        '2026-11-24T09:00:00.000Z',
      ]);
      expect(body.bookings.every((booking) => booking.seriesId === 1)).toBe(true);
      expect(response.body).toMatchObject({ conflicts: [] });
    });

    it('creates only the free occurrences and returns the others with their reason', async () => {
      await bookOne('2026-11-10', '10:30', '11:30');
      const response = await post();
      expect(response.status).toBe(201);
      const body = response.body as { bookings: { startsAt: string }[]; conflicts: unknown[] };
      expect(body.bookings.map((booking) => booking.startsAt)).toEqual([
        '2026-11-03T09:00:00.000Z',
        '2026-11-17T09:00:00.000Z',
        '2026-11-24T09:00:00.000Z',
      ]);
      expect(body.conflicts).toEqual([
        { startsAt: '2026-11-10T09:00:00.000Z', endsAt: '2026-11-10T10:00:00.000Z', conflict: 'ROOM_ALREADY_BOOKED' },
      ]);
    });

    it('ignores a cancelled booking of the room', async () => {
      const taken = await bookOne('2026-11-10', '10:00', '11:00');
      await api.http.delete(`/bookings/${(taken.body as { id: number }).id}`).set('X-Member-Id', '2');
      const response = await post();
      expect(response.body).toMatchObject({ conflicts: [] });
    });

    it('creates nothing when every occurrence is in conflict', async () => {
      const response = await post({ startsAt: at('2026-11-07', '10:00'), endsAt: at('2026-11-07', '11:00') });
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'NO_FREE_OCCURRENCE' });
      expect(api.bookings.bookings).toHaveLength(0);
    });

    it('previews the occurrences without creating anything', async () => {
      await bookOne('2026-11-10', '10:30', '11:30');
      const response = await post({ preview: true, weeks: 3 });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        occurrences: [
          { startsAt: '2026-11-03T09:00:00.000Z', endsAt: '2026-11-03T10:00:00.000Z', conflict: null },
          { startsAt: '2026-11-10T09:00:00.000Z', endsAt: '2026-11-10T10:00:00.000Z', conflict: 'ROOM_ALREADY_BOOKED' },
          { startsAt: '2026-11-17T09:00:00.000Z', endsAt: '2026-11-17T10:00:00.000Z', conflict: null },
        ],
      });
      expect(api.bookings.bookings).toHaveLength(1);
    });

    it('previews a weekend and the hours outside opening', async () => {
      const weekend = await post({
        preview: true,
        startsAt: at('2026-11-07', '10:00'),
        endsAt: at('2026-11-07', '11:00'),
      });
      expect((weekend.body as { occurrences: { conflict: string }[] }).occurrences[0]?.conflict).toBe('WEEKEND');
      const late = await post({ preview: true, startsAt: at(tuesday, '19:30'), endsAt: at(tuesday, '20:30') });
      expect((late.body as { occurrences: { conflict: string }[] }).occurrences[0]?.conflict).toBe(
        'OUTSIDE_OPENING_HOURS',
      );
    });

    it.each([1, 13, 2.5, '4', null, undefined])('refuses %s weeks', async (weeks) => {
      const response = await post({ weeks });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'INVALID_FIELD', field: 'weeks' });
    });

    it('accepts 2 and 12 weeks', async () => {
      expect((await post({ weeks: 2 })).status).toBe(201);
      expect((await post({ weeks: 12, roomId: 3 })).status).toBe(201);
    });

    it('refuses more attendees than the room seats', async () => {
      const response = await post({ attendees: 20 });
      expect(response.body).toMatchObject({ code: 'OVER_CAPACITY' });
    });

    it('needs a member and a known room', async () => {
      expect((await api.http.post('/bookings/series').send(seriesOf())).body).toMatchObject({
        code: 'MISSING_MEMBER',
      });
      expect((await post({ roomId: 99 })).body).toMatchObject({ code: 'ROOM_NOT_FOUND' });
    });
  });

  describe('DELETE /bookings/series/:id', () => {
    it('cancels the upcoming occurrences only', async () => {
      await post();
      // La première occurrence a commencé : seules les trois suivantes s'annulent.
      api.clock.current = new Date(at(tuesday, '10:30'));
      const response = await api.http.delete('/bookings/series/1').set('X-Member-Id', '1');
      expect(response.status).toBe(200);
      expect((response.body as { startsAt: string }[]).map((booking) => booking.startsAt)).toEqual([
        '2026-11-10T09:00:00.000Z',
        '2026-11-17T09:00:00.000Z',
        '2026-11-24T09:00:00.000Z',
      ]);
      expect(api.bookings.bookings.map((booking) => booking.cancelledAt !== null)).toEqual([false, true, true, true]);
    });

    it('lets a single occurrence be cancelled on its own', async () => {
      await post();
      expect((await api.http.delete('/bookings/2').set('X-Member-Id', '1')).status).toBe(200);
      expect(api.bookings.bookings.map((booking) => booking.cancelledAt !== null)).toEqual([false, true, false, false]);
    });

    it('refuses another member', async () => {
      await post();
      const response = await api.http.delete('/bookings/series/1').set('X-Member-Id', '2');
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'NOT_YOUR_BOOKING' });
    });

    it('answers 404 for an unknown series', async () => {
      for (const id of ['99', 'abc']) {
        const response = await api.http.delete(`/bookings/series/${id}`).set('X-Member-Id', '1');
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ code: 'SERIES_NOT_FOUND' });
      }
    });

    it('refuses when nothing is left to cancel', async () => {
      await post({ weeks: 2 });
      await api.http.delete('/bookings/series/1').set('X-Member-Id', '1');
      const again = await api.http.delete('/bookings/series/1').set('X-Member-Id', '1');
      expect(again.status).toBe(409);
      expect(again.body).toMatchObject({ code: 'NO_UPCOMING_OCCURRENCE' });
    });
  });
});
