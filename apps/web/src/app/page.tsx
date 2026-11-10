import { DayPlanning } from '@/components/planning/day-planning';
import { WeekPlanning } from '@/components/planning/week-planning';
import { isIsoDate, todayInParis } from '@/lib/paris-time';

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; view?: string | string[] }>;
}) {
  const { date, view } = await searchParams;
  const today = todayInParis();
  const day = typeof date === 'string' && isIsoDate(date) ? date : today;
  return view === 'week' ? <WeekPlanning date={day} today={today} /> : <DayPlanning date={day} today={today} />;
}
