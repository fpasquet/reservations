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

describe('waitlist', () => {
  let api: TestApp;

  const book = (memberId: string, overrides: Record<string, unknown> = {}) =>
    api.http.post('/bookings').set('X-Member-Id', memberId).send(slot(overrides));
  const join = (memberId: string, overrides: Record<string, unknown> = {}) =>
    api.http.post('/waitlist').set('X-Member-Id', memberId).send(slot(overrides));
  const confirm = (memberId: string, id: number) =>
    api.http.post(`/waitlist/${id}/confirm`).set('X-Member-Id', memberId);
  const entriesOf = async (memberId: number) =>
    (await api.http.get(`/waitlist?memberId=${memberId}`)).body as { id: number; offeredAt: string | null }[];
  const advance = (time: string, date = '2026-11-02') => {
    api.clock.current = new Date(at(date, time));
  };

  beforeEach(async () => {
    api = await createTestApp(new Date(at('2026-11-02', '09:10')));
  });

  afterEach(async () => {
    await api.app.close();
  });

  describe('POST /waitlist', () => {
    it('signs the member up for a slot that is taken', async () => {
      await book('1');
      const response = await join('2');
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        room: { id: 1, name: 'La Serre' },
        member: { id: 2 },
        title: 'Point hebdo',
        offeredAt: null,
        offerExpiresAt: null,
      });
    });

    it('refuses a slot that is free', async () => {
      const response = await join('2');
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'SLOT_AVAILABLE' });
    });

    it('ignores a cancelled booking when looking for a taken slot', async () => {
      const booked = await book('1');
      await api.http.delete(`/bookings/${(booked.body as { id: number }).id}`).set('X-Member-Id', '1');
      expect((await join('2')).status).toBe(409);
    });

    it('refuses to sign up twice for the same slot', async () => {
      await book('1');
      await join('2');
      const response = await join('2', { startsAt: at(tuesday, '10:30'), endsAt: at(tuesday, '11:30') });
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'ALREADY_ON_WAITLIST' });
    });

    it('applies the booking rules to the slot', async () => {
      await book('1');
      expect((await join('2', { endsAt: at(tuesday, '15:00') })).body).toMatchObject({ code: 'TOO_LONG' });
      expect((await join('2', { attendees: 12 })).body).toMatchObject({ code: 'OVER_CAPACITY' });
      expect((await join('2', { startsAt: at('2026-11-02', '08:00') })).body).toMatchObject({ code: 'IN_THE_PAST' });
    });

    it('needs a member', async () => {
      const response = await api.http.post('/waitlist').send(slot());
      expect(response.body).toMatchObject({ code: 'MISSING_MEMBER' });
    });
  });

  describe('when the booking is cancelled', () => {
    let bookingId: number;

    beforeEach(async () => {
      bookingId = ((await book('1')).body as { id: number }).id;
    });

    const cancel = () => api.http.delete(`/bookings/${bookingId}`).set('X-Member-Id', '1');

    it('offers the slot to the first member in line, for 30 minutes', async () => {
      advance('09:20');
      await join('2');
      advance('09:30');
      await api.http
        .post('/waitlist')
        .set('X-Member-Id', '1')
        .send(slot({ attendees: 2 }));
      expect((await cancel()).status).toBe(200);

      const [first] = await entriesOf(2);
      expect(first).toMatchObject({
        offeredAt: '2026-11-02T08:30:00.000Z',
        offerExpiresAt: '2026-11-02T09:00:00.000Z',
      });
      expect((await entriesOf(1))[0]?.offeredAt).toBeNull();
    });

    it('lets the member confirm, which books the slot and clears the entry', async () => {
      await join('2');
      await cancel();
      const [entry] = await entriesOf(2);

      advance('09:30');
      const response = await confirm('2', entry!.id);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ member: { id: 2 }, title: 'Point hebdo', cancelledAt: null });
      expect(await entriesOf(2)).toEqual([]);
    });

    it('refuses the confirmation while the member is still waiting', async () => {
      await join('2');
      const [entry] = await entriesOf(2);
      const response = await confirm('2', entry!.id);
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'NOT_OFFERED' });
    });

    it('refuses the confirmation to someone else', async () => {
      await join('2');
      await cancel();
      const [entry] = await entriesOf(2);
      expect((await confirm('1', entry!.id)).status).toBe(403);
    });

    it('holds the slot: nobody else can book it during the 30 minutes', async () => {
      await join('2');
      await cancel();
      const response = await book('1');
      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'SLOT_ON_HOLD' });
    });

    it('passes the slot to the next member once the 30 minutes are over', async () => {
      await join('2');
      advance('09:20');
      await api.http
        .post('/waitlist')
        .set('X-Member-Id', '1')
        .send(slot({ attendees: 2 }));
      advance('09:30');
      await cancel();
      advance('10:05');

      expect(await entriesOf(2)).toEqual([]);
      expect((await entriesOf(1))[0]?.offeredAt).toBe('2026-11-02T09:05:00.000Z');
    });

    it('frees the slot when the offer lapses with nobody else waiting', async () => {
      await join('2');
      await cancel();
      advance('10:00');
      expect((await book('1')).status).toBe(201);
    });

    it('refuses a late confirmation', async () => {
      await join('2');
      await cancel();
      const [entry] = await entriesOf(2);
      advance('10:00');
      const response = await confirm('2', entry!.id);
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ code: 'WAITLIST_ENTRY_NOT_FOUND' });
    });

    it('offers the slot to the next member when the first one gives up', async () => {
      await join('2');
      advance('09:20');
      await api.http
        .post('/waitlist')
        .set('X-Member-Id', '1')
        .send(slot({ attendees: 2 }));
      await cancel();
      const [entry] = await entriesOf(2);

      const response = await api.http.delete(`/waitlist/${entry!.id}`).set('X-Member-Id', '2');
      expect(response.status).toBe(204);
      expect((await entriesOf(1))[0]?.offeredAt).not.toBeNull();
    });
  });

  describe('GET /waitlist', () => {
    it('lists the entries of the member only', async () => {
      await book('1');
      await join('2');
      expect(await entriesOf(2)).toHaveLength(1);
      expect(await entriesOf(1)).toEqual([]);
    });

    it('drops the entries whose slot is over', async () => {
      await book('1');
      await join('2');
      advance('10:00', tuesday);
      expect(await entriesOf(2)).toEqual([]);
    });

    it('needs a member', async () => {
      expect((await api.http.get('/waitlist')).body).toMatchObject({ code: 'INVALID_FIELD' });
    });
  });

  describe('DELETE /waitlist/:id', () => {
    it('only lets the member who signed up leave', async () => {
      await book('1');
      const id = ((await join('2')).body as { id: number }).id;
      expect((await api.http.delete(`/waitlist/${id}`).set('X-Member-Id', '1')).status).toBe(403);
      expect((await api.http.delete(`/waitlist/${id}`).set('X-Member-Id', '2')).status).toBe(204);
      expect(await entriesOf(2)).toEqual([]);
    });

    it('answers 404 for an unknown entry', async () => {
      expect((await api.http.delete('/waitlist/99').set('X-Member-Id', '2')).status).toBe(404);
    });
  });
});
