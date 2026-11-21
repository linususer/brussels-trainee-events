import ical, { type VEvent } from 'node-ical';
import { makeId, toBrusselsLocal, type EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import type { Adapter, SourceDefaults } from '../types';

type Param = VEvent['summary'];
const text = (v: Param | undefined) => (v === undefined ? undefined : typeof v === 'string' ? v : v.val);

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parses an iCalendar feed into events. Recurring events keep only their first occurrence. */
export function parseIcs(body: string, src: SourceDefaults): EventInput[] {
  const calendar = ical.sync.parseICS(body);
  const events: EventInput[] = [];

  for (const component of Object.values(calendar)) {
    if (!component || component.type !== 'VEVENT') continue;
    const ev = component as VEvent;
    const title = text(ev.summary)?.trim();
    if (!title || !ev.start) continue;

    const allDay = ev.datetype === 'date';
    const start = allDay ? localDate(ev.start) : toBrusselsLocal(ev.start);
    let end: string | undefined;
    if (ev.end) {
      if (allDay) {
        // iCal all-day DTEND is exclusive; store the inclusive last day.
        const last = new Date(ev.end);
        last.setDate(last.getDate() - 1);
        end = localDate(last) > start ? localDate(last) : undefined;
      } else {
        // node-ical sets end = start when DTEND is missing.
        end = ev.end.getTime() > ev.start.getTime() ? toBrusselsLocal(ev.end) : undefined;
      }
    }

    const description = text(ev.description)?.trim() || undefined;
    const labels = ev.categories?.map((c) => c.trim()).filter(Boolean) ?? [];
    events.push({
      id: ev.uid ? `${src.id}:${ev.uid}` : makeId(src.id, start, title),
      title,
      start,
      end,
      location: text(ev.location)?.trim() || undefined,
      organiser: src.organiser,
      country: src.country,
      url: ev.url || undefined,
      description,
      labels: labels.length ? labels : undefined,
      ...classify({ title, description, labels }),
      source: src.id,
    });
  }
  return events;
}

/** Adapter for sources that publish an .ics feed (the most robust kind). */
export function icalAdapter(src: SourceDefaults & { url: string }): Adapter {
  return {
    id: src.id,
    organiser: src.organiser,
    fetch: async (ctx) => parseIcs(await ctx.get(src.url), src),
  };
}
