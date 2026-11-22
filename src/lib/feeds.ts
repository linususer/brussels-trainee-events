import type { Category, Event } from './event';

/**
 * Subscribable calendar feeds. `categories: null` means everything (also
 * unclassified events). An event appears in every feed one of its categories
 * belongs to.
 */
export const FEEDS = {
  all: {
    name: 'Everything',
    description: 'All events: networking, culture, policy talks and more.',
    categories: null,
  },
  social: {
    name: 'Networking & social',
    description: 'Networking evenings, receptions, Christmas markets and sport.',
    categories: ['networking', 'party', 'christmas-market', 'sport'],
  },
  culture: {
    name: 'Culture',
    description: 'Exhibitions, films, concerts, readings and guided tours.',
    categories: ['culture'],
  },
  policy: {
    name: 'Policy talks',
    description: 'Panels, debates and conferences on EU politics.',
    categories: ['policy'],
  },
} as const satisfies Record<string, { name: string; description: string; categories: readonly Category[] | null }>;

export type FeedId = keyof typeof FEEDS;

export const feedIds = Object.keys(FEEDS) as FeedId[];

export function eventsForFeed(events: Event[], feed: FeedId): Event[] {
  const cats = FEEDS[feed].categories as readonly Category[] | null;
  return cats ? events.filter((e) => e.categories.some((c) => cats.includes(c))) : events;
}

/** Calendar name shown in calendar apps. */
export const feedTitle = (feed: FeedId) =>
  feed === 'all' ? 'Brussels trainee events' : `Brussels trainee events: ${FEEDS[feed].name}`;
