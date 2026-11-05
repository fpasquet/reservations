import type { Metadata } from 'next';
import { RoomsBrowser } from '@/components/rooms/rooms-browser';

export const metadata: Metadata = { title: 'Salles' };

export default function RoomsPage() {
  return <RoomsBrowser />;
}
