import type { APIRoute, GetStaticPaths } from 'astro';
import { feedEvents } from '../../lib/published';
import { toIcs } from '../../lib/ics';
import { FEEDS, eventsForFeed, feedIds, feedTitle, type FeedId } from '../../lib/feeds';

export const getStaticPaths: GetStaticPaths = () => feedIds.map((feed) => ({ params: { feed } }));

export const GET: APIRoute = ({ params }) => {
  const feed = params.feed as FeedId;
  const ics = toIcs(eventsForFeed(feedEvents(), feed), new Date(), { name: feedTitle(feed), description: FEEDS[feed].description });
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
