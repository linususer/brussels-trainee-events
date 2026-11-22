import type { Category, Event } from './event';

/**
 * Event groups people choose from when subscribing. Every combination of
 * groups is published as its own feed, so any selection is one subscription.
 */
export const GROUPS = {
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
} as const satisfies Record<string, { name: string; description: string; categories: readonly Category[] }>;

export type GroupId = keyof typeof GROUPS;
export const groupIds = Object.keys(GROUPS) as GroupId[];

/** `all` (every event, also unclassified) or groups joined by `-` in fixed order, e.g. `social-culture`. */
export type FeedId = string;

/** Feed id for a selection of groups; all groups (or none) means `all`. */
export function feedForSelection(selected: readonly GroupId[]): FeedId {
  const chosen = groupIds.filter((g) => selected.includes(g));
  return chosen.length === 0 || chosen.length === groupIds.length ? 'all' : chosen.join('-');
}

export function groupsOfFeed(feed: FeedId): GroupId[] {
  return feed === 'all' ? [...groupIds] : (feed.split('-') as GroupId[]);
}

/** All published feeds: `all` plus every non-empty proper subset of groups. */
export const feedIds: FeedId[] = [
  'all',
  ...Array.from({ length: 2 ** groupIds.length - 2 }, (_, i) => groupIds.filter((_, bit) => ((i + 1) >> bit) & 1).join('-')),
];

export function eventsForFeed(events: Event[], feed: FeedId): Event[] {
  if (feed === 'all') return events;
  const cats = groupsOfFeed(feed).flatMap((g) => GROUPS[g].categories as readonly Category[]);
  return events.filter((e) => e.categories.some((c) => cats.includes(c)));
}

export function feedName(feed: FeedId): string {
  return feed === 'all' ? 'Everything' : groupsOfFeed(feed).map((g) => GROUPS[g].name).join(' + ');
}

/** Calendar name shown in calendar apps. */
export const feedTitle = (feed: FeedId) => (feed === 'all' ? 'Brussels trainee events' : `Brussels trainee events: ${feedName(feed)}`);

export function feedDescription(feed: FeedId): string {
  return feed === 'all'
    ? 'All events: networking, culture, policy talks and more.'
    : groupsOfFeed(feed).map((g) => GROUPS[g].description).join(' ');
}

/** Which group a category filter on the events page corresponds to (for "subscribe to this"). */
export function feedForCategory(category: string): FeedId {
  const group = groupIds.find((g) => (GROUPS[g].categories as readonly string[]).includes(category));
  return group ?? 'all';
}
