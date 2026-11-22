import { loadEvents } from './load';
import { upcoming } from './merge';
import type { Event } from './event';

/** Events in calendar feeds: everything from 30 days ago on, so recent entries don't vanish at once. */
export function feedEvents(): Event[] {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  return upcoming(loadEvents(), since);
}

/** Events shown on the site and offered as single-event files. */
export function siteEvents(): Event[] {
  return upcoming(loadEvents(), new Date().toISOString().slice(0, 10));
}
