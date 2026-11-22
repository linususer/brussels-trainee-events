import { parseDate } from './adapters/html';

/**
 * "26 November 2026, 19:00-21:00 (CET)" or "3 December 2026 - 5 December 2026"
 * → local start/end. Falls back to the list day.
 */
export function parseDateTimeRange(dateText: string | undefined, day: string): { start: string; end?: string } {
  if (!dateText) return { start: day };
  const [first, second] = dateText.split(/\s[-–]\s/);
  const startDay = parseDate(first)?.slice(0, 10) ?? day;
  const endDay = second ? parseDate(second)?.slice(0, 10) : undefined;
  const times = [...dateText.matchAll(/(\d{1,2})[:.](\d{2})/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  if (!times[0]) return { start: startDay, end: endDay && endDay > startDay ? endDay : undefined };
  return { start: `${startDay}T${times[0]}`, end: times[1] ? `${endDay ?? startDay}T${times[1]}` : undefined };
}
