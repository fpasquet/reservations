import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { isSlotTaken } from './error-messages';

describe('isSlotTaken', () => {
  it('offers the waitlist when the slot is booked or on hold', () => {
    expect(isSlotTaken(new ApiError(409, 'ROOM_ALREADY_BOOKED', 'startsAt'))).toBe(true);
    expect(isSlotTaken(new ApiError(409, 'SLOT_ON_HOLD', 'startsAt'))).toBe(true);
  });

  it('does not offer it for other errors', () => {
    expect(isSlotTaken(new ApiError(400, 'IN_THE_PAST', 'startsAt'))).toBe(false);
    expect(isSlotTaken(new Error('boom'))).toBe(false);
  });
});
