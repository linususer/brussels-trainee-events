import type { APIRoute, GetStaticPaths } from 'astro';
import { siteEvents } from '../../../lib/published';
import { toIcs } from '../../../lib/ics';
import { eventSlug } from '../../../lib/subscribe';
import type { Event } from '../../../lib/event';

// One small calendar file per event for "add this event" (Apple, Outlook and Thunderbird open it directly).
export const getStaticPaths: GetStaticPaths = () =>
  siteEvents().map((event) => ({ params: { slug: eventSlug(event.id) }, props: { event } }));

export const GET: APIRoute = ({ props }) =>
  new Response(toIcs([(props as { event: Event }).event], new Date(), { name: (props as { event: Event }).event.title }), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
