import { isAllDay, type Event } from './event';

/** Earliest weekday start time that still fits around a trainee's working day. */
export const AFTER_WORK_FROM = '14:00';

/**
 * Whether someone working weekdays can attend: weekend events (any time),
 * all-day events (e.g. exhibitions, markets) and weekday events starting at
 * or after {@link AFTER_WORK_FROM}.
 */
export function fitsAroundWork(e: Pick<Event, 'start'>): boolean {
  if (isAllDay(e)) return true;
  const weekday = new Date(`${e.start.slice(0, 10)}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  if (weekday === 0 || weekday === 6) return true;
  return e.start.slice(11, 16) >= AFTER_WORK_FROM;
}
