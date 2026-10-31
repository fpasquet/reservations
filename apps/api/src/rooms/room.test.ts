import { describe, expect, it } from 'vitest';
import { parseId, parseRoomFilters } from './room.js';

describe('parseRoomFilters', () => {
  it('reads the minimum capacity and the equipment', () => {
    expect(parseRoomFilters({ capacity: '6', equipment: 'screen,whiteboard' })).toEqual({
      minCapacity: 6,
      equipment: ['screen', 'whiteboard'],
    });
  });

  it('has no filter by default', () => {
    expect(parseRoomFilters({})).toEqual({ equipment: [] });
  });

  it('refuses a capacity that is not a positive integer', () => {
    expect(() => parseRoomFilters({ capacity: 'four' })).toThrow('capacity must be a positive integer');
    expect(() => parseRoomFilters({ capacity: '0' })).toThrow('capacity must be a positive integer');
  });

  it('refuses an unknown equipment', () => {
    expect(() => parseRoomFilters({ equipment: 'screen,jacuzzi' })).toThrow('unknown equipment: jacuzzi');
  });
});

describe('parseId', () => {
  it('reads positive integers only', () => {
    expect(parseId('12')).toBe(12);
    expect(parseId('abc')).toBeNull();
    expect(parseId('-1')).toBeNull();
  });
});
