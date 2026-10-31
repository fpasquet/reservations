import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/domain-error.js';
import { parseBookingRequest, parseMemberHeader } from './booking-request.js';

const valid = {
  roomId: 3,
  title: '  Point hebdo  ',
  attendees: 4,
  startsAt: '2026-11-03T10:00:00+01:00',
  endsAt: '2026-11-03T11:30:00+01:00',
};

function errorOf(body: unknown): DomainError {
  try {
    parseBookingRequest(body);
  } catch (error) {
    if (error instanceof DomainError) return error;
  }
  throw new Error('expected a DomainError');
}

describe('parseBookingRequest', () => {
  it('reads a booking request and trims the title', () => {
    expect(parseBookingRequest(valid)).toEqual({
      roomId: 3,
      title: 'Point hebdo',
      attendees: 4,
      startsAt: new Date('2026-11-03T09:00:00Z'),
      endsAt: new Date('2026-11-03T10:30:00Z'),
    });
  });

  it('makes the attendees count optional', () => {
    expect(parseBookingRequest({ ...valid, attendees: undefined }).attendees).toBeNull();
    expect(parseBookingRequest({ ...valid, attendees: null }).attendees).toBeNull();
  });

  it('refuses a body that is not an object', () => {
    expect(errorOf('hello').code).toBe('INVALID_BODY');
    expect(errorOf([valid]).code).toBe('INVALID_BODY');
  });

  it('names the invalid field', () => {
    expect(errorOf({ ...valid, roomId: '3' })).toMatchObject({ code: 'INVALID_FIELD', field: 'roomId' });
    expect(errorOf({ ...valid, title: '   ' })).toMatchObject({ code: 'INVALID_FIELD', field: 'title' });
    expect(errorOf({ ...valid, title: 'x'.repeat(81) })).toMatchObject({ field: 'title' });
    expect(errorOf({ ...valid, attendees: 0 })).toMatchObject({ field: 'attendees' });
    expect(errorOf({ ...valid, attendees: 2.5 })).toMatchObject({ field: 'attendees' });
  });

  it('requires date-times with a time zone', () => {
    expect(errorOf({ ...valid, startsAt: '2026-11-03T10:00:00' })).toMatchObject({ field: 'startsAt' });
    expect(errorOf({ ...valid, endsAt: 'demain' })).toMatchObject({ field: 'endsAt' });
  });
});

describe('parseMemberHeader', () => {
  it('reads the member id', () => {
    expect(parseMemberHeader('4')).toBe(4);
  });

  it('refuses a missing or malformed header', () => {
    expect(() => parseMemberHeader(undefined)).toThrow(DomainError);
    expect(() => parseMemberHeader('camille')).toThrow(DomainError);
  });
});
