/** Codes d'erreur renvoyés par l'API ; l'interface les traduit, elle n'affiche jamais le message. */
export type ErrorCode =
  | 'INVALID_BODY'
  | 'INVALID_FIELD'
  | 'INVALID_DATE'
  | 'MISSING_FILTER'
  | 'MISSING_MEMBER'
  | 'ROOM_NOT_FOUND'
  | 'MEMBER_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  | 'END_BEFORE_START'
  | 'OUTSIDE_OPENING_HOURS'
  | 'NOT_ON_QUARTER_HOUR'
  | 'TOO_LONG'
  | 'IN_THE_PAST'
  | 'OVER_CAPACITY'
  | 'ROOM_ALREADY_BOOKED'
  | 'NOT_YOUR_BOOKING'
  | 'ALREADY_STARTED'
  | 'ALREADY_CANCELLED';

const STATUS: Partial<Record<ErrorCode, number>> = {
  ROOM_NOT_FOUND: 404,
  MEMBER_NOT_FOUND: 404,
  BOOKING_NOT_FOUND: 404,
  NOT_YOUR_BOOKING: 403,
  ROOM_ALREADY_BOOKED: 409,
  ALREADY_CANCELLED: 409,
};

/** Une règle métier refuse la demande ; `field` désigne le champ en cause, s'il y en a un. */
export class DomainError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'DomainError';
    this.status = STATUS[code] ?? 400;
  }
}
