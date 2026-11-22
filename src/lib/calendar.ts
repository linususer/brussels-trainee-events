import type { Event } from './event';

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  events: Event[];
}

export interface CalendarMonth {
  /** `YYYY-MM` */
  key: string;
  label: string;
  /** Monday-first weeks of 7 days, including leading/trailing days of other months. */
  weeks: CalendarDay[][];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Events longer than this appear only on their first day (e.g. exhibitions), not on every day. */
export const LONG_EVENT_DAYS = 3;

/**
 * Days an event appears on: each day of short multi-day events; long ones only
 * on their first day and on the 1st of every later month they run into.
 */
function daysOf(e: Event): string[] {
  const first = e.start.slice(0, 10);
  const last = (e.end ?? e.start).slice(0, 10);
  const span = (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 864e5 + 1;
  if (span > LONG_EVENT_DAYS) {
    const days = [first];
    for (let d = new Date(`${first.slice(0, 7)}-01T00:00:00Z`); ; ) {
      d.setUTCMonth(d.getUTCMonth() + 1);
      if (iso(d) > last) break;
      days.push(iso(d));
    }
    return days;
  }
  const days: string[] = [];
  for (let d = new Date(`${first}T00:00:00Z`); iso(d) <= last && days.length < 62; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(iso(d));
  }
  return days.length ? days : [first];
}

/**
 * Month grids from `fromMonth` (YYYY-MM) to the month of the last event
 * (at most `maxMonths`). Events are sorted by start within each day.
 */
export function buildMonths(events: Event[], fromMonth: string, maxMonths = 6): CalendarMonth[] {
  const byDay = new Map<string, Event[]>();
  for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    for (const day of daysOf(e)) byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const lastEventMonth = [...byDay.keys()].sort().at(-1)?.slice(0, 7) ?? fromMonth;

  const months: CalendarMonth[] = [];
  const cursor = new Date(`${fromMonth}-01T00:00:00Z`);
  while (months.length < maxMonths && iso(cursor).slice(0, 7) <= lastEventMonth) {
    const key = iso(cursor).slice(0, 7);
    const gridStart = new Date(cursor);
    gridStart.setUTCDate(1 - ((cursor.getUTCDay() + 6) % 7)); // back to Monday
    const weeks: CalendarDay[][] = [];
    const day = new Date(gridStart);
    do {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const date = iso(day);
        week.push({ date, inMonth: date.slice(0, 7) === key, events: byDay.get(date) ?? [] });
        day.setUTCDate(day.getUTCDate() + 1);
      }
      weeks.push(week);
    } while (iso(day).slice(0, 7) === key);
    months.push({ key, label: monthLabel.format(cursor), weeks });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}
