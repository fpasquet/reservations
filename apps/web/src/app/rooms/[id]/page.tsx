import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RoomDetail } from '@/components/rooms/room-detail';
import { isIsoDate, todayInParis } from '@/lib/paris-time';

export const metadata: Metadata = { title: 'Salle' };

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const [{ id }, { date }] = await Promise.all([params, searchParams]);
  const roomId = Number(id);
  if (!Number.isInteger(roomId) || roomId < 1) notFound();
  const today = todayInParis();
  const day = typeof date === 'string' && isIsoDate(date) ? date : today;
  return <RoomDetail roomId={roomId} date={day} today={today} />;
}
