import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { corAdapter, isTraineeRelevant, parseCorDates, parseCorList } from '../scrapers/adapters/cor';
import { buildMonths } from '../src/lib/calendar';
import { EventSchema } from '../src/lib/event';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LIST = 'https://cor.europa.eu/en/plenaries-events/upcoming-events';

describe('Committee of the Regions', () => {
  it('reads cards with date, type, location and time', () => {
    expect(parseCorList(fixture('cor-list.html'), LIST)[0]).toEqual({
      title: 'BIOEAST conference',
      url: 'https://cor.europa.eu/en/plenaries-events/bioeast-conference',
      dateText: '25 November 2026',
      type: 'Conference',
      location: 'Brussels (Belgium)',
      timeText: '09:00 - 17:30 (Brussels time)',
    });
  });

  it.each([
    ['25 November 2026', '09:00 - 17:30 (Brussels time)', { start: '2026-11-25T09:00', end: '2026-11-25T17:30' }],
    ['03 - 04 December 2026', 'Multiple day event', { start: '2026-12-03', end: '2026-12-04' }],
    ['27 November - 17 December 2026', 'Multiple day event', { start: '2026-11-27', end: '2026-12-17' }],
    ['28 December - 05 January 2027', '', { start: '2026-12-28', end: '2027-01-05' }],
  ])('%s / %s', (date, time, expected) => {
    expect(parseCorDates(date, time)).toEqual(expected);
  });

  it('keeps exhibitions and flagship events in Brussels; no project conferences, meetings or events elsewhere', async () => {
    const events = await corAdapter({ id: 'cor', organiser: 'CoR', listUrl: LIST, maxPages: 1 }).fetch({ get: async () => fixture('cor-list.html') });
    expect(events.map((e) => [e.id, e.start, e.categories])).toEqual([['cor:shadow-night', '2026-11-27', ['culture']]]);
  });

  it.each([
    ['First Zero Pollution Forum', 'Conference', true],
    ['European Charter for Sustainable Tourism & Star Awards', 'Conference', true],
    ['BIOEAST conference', 'Conference', false],
    ['Shadow of the Night', 'Exhibition', true],
    ['Multi-Level Dialogue', 'Meeting', false],
  ])('%s (%s) → %s', (title, type, expected) => {
    expect(isTraineeRelevant({ title, type })).toBe(expected);
  });

  it('shows long events (exhibitions) on their first day and at the start of later months only', () => {
    const exhibition = EventSchema.parse({ id: 'x', title: 'Shadow of the Night', start: '2026-11-27', end: '2026-12-17', organiser: 'CoR' });
    const conference = EventSchema.parse({ id: 'c', title: 'Conference', start: '2026-12-03', end: '2026-12-04', organiser: 'CoR' });
    const days = buildMonths([exhibition, conference], '2026-11').flatMap((m) => m.weeks.flat()).filter((d) => d.inMonth && d.events.length);
    expect(days.map((d) => [d.date, d.events.map((e) => e.id)])).toEqual([
      ['2026-11-27', ['x']],
      ['2026-12-01', ['x']], // still running in December
      ['2026-12-03', ['c']],
      ['2026-12-04', ['c']],
    ]);
  });
});
