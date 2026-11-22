import { describe, expect, it } from 'vitest';
import { buildOverview } from '../src/lib/overview';
import type { WatchEntry } from '../scrapers/watchlist';

const adapters = [
  { id: 'boell-eu', organiser: 'Böll EU', info: { group: 'foundation' as const, homepage: 'https://eu.boell.org/en/events' } },
  { id: 'lv-mv', organiser: 'LV MV', info: { group: 'state' as const } },
];
const watch: WatchEntry[] = [
  { id: 'kas', organiser: 'KAS', status: 'blocked', group: 'foundation', reviewed: '2026-11-21', url: 'https://kas.example' },
  { id: 'lv-bw', organiser: 'LV BW', status: 'no-calendar', group: 'state', reviewed: '2026-11-21', url: 'https://bw.example' },
  { id: 'lv-th', organiser: 'LV TH', status: 'not-located', group: 'state', reviewed: '2026-11-21' },
];
const state = { 'lv-bw': { status: 200, failures: 0, feeds: [], futureDates: [], checkedAt: '2026-11-22' } };

describe('buildOverview', () => {
  const o = buildOverview(adapters, watch, [], state, [{ source: 'boell-eu' }, { source: 'boell-eu' }, { source: 'manual' }]);

  it('counts sources by coverage', () => {
    expect(o.total).toBe(5);
    expect(o.counts).toEqual({ active: 2, 'no-calendar': 1, 'not-located': 1, blocked: 1 });
  });

  it('orders rows by coverage and adds upcoming counts and last checks', () => {
    expect(o.rows.map((r) => [r.id, r.coverage])).toEqual([
      ['boell-eu', 'active'],
      ['lv-mv', 'active'],
      ['lv-bw', 'no-calendar'],
      ['lv-th', 'not-located'],
      ['kas', 'blocked'],
    ]);
    expect(o.rows[0]).toMatchObject({ upcoming: 2, homepage: 'https://eu.boell.org/en/events' });
    expect(o.rows[1]).toMatchObject({ upcoming: 0 });
    expect(o.rows[2]).toMatchObject({ lastChecked: '2026-11-22', homepage: 'https://bw.example' });
  });
});
