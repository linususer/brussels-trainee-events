import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareWatch, extractSignals, findFutureDates, nextState, reviewReminder, type WatchState } from '../scrapers/watch';
import type { WatchEntry } from '../scrapers/watchlist';

const html = readFileSync(new URL('./fixtures/watch-page.html', import.meta.url), 'utf8');
const today = '2026-11-21';
const entry: WatchEntry = { id: 'lv-x', organiser: 'LV X', status: 'no-calendar', reviewed: today, url: 'https://lv.example/va' };
const state = (s: Partial<WatchState> = {}): WatchState => ({ status: 200, failures: 0, feeds: [], futureDates: [], checkedAt: today, ...s });

describe('findFutureDates', () => {
  it('keeps real dates after today within a year', () => {
    expect(findFutureDates('21.11.2026 · 01.12.2026 · 5. Dezember 2026 · 2028-01-01 · 30.02.2027', today)).toEqual([
      '2026-12-01',
      '2026-12-05',
    ]);
  });
});

describe('extractSignals', () => {
  const signals = extractSignals(html, 'https://lv.example/va', today);

  it('finds feed and calendar links but not words like "political"', () => {
    expect(signals.feeds).toEqual([
      'https://example.org/cal',
      'https://lv.example/en/node/167273/savetoCalendar',
      'https://lv.example/feed/',
      'https://lv.example/termine/neujahrsempfang.ics',
    ]);
  });

  it('reads upcoming dates from the main content only', () => {
    // The nav stamp and the past/invalid dates are ignored.
    expect(signals.futureDates).toEqual(['2027-01-26', '2027-03-04']);
  });
});

describe('compareWatch', () => {
  it('reports nothing when a page stays without feeds or dates', () => {
    expect(compareWatch(entry, state(), state())).toEqual([]);
  });

  it('flags new feeds and newly mentioned dates only', () => {
    const prev = state({ feeds: ['https://lv.example/feed/'], futureDates: ['2027-01-26'] });
    const next = state({ feeds: ['https://lv.example/feed/', 'https://lv.example/a.ics'], futureDates: ['2027-01-26', '2027-03-04'] });
    expect(compareWatch(entry, prev, next)).toEqual([
      'feed links (new): https://lv.example/a.ics',
      'upcoming dates mentioned (new): 2027-03-04',
    ]);
  });

  it('notices a blocked site becoming reachable', () => {
    const blocked = { ...entry, status: 'blocked' as const };
    expect(compareWatch(blocked, state({ status: 403, failures: 1 }), state())).toEqual(['now reachable (was 403)']);
  });

  it('ignores a one-off failure but flags the second in a row, once', () => {
    const good = state({ feeds: ['https://lv.example/feed/'] });
    const fail1 = nextState(good, 0, undefined, today);
    expect(fail1).toMatchObject({ failures: 1, feeds: ['https://lv.example/feed/'] });
    expect(compareWatch(entry, good, fail1)).toEqual([]);

    const fail2 = nextState(fail1, 404, undefined, today);
    expect(compareWatch(entry, fail1, fail2)).toEqual(['not reachable twice in a row (404): page moved?']);
    expect(compareWatch(entry, fail2, nextState(fail2, 404, undefined, today))).toEqual([]);
  });

  it('does not re-report old signals after recovering from a failure', () => {
    const good = state({ feeds: ['https://lv.example/feed/'], futureDates: ['2027-01-26'] });
    const failed = nextState(good, 0, undefined, today);
    const recovered = nextState(failed, 200, { feeds: good.feeds, futureDates: good.futureDates }, today);
    expect(compareWatch(entry, failed, recovered)).toEqual([]);
  });

  it('does not nag about blocked sites on the first run', () => {
    expect(compareWatch({ ...entry, status: 'blocked' }, undefined, state({ status: 403 }))).toEqual([]);
  });
});

describe('reviewReminder', () => {
  it('reminds about blocked or unlocated sources after 30 days', () => {
    const old = { ...entry, status: 'not-located' as const, reviewed: '2026-10-01' };
    expect(reviewReminder(old, today)).toMatch(/lv-x: last reviewed 2026-10-01 \(51 days ago\)/);
    expect(reviewReminder({ ...old, reviewed: '2026-11-01' }, today)).toBeUndefined();
    expect(reviewReminder({ ...old, status: 'no-calendar' }, today)).toBeUndefined();
  });
});
