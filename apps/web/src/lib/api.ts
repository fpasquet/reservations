import type { Booking, BookingRequest, Equipment, Member, Room } from './types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/** Erreur renvoyée par l'API : `code` se traduit avec messageFor, `field` désigne le champ en cause. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly field?: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  memberId?: number;
}

async function request<T>(path: string, { method = 'GET', body, memberId }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (memberId !== undefined) headers['X-Member-Id'] = String(memberId);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload ?? {}) as { code?: unknown; field?: unknown };
    throw new ApiError(
      response.status,
      typeof error.code === 'string' ? error.code : 'UNEXPECTED_ERROR',
      typeof error.field === 'string' ? error.field : undefined,
    );
  }
  return payload as T;
}

export interface RoomFilters {
  capacity?: number;
  equipment?: Equipment[];
}

export function getRooms({ capacity, equipment = [] }: RoomFilters = {}): Promise<Room[]> {
  const query = new URLSearchParams();
  if (capacity) query.set('capacity', String(capacity));
  if (equipment.length > 0) query.set('equipment', equipment.join(','));
  const search = query.toString();
  return request<Room[]>(`/rooms${search ? `?${search}` : ''}`);
}

export const getRoom = (id: number) => request<Room>(`/rooms/${id}`);

export const getMembers = () => request<Member[]>('/members');

export function getDayPlanning(date: string, roomId?: number): Promise<Booking[]> {
  const query = new URLSearchParams({ date });
  if (roomId !== undefined) query.set('roomId', String(roomId));
  return request<Booking[]>(`/bookings?${query.toString()}`);
}

export const getMemberBookings = (memberId: number) => request<Booking[]>(`/bookings?memberId=${memberId}`);

export const createBooking = (memberId: number, booking: BookingRequest) =>
  request<Booking>('/bookings', { method: 'POST', body: booking, memberId });

export const cancelBooking = (memberId: number, bookingId: number) =>
  request<Booking>(`/bookings/${bookingId}`, { method: 'DELETE', memberId });
