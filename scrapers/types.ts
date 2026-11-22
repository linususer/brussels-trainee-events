import type { EventInput } from '../src/lib/event';

/** Kind of organiser, used to group sources on the overview page. */
export const SOURCE_GROUPS = {
  state: 'State & federal institutions',
  'eu-institution': 'EU institutions',
  'think-tank': 'Think tanks',
  network: 'Young professional & trainee networks',
  culture: 'Culture',
  foundation: 'Political foundations',
  business: 'Business',
  community: 'Community',
  aggregator: 'Aggregators',
  other: 'Other',
} as const;

export type SourceGroup = keyof typeof SOURCE_GROUPS;

/** What the sources overview shows about a source. */
export interface SourceInfo {
  group: SourceGroup;
  /** Page a trainee can open to check the source by hand. */
  homepage?: string;
}

export const sourceInfo = (cfg: Pick<SourceDefaults, 'group' | 'homepage'>): SourceInfo => ({
  group: cfg.group ?? 'other',
  homepage: cfg.homepage,
});

/** One event source, e.g. the event page of a state representation. */
export interface Adapter {
  /** Short stable id, used as `source` and id prefix (e.g. `lv-bayern`). */
  id: string;
  /** Human-readable organiser name shown on the site. */
  organiser: string;
  info: SourceInfo;
  fetch(ctx: FetchContext): Promise<EventInput[]>;
}

export interface FetchContext {
  /** Fetches a URL as text (polite User-Agent, at most one request per second). */
  get(url: string): Promise<string>;
}

export interface SourceDefaults {
  id: string;
  organiser: string;
  /** National community the source addresses, e.g. `DE`. */
  country?: string;
  group?: SourceGroup;
  homepage?: string;
}
