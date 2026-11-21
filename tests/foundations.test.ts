import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boellAdapter, parseBoellDetail, parseBoellList } from '../scrapers/adapters/boell';
import { parseRosaluxApi, parseRosaluxDates, rosaluxAdapter } from '../scrapers/adapters/rosalux';
import { summarize } from '../scrapers/text';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LIST = 'https://calendar.boell.de/en/calendar/advancedsearch?f=x';

describe('Böll', () => {
  it('reads list rows with UTC timestamps as Brussels time', () => {
    const items = parseBoellList(fixture('boell-list.html'), LIST);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      nodeId: '900001',
      url: 'https://calendar.boell.de/en/event/test-panel',
      title: 'Test panel on climate policy',
      subtitle: 'With reception',
      type: 'Panel Discussion',
      start: '2026-12-01T14:00',
      end: '2026-12-01T16:00',
      city: 'Brussels',
    });
    expect(items[1]).toMatchObject({ url: 'https://calendar.boell.de/en/event/berlin-workshop', city: 'Berlin' });
    expect(items[2]).toMatchObject({ start: '2026-07-01T12:00', end: undefined, city: undefined });
  });

  it('reads the body and treats the address placeholder as missing', () => {
    expect(parseBoellDetail(fixture('boell-detail.html'))).toEqual({
      body: 'Experts discuss the EU climate agenda. The panel is followed by a reception. Registration required.',
      address: undefined,
    });
  });

  it('builds events for Brussels (and unknown) cities only, labelled from their own content', async () => {
    const pages: Record<string, string> = {
      [LIST]: fixture('boell-list.html'),
      'https://calendar.boell.de/en/event/test-panel': fixture('boell-detail.html'),
    };
    const requested: string[] = [];
    const adapter = boellAdapter({ id: 'boell-eu', organiser: 'Böll EU', country: 'DE', listUrl: LIST });
    const events = await adapter.fetch({
      get: async (url) => {
        requested.push(url);
        return pages[url] ?? '';
      },
    });

    expect(requested).not.toContain('https://calendar.boell.de/en/event/berlin-workshop');
    // 900002 is in Berlin, 900003 is an online event without a city.
    expect(events.map((e) => e.id)).toEqual(['boell-eu:900001']);
    expect(events[0]).toMatchObject({
      title: 'Test panel on climate policy: With reception',
      location: 'Brussels',
      labels: ['Panel Discussion'],
      categories: ['policy', 'party'],
      registration: 'required',
      country: 'DE',
    });
  });
});

describe('Rosa-Luxemburg-Stiftung', () => {
  it('reads titles, venues, types and hosts from the WordPress API', () => {
    const [forum, panel] = parseRosaluxApi(JSON.parse(fixture('rosalux-api.json')));
    expect(forum).toMatchObject({ day: '2026-12-11', venues: ['Berlin'], hosts: ['European Left', 'Rosa Luxemburg Stiftung'] });
    expect(panel).toMatchObject({ title: 'Podiumsdiskussion – Arbeit & Klima', venues: ['1000 Brussels'], hosts: [] });
  });

  it('takes dates from the event page, not the post time', () => {
    expect(parseRosaluxDates(fixture('rosalux-multiday.html'))).toEqual({ start: '2026-12-11', end: '2026-12-13' });
    expect(parseRosaluxDates(fixture('rosalux-timed.html'))).toEqual({ start: '2026-12-03T18:30', end: '2026-12-03T20:00' });
  });

  it('skips the Berlin event without fetching its page', async () => {
    const requested: string[] = [];
    const adapter = rosaluxAdapter({ id: 'rosalux-bxl', organiser: 'RLS Brussels', country: 'DE', baseUrl: 'https://rosalux.eu' });
    const events = await adapter.fetch({
      get: async (url) => {
        requested.push(url);
        if (url.includes('/wp-json/')) return fixture('rosalux-api.json');
        return fixture('rosalux-timed.html');
      },
    });
    expect(requested).toEqual([
      'https://rosalux.eu/wp-json/wp/v2/termine?per_page=50&_embed=wp:term',
      'https://rosalux.eu/termine/podiumsdiskussion/',
    ]);
    expect(events).toEqual([
      expect.objectContaining({
        id: 'rosalux-bxl:9990',
        start: '2026-12-03T18:30',
        end: '2026-12-03T20:00',
        organiser: 'RLS Brussels',
        location: '1000 Brussels',
        categories: ['policy', 'party'],
      }),
    ]);
  });
});

describe('summarize', () => {
  it('keeps short texts and cuts long ones at a sentence or word', () => {
    expect(summarize('Short.')).toBe('Short.');
    const long = 'First sentence is here. ' + 'word '.repeat(80);
    expect(summarize(long, 40)).toBe('First sentence is here.');
    expect(summarize('word '.repeat(80), 30)).toMatch(/^(word ){5}word …$|^(word )+…$/);
  });
});
