import { describe, expect, it } from 'vitest';
import { InMemoryClosedDaysRepository } from '../testing/in-memory-repositories.js';
import { parsePublicHolidays } from './public-holidays.js';
import { PublicHolidaysSync } from './public-holidays.sync.js';

const payload = { '2026-11-11': '11 novembre', '2026-12-25': 'Jour de Noël' };

describe('parsePublicHolidays', () => {
  it('reads the days of the API answer', () => {
    expect(parsePublicHolidays(payload)).toEqual([
      { date: '2026-11-11', name: '11 novembre' },
      { date: '2026-12-25', name: 'Jour de Noël' },
    ]);
  });

  it.each([null, [], 'oops', {}, { 'not-a-date': 'x' }, { '2026-11-11': 3 }, { '2026-11-11': ' ' }])(
    'rejects %j',
    (bad) => {
      expect(parsePublicHolidays(bad)).toBeNull();
    },
  );
});

describe('PublicHolidaysSync', () => {
  it('stores the public holidays', async () => {
    const days = new InMemoryClosedDaysRepository();
    expect(await new PublicHolidaysSync(days, () => Promise.resolve(payload)).refresh()).toBe(true);
    expect(await days.find('2026-11-11')).toEqual({ date: '2026-11-11', name: '11 novembre' });
  });

  it('keeps the last known list when the API does not answer', async () => {
    const days = new InMemoryClosedDaysRepository();
    await new PublicHolidaysSync(days, () => Promise.resolve(payload)).refresh();

    const down = new PublicHolidaysSync(days, () => Promise.reject(new Error('timeout')));
    expect(await down.refresh()).toBe(false);
    const garbled = new PublicHolidaysSync(days, () => Promise.resolve({ error: 'maintenance' }));
    expect(await garbled.refresh()).toBe(false);

    expect(await days.find('2026-12-25')).toEqual({ date: '2026-12-25', name: 'Jour de Noël' });
  });
});
