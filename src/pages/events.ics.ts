import type { APIRoute } from 'astro';
import { feedEvents } from '../lib/published';
import { toIcs } from '../lib/ics';
import { feedDescription, feedTitle } from '../lib/feeds';

// Original feed address, kept so existing subscriptions keep working (same as /calendar/all.ics).
export const GET: APIRoute = () =>
  new Response(toIcs(feedEvents(), new Date(), { name: feedTitle('all'), description: feedDescription('all') }), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
