import type { Category, Event } from './event';
import { AFTER_WORK_FROM, fitsAroundWork } from './workday';

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

/**
 * `all` (every event, also unclassified) or groups joined by `-` in fixed order,
 * e.g. `social-culture`; with `-afterwork` appended, only events outside work hours.
 */
export type FeedId = string;

const AFTERWORK = '-afterwork';

/** Splits a feed id into its group part and the work-hours option. */
export function parseFeed(feed: FeedId): { base: string; afterWork: boolean } {
  return feed.endsWith(AFTERWORK) ? { base: feed.slice(0, -AFTERWORK.length), afterWork: true } : { base: feed, afterWork: false };
}

/** Feed id for a selection of groups (all or none means `all`), optionally outside work hours only. */
export function feedForSelection(selected: readonly GroupId[], afterWork = false): FeedId {
  const chosen = groupIds.filter((g) => selected.includes(g));
  const base = chosen.length === 0 || chosen.length === groupIds.length ? 'all' : chosen.join('-');
  return afterWork ? base + AFTERWORK : base;
}

export function groupsOfFeed(feed: FeedId): GroupId[] {
  const { base } = parseFeed(feed);
  return base === 'all' ? [...groupIds] : (base.split('-') as GroupId[]);
}

const baseFeeds: FeedId[] = [
  'all',
  ...Array.from({ length: 2 ** groupIds.length - 2 }, (_, i) => groupIds.filter((_, bit) => ((i + 1) >> bit) & 1).join('-')),
];

/** All published feeds: `all` plus every non-empty proper subset of groups, each also as `-afterwork`. */
export const feedIds: FeedId[] = [...baseFeeds, ...baseFeeds.map((f) => f + AFTERWORK)];

export function eventsForFeed(events: Event[], feed: FeedId): Event[] {
  const { base, afterWork } = parseFeed(feed);
  const timed = afterWork ? events.filter(fitsAroundWork) : events;
  if (base === 'all') return timed;
  const cats = groupsOfFeed(feed).flatMap((g) => GROUPS[g].categories as readonly Category[]);
  return timed.filter((e) => e.categories.some((c) => cats.includes(c)));
}

export function feedName(feed: FeedId): string {
  const { base, afterWork } = parseFeed(feed);
  const name = base === 'all' ? 'Everything' : groupsOfFeed(feed).map((g) => GROUPS[g].name).join(' + ');
  return afterWork ? `${name} (outside work hours)` : name;
}

/** Calendar name shown in calendar apps. */
export const feedTitle = (feed: FeedId) => (feed === 'all' ? 'Brussels trainee events' : `Brussels trainee events: ${feedName(feed)}`);

export function feedDescription(feed: FeedId): string {
  const { base, afterWork } = parseFeed(feed);
  const text =
    base === 'all' ? 'All events: networking, culture, policy talks and more.' : groupsOfFeed(feed).map((g) => GROUPS[g].description).join(' ');
  return afterWork ? `${text} Only weekday events from ${AFTER_WORK_FROM}, plus weekend and all-day events.` : text;
}

/** Which group a category filter on the events page corresponds to (for "subscribe to this"). */
export function feedForCategory(category: string): FeedId {
  const group = groupIds.find((g) => (GROUPS[g].categories as readonly string[]).includes(category));
  return group ?? 'all';
}
