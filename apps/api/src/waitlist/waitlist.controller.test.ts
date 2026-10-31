import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../testing/test-app.js';

// Novembre : Paris est à UTC+1.
const at = (date: string, time: string) => `${date}T${time}:00+01:00`;
const tuesday = '2026-11-03';

const slot = (overrides: Record<string, unknown> = {}) => ({
  roomId: 1,
  title: 'Point hebdo',
  attendees: 5,
  startsAt: at(tuesday, '10:00'),
  endsAt: at(tuesday, '11:00'),
  ...overrides,
});

describe('waiting list', () => {
  let api: TestApp;

  const book = (memberId = '1', overrides: Record<string, unknown> = {}) =>
    api.http.post('/bookings').set('X-Member-Id', memberId).send(slot(overrides));
  const join = (memberId = '2', overrides: Record<string, unknown> = {}) =>
    api.http.post('/waitlist').set('X-Member-Id', memberId).send(slot(overrides));
  const entriesOf = async (memberId: number) =>
    (await api.http.get(`/waitlist?memberId=${memberId}`)).body as Array<Record<string, unknown>>;

  beforeEach(async () => {
    api = await createTestApp(new Date(at('2026-11-02', '09:10')));
  });

  afterEach(async () => {
    await api.app.close();
  });

  describe('POST /waitlist', () => {
    it('registers the member on a slot that is already taken', async () => {
      await book();
      const response = await join();
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        room: { id: 1 },
        member: { id: 2 },
        startsAt: '2026-11-03T09:00:00.000Z',
        offeredAt: null,
        offerExpiresAt: null,
      });
    });

    it('refuses a slot that is still free', async () => {
      const response = await join();
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'SLOT_AVAILABLE' });
    });

    it('registers on a slot that only partly overlaps a booking', async () => {
      await book();
      const response = await join('2', { startsAt: at(tuesday, '10:30'), endsAt: at(tuesday, '11:30') });
      expect(response.status).toBe(201);
    });

    it('refuses a second registration on the same slot', async () => {
      await book();
      await join();
      const response = await join();
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'ALREADY_ON_WAITLIST' });
    });

    it('applies the booking rules to the slot', async () => {
      await book();
      expect((await join('2', { attendees: 50 })).body).toMatchObject({ code: 'OVER_CAPACITY' });
      expect(
        (await join('2', { startsAt: at('2026-11-01', '10:00'), endsAt: at('2026-11-01', '11:00') })).body,
      ).toMatchObject({ code: 'IN_THE_PAST' });
    });

    it('requires a member', async () => {
      await book();
      const response = await api.http.post('/waitlist').send(slot());
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ code: 'MISSING_MEMBER' });
    });
  });

  describe('when the booking is cancelled', () => {
    it('offers the slot to the first member registered, for 30 minutes', async () => {
      const booking = (await book()).body as { id: number };
      await join('2');
      await api.http.delete(`/bookings/${booking.id}`).set('X-Member-Id', '1');

      expect(await entriesOf(2)).toMatchObject([
        { offeredAt: '2026-11-02T08:10:00.000Z', offerExpiresAt: '2026-11-02T08:40:00.000Z' },
      ]);
    });

    it('does not offer the slot to the members behind', async () => {
      const booking = (await book()).body as { id: number };
      await join('2');
      await api.http.post('/waitlist').set('X-Member-Id', '3').send(slot());
      await api.http.delete(`/bookings/${booking.id}`).set('X-Member-Id', '1');

      expect(await entriesOf(2)).toMatchObject([{ offeredAt: '2026-11-02T08:10:00.000Z' }]);
      expect(await entriesOf(3)).toMatchObject([{ offeredAt: null }]);
    });

    it('holds the slot for the member who was offered it', async () => {
      const booking = (await book()).body as { id: number };
      await join('2');
      await api.http.delete(`/bookings/${booking.id}`).set('X-Member-Id', '1');

      const other = await book('1');
      expect(other.status).toBe(409);
      expect(other.body).toMatchObject({ code: 'ROOM_ALREADY_BOOKED' });
    });
  });

  describe('POST /waitlist/:id/confirm', () => {
    async function offered() {
      const booking = (await book()).body as { id: number };
      const entry = (await join('2')).body as { id: number };
      await api.http.delete(`/bookings/${booking.id}`).set('X-Member-Id', '1');
      return entry.id;
    }

    it('turns the offer into a booking', async () => {
      const id = await offered();
      const response = await api.http.post(`/waitlist/${id}/confirm`).set('X-Member-Id', '2');
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ member: { id: 2 }, title: 'Point hebdo', cancelledAt: null });
      expect(await entriesOf(2)).toEqual([]);
      const mine = await api.http.get('/bookings?memberId=2');
      expect(mine.body).toHaveLength(1);
    });

    it('refuses once the 30 minutes are over, and offers the slot to the next member', async () => {
      const id = await offered();
      await api.http.post('/waitlist').set('X-Member-Id', '1').send(slot());
      api.clock.current = new Date(at('2026-11-02', '09:41'));

      const response = await api.http.post(`/waitlist/${id}/confirm`).set('X-Member-Id', '2');
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'WAITLIST_ENTRY_NOT_FOUND' });
      expect(await entriesOf(2)).toEqual([]);
      expect(await entriesOf(1)).toMatchObject([{ offeredAt: '2026-11-02T08:41:00.000Z' }]);
    });

    it('refuses while the slot has not been offered', async () => {
      await book();
      const entry = (await join('2')).body as { id: number };
      const response = await api.http.post(`/waitlist/${entry.id}/confirm`).set('X-Member-Id', '2');
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'NOT_OFFERED' });
    });

    it('refuses another member', async () => {
      const id = await offered();
      const response = await api.http.post(`/waitlist/${id}/confirm`).set('X-Member-Id', '1');
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'NOT_YOUR_WAITLIST_ENTRY' });
    });
  });

  describe('DELETE /waitlist/:id', () => {
    it('removes the registration', async () => {
      await book();
      const entry = (await join('2')).body as { id: number };
      const response = await api.http.delete(`/waitlist/${entry.id}`).set('X-Member-Id', '2');
      expect(response.status).toBe(204);
      expect(await entriesOf(2)).toEqual([]);
    });

    it('passes an abandoned offer to the next member', async () => {
      const booking = (await book()).body as { id: number };
      const first = (await join('2')).body as { id: number };
      await api.http.post('/waitlist').set('X-Member-Id', '3').send(slot());
      await api.http.delete(`/bookings/${booking.id}`).set('X-Member-Id', '1');
      await api.http.delete(`/waitlist/${first.id}`).set('X-Member-Id', '2');
      expect(await entriesOf(3)).toMatchObject([{ offeredAt: '2026-11-02T08:10:00.000Z' }]);
    });

    it('refuses another member', async () => {
      await book();
      const entry = (await join('2')).body as { id: number };
      const response = await api.http.delete(`/waitlist/${entry.id}`).set('X-Member-Id', '1');
      expect(response.status).toBe(403);
    });
  });

  describe('GET /waitlist', () => {
    it('lists the registrations of a member', async () => {
      await book();
      await join('2');
      expect(await entriesOf(2)).toHaveLength(1);
      expect(await entriesOf(1)).toEqual([]);
    });

    it('drops a registration once the slot has started', async () => {
      await book();
      await join('2');
      api.clock.current = new Date(at(tuesday, '10:00'));
      expect(await entriesOf(2)).toEqual([]);
    });

    it('requires a member filter', async () => {
      expect((await api.http.get('/waitlist')).status).toBe(400);
    });
  });
});
