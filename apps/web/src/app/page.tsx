import { DayPlanning } from '@/components/planning/day-planning';
import { isIsoDate, todayInParis } from '@/lib/paris-time';

export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date } = await searchParams;
  const today = todayInParis();
  const day = typeof date === 'string' && isIsoDate(date) ? date : today;
  return <DayPlanning date={day} today={today} />;
}
