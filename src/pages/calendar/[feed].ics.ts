import type { APIRoute, GetStaticPaths } from 'astro';
import { feedEvents } from '../../lib/published';
import { toIcs } from '../../lib/ics';
import { eventsForFeed, feedDescription, feedIds, feedTitle } from '../../lib/feeds';

// One feed per combination of groups (all, social, culture, policy, social-culture, ...).
export const getStaticPaths: GetStaticPaths = () => feedIds.map((feed) => ({ params: { feed } }));

export const GET: APIRoute = ({ params }) => {
  const feed = params.feed!;
  const ics = toIcs(eventsForFeed(feedEvents(), feed), new Date(), { name: feedTitle(feed), description: feedDescription(feed) });
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
