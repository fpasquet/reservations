import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../testing/test-app.js';

describe('closed days', () => {
  let api: TestApp;

  beforeEach(async () => {
    api = await createTestApp(new Date('2026-11-02T09:10:00+01:00'));
    api.closedDays.days = [{ date: '2026-11-11', name: '11 novembre' }];
  });

  afterEach(async () => {
    await api.app.close();
  });

  it('gives the closed day of a date', async () => {
    const response = await api.http.get('/closed-days?date=2026-11-11');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ date: '2026-11-11', name: '11 novembre' }]);
  });

  it('gives nothing on an open day', async () => {
    const response = await api.http.get('/closed-days?date=2026-11-12');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('refuses a missing or malformed date', async () => {
    expect((await api.http.get('/closed-days')).body).toMatchObject({ code: 'INVALID_DATE' });
    expect((await api.http.get('/closed-days?date=11/11/2026')).body).toMatchObject({ code: 'INVALID_DATE' });
  });

  it('refuses a booking on a closed day', async () => {
    const response = await api.http.post('/bookings').set('X-Member-Id', '1').send({
      roomId: 1,
      title: 'Point hebdo',
      attendees: 3,
      startsAt: '2026-11-11T10:00:00+01:00',
      endsAt: '2026-11-11T11:00:00+01:00',
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'CLOSED_DAY', field: 'startsAt' });
  });
});
