import { describe, expect, it } from 'vitest';
import { offsetFrom } from './clock';

describe('offsetFrom', () => {
  it('is zero without a fake time', () => {
    expect(offsetFrom(undefined, '1793000000')).toBe(0);
    expect(offsetFrom('', '1793000000')).toBe(0);
  });

  it('shifts the real time so that it reads FAKE_NOW at FAKE_NOW_SINCE', () => {
    const since = Date.parse('2026-10-30T09:00:00Z') / 1000;
    const offset = offsetFrom('2026-11-05T19:30:00+01:00', String(since));
    expect(new Date(since * 1000 + offset).toISOString()).toBe('2026-11-05T18:30:00.000Z');
  });
});
