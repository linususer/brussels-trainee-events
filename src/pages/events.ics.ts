import type { APIRoute } from 'astro';
import { loadEvents } from '../lib/load';
import { upcoming } from '../lib/merge';
import { toIcs } from '../lib/ics';

// Subscribable calendar feed with all events from the last 30 days on.
export const GET: APIRoute = () => {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  return new Response(toIcs(upcoming(loadEvents(), since)), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
