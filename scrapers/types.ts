import type { EventInput } from '../src/lib/event';

/** One event source, e.g. the event page of a state representation. */
export interface Adapter {
  /** Short stable id, used as `source` and id prefix (e.g. `lv-bayern`). */
  id: string;
  /** Human-readable organiser name shown on the site. */
  organiser: string;
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
}
