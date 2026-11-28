import type { Metadata } from 'next';
import { MyBookings } from '@/components/my-bookings/my-bookings';

export const metadata: Metadata = { title: 'Mes réservations' };

export default function MyBookingsPage() {
  return <MyBookings />;
}
