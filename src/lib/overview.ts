import type { Adapter, SourceGroup } from '../../scrapers/types';
import type { WatchEntry } from '../../scrapers/watchlist';
import type { ConsideredSource } from '../../scrapers/considered';
import type { WatchState } from '../../scrapers/watch';
import type { Event } from './event';

/** How well a source is covered. Order is the display order (bar segments, sections). */
export const COVERAGE = {
  active: {
    label: 'Shown here automatically',
    icon: '✓',
    advice: 'Their events appear on this site by themselves. Nothing to do.',
  },
  'no-calendar': {
    label: 'Invitations or newsletter only',
    icon: '✉',
    advice: 'These organisers announce events by email. Sign up where a button is shown; otherwise look at their page now and then.',
  },
  'not-located': {
    label: 'No event page found yet',
    icon: '?',
    advice: "We haven't found where they announce events. Their website or a quick email to them is the best bet.",
  },
  blocked: {
    label: "Can't be read automatically",
    icon: '⊘',
    advice: 'Their website blocks automatic reading. Check their event page yourself, or sign up where a button is shown.',
  },
} as const;

export type Coverage = keyof typeof COVERAGE;

export interface SourceRow {
  id: string;
  organiser: string;
  group: SourceGroup;
  coverage: Coverage;
  homepage?: string;
  note?: string;
  /** Upcoming events from this source (active sources only). */
  upcoming?: number;
  /** Last automatic check of a watched page. */
  lastChecked?: string;
  /** Newsletter or invitation sign-up, where one exists. */
  signup?: { url: string; label: string };
}

export interface Overview {
  rows: SourceRow[];
  /** Researched but deliberately not tracked. */
  notTracked: ConsideredSource[];
  counts: Record<Coverage, number>;
  total: number;
}

export function buildOverview(
  adapters: Pick<Adapter, 'id' | 'organiser' | 'info'>[],
  watchlist: WatchEntry[],
  considered: ConsideredSource[],
  watchState: Record<string, WatchState>,
  upcomingEvents: Pick<Event, 'source'>[],
): Overview {
  const upcoming = new Map<string, number>();
  for (const e of upcomingEvents) upcoming.set(e.source, (upcoming.get(e.source) ?? 0) + 1);

  const rows: SourceRow[] = [
    ...adapters.map((a) => ({
      id: a.id,
      organiser: a.organiser,
      group: a.info.group,
      coverage: 'active' as const,
      homepage: a.info.homepage,
      upcoming: upcoming.get(a.id) ?? 0,
    })),
    ...watchlist.map((w) => ({
      id: w.id,
      organiser: w.organiser,
      group: w.group,
      coverage: w.status,
      homepage: w.url,
      note: w.note,
      lastChecked: watchState[w.id]?.checkedAt,
      signup: w.signup,
    })),
  ];

  const order = Object.keys(COVERAGE) as Coverage[];
  rows.sort((a, b) => order.indexOf(a.coverage) - order.indexOf(b.coverage) || a.organiser.localeCompare(b.organiser));

  const counts = Object.fromEntries(order.map((c) => [c, rows.filter((r) => r.coverage === c).length])) as Record<Coverage, number>;
  return { rows, notTracked: considered, counts, total: rows.length };
}
