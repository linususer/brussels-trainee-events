import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eclAdapter, parseEclList } from '../scrapers/adapters/ecl';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LIST = 'https://commission.europa.eu/get-involved/events_en';

describe('ECL event lists (European Commission)', () => {
  it('reads blocks by their meta icons and drops repeated highlights', () => {
    const items = parseEclList(fixture('ecl-list.html'), LIST);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      title: 'Interpreting Europe Conference',
      url: 'https://commission.europa.eu/get-involved/events/interpreting-europe-conference-2026-11-26_en',
      status: 'Upcoming',
      type: 'Conferences and summits',
      dateText: 'Thursday 26 November 2026, 14:00 - Friday 27 November 2026, 13:15 (CET)',
      location: 'Brussels, Belgium',
      description: undefined,
      livestream: true,
    });
  });

  it('keeps the events of earlier pages when a later page fails', async () => {
    const events = await eclAdapter({ id: 'ec', organiser: 'EC', listUrl: LIST, maxPages: 3 }).fetch({
      get: async (url) => {
        if (url.includes('page=1')) throw new Error('429 Too Many Requests');
        return fixture('ecl-list.html');
      },
    });
    expect(events.map((e) => e.id)).toEqual(['ec:interpreting-europe-conference-2026-11-26']);
  });

  it('keeps upcoming Brussels events and stops paging when nothing new appears', async () => {
    const requested: string[] = [];
    const events = await eclAdapter({ id: 'ec', organiser: 'European Commission', listUrl: LIST, maxPages: 3 }).fetch({
      get: async (url) => (requested.push(url), fixture('ecl-list.html')),
    });
    expect(requested).toEqual([LIST, `${LIST}?page=1`]);
    expect(events).toEqual([
      expect.objectContaining({
        id: 'ec:interpreting-europe-conference-2026-11-26',
        start: '2026-11-26T14:00',
        end: '2026-11-27T13:15',
        categories: ['policy'],
        labels: ['Conferences and summits'],
      }),
    ]);
  });
});
