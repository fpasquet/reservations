import { afterEach, describe, expect, it } from 'vitest';
import { formatMinutes, parisDateTime, parisInstant, todayInParis } from './paris-time';
import { freeSlots, gridColumns, slotStarts, spanOn } from './schedule';

const CHANGE_DAYS = [
  { date: '2026-03-29', opening: '2026-03-29T06:00:00.000Z', closing: '2026-03-29T18:00:00.000Z' },
  { date: '2026-10-25', opening: '2026-10-25T07:00:00.000Z', closing: '2026-10-25T19:00:00.000Z' },
];

const originalTz = process.env['TZ'];
afterEach(() => {
  if (originalTz === undefined) delete process.env['TZ'];
  else process.env['TZ'] = originalTz;
});

const booking = (date: string, from: number, to: number) => ({
  startsAt: parisInstant(date, from).toISOString(),
  endsAt: parisInstant(date, to).toISOString(),
});

describe.each(['Europe/Paris', 'America/Montreal', 'Asia/Tokyo'])('with a browser set to %s', (browserZone) => {
  describe.each(CHANGE_DAYS)('on $date', ({ date, opening, closing }) => {
    it('opens at 8h00 and closes at 20h00 Paris time', () => {
      process.env['TZ'] = browserZone;
      expect(parisInstant(date, 8 * 60).toISOString()).toBe(opening);
      expect(parisInstant(date, 20 * 60).toISOString()).toBe(closing);
      expect(parisDateTime(new Date(opening))).toEqual({ date, minutes: 8 * 60 });
      expect(parisDateTime(new Date(closing))).toEqual({ date, minutes: 20 * 60 });
    });

    it('shows 24 half-hour slots from 8h00 to 20h00', () => {
      process.env['TZ'] = browserZone;
      const starts = slotStarts();
      expect(starts).toHaveLength(24);
      expect(formatMinutes(starts[0] ?? 0)).toBe('8h00');
      expect(formatMinutes((starts.at(-1) ?? 0) + 30)).toBe('20h00');
      expect(freeSlots([], null)).toEqual(starts);
    });

    it('places bookings at their Paris time', () => {
      process.env['TZ'] = browserZone;
      for (const [from, to] of [
        [8 * 60, 9 * 60],
        [10 * 60 + 30, 12 * 60],
        [19 * 60, 20 * 60],
      ] as const) {
        const span = spanOn(booking(date, from, to), date);
        expect(span).toEqual({ from, to });
        expect(gridColumns(span ?? { from: 0, to: 0 })).toEqual({
          start: (from - 480) / 15 + 1,
          end: (to - 480) / 15 + 1,
        });
      }
    });

    it('does not leak a booking onto the neighbouring days', () => {
      process.env['TZ'] = browserZone;
      const evening = booking(date, 19 * 60, 20 * 60);
      const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
      const iso = (offset: number) => new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
      expect(spanOn(evening, iso(-1))).toBeNull();
      expect(spanOn(evening, iso(1))).toBeNull();
    });
  });

  it('reads today in Paris, not in the browser zone', () => {
    process.env['TZ'] = browserZone;
    // Le 28 mars à 23h30 UTC, il est déjà le 29 à Paris (UTC+1), pas encore à Montréal.
    expect(todayInParis(new Date('2026-03-28T22:30:00Z'))).toBe('2026-03-28');
    expect(todayInParis(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29');
    // Le 24 octobre à 22h30 UTC, il est 00h30 le 25 à Paris (UTC+2).
    expect(todayInParis(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
  });
});
