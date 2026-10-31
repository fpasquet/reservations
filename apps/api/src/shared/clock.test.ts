import { describe, expect, it } from 'vitest';
import { clockFromEnv, offsetClock, systemClock } from './clock.js';

describe('offsetClock', () => {
  it('starts at the fake instant, then moves on with the real time', () => {
    let real = Date.parse('2026-10-30T09:00:00Z');
    const clock = offsetClock('2026-11-05T19:30:00+01:00', real / 1000, () => real);
    expect(clock.now().toISOString()).toBe('2026-11-05T18:30:00.000Z');
    real += 20 * 60_000;
    expect(clock.now().toISOString()).toBe('2026-11-05T18:50:00.000Z');
  });

  it('refuses an instant without a time zone', () => {
    expect(() => offsetClock('2026-11-05T19:30', 0)).toThrow('FAKE_NOW must be an ISO 8601 date-time');
  });
});

describe('clockFromEnv', () => {
  it('is the system clock without FAKE_NOW', () => {
    expect(clockFromEnv({})).toBe(systemClock);
    expect(clockFromEnv({ FAKE_NOW: ' ' })).toBe(systemClock);
  });

  it('reads FAKE_NOW from the moment given by FAKE_NOW_SINCE', () => {
    const since = Math.floor(Date.now() / 1000) - 3600;
    const now = clockFromEnv({ FAKE_NOW: '2026-11-05T08:00:00Z', FAKE_NOW_SINCE: String(since) }).now();
    expect(now.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-11-05T09:00:00Z'));
    expect(now.getTime()).toBeLessThan(Date.parse('2026-11-05T09:01:00Z'));
  });
});
