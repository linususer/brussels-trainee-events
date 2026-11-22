import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseEventFeed, parseWildApricotEvent, to24h, wildApricotAdapter } from '../scrapers/adapters/ypfp';
import { openEuropaAdapter, parseOeDates, parseOeDetail, parseOeList } from '../scrapers/adapters/openeuropa';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('Wild Apricot (YPFP)', () => {
  it('reads feed items and the date in the title', () => {
    const items = parseEventFeed(fixture('ypfp-feed.xml'));
    expect(items.map((i) => [i.title, i.titleDate])).toEqual([
      ['Advisors Program 2026 (disabled)', '2026-03-31'],
      ['YPFP London Career Accelerator', '2026-12-21'],
      ['YPFP Christmas Pub Quiz', '2026-12-25'],
    ]);
    expect(items[2].description).toBe('YPFP Brussels invites you to the Christmas edition of our Pub Quiz!');
  });

  it('converts 12-hour times', () => {
    expect([to24h('7:00 PM'), to24h('12:15 PM'), to24h('12:30 AM'), to24h('9:05 AM'), to24h('18:30')]).toEqual([
      '19:00', '12:15', '00:30', '09:05', '18:30',
    ]);
  });

  it('reads date, times and venue from the event page', () => {
    expect(parseWildApricotEvent(fixture('ypfp-event-bxl.html'))).toEqual({
      start: '2026-12-25T19:00',
      end: '2026-12-25T22:30',
      location: "1st Floor, Scott's Bar, Rue Montagne aux Herbes Potagères 2, 1000 Bruxelles",
    });
  });

  it('keeps Brussels events only and skips disabled or past items without requesting them', async () => {
    const pages: Record<string, string> = {
      feed: fixture('ypfp-feed.xml'),
      'https://members.ypfp.org/event-2': fixture('ypfp-event-london.html'),
      'https://members.ypfp.org/event-3': fixture('ypfp-event-bxl.html'),
    };
    const requested: string[] = [];
    const events = await wildApricotAdapter({ id: 'ypfp-bxl', organiser: 'YPFP Brussels', feedUrl: 'feed' }).fetch({
      get: async (url) => (requested.push(url), pages[url] ?? ''),
    });
    expect(requested).not.toContain('https://members.ypfp.org/event-1');
    expect(events).toEqual([
      expect.objectContaining({ id: 'ypfp-bxl:3', title: 'YPFP Christmas Pub Quiz', start: '2026-12-25T19:00', categories: ['networking'] }),
    ]);
  });
});

describe('OpenEuropa event lists (House of European History)', () => {
  const LIST = 'https://historia.europa.eu/en/exhibitions-events/events';

  it('reads the cards of the list', () => {
    expect(parseOeList(fixture('oe-list.html'), LIST)).toEqual([
      {
        title: 'An evening with David Van Reybrouck',
        url: 'https://historia.europa.eu/en/exhibitions-events/events/evening-david-van-reybrouck',
        day: '2026-11-26',
        summary: 'An evening on planetary thinking, organised with the Goethe-Institut.',
        type: 'Talks',
        location: 'Brussels, Belgium',
      },
      expect.objectContaining({ title: 'Lunchtime tour - Preparation for a festive season', day: '2026-12-15', summary: undefined }),
    ]);
  });

  it("reads the event's own date and location, not those of related events", () => {
    expect(parseOeDetail(fixture('oe-detail.html'))).toEqual({
      dateText: '26 November 2026, 19:00-21:00 (CET)',
      location: 'House of European History, rue Belliard/straat 135, 1000 Brussels, Belgium',
      overview: 'Event overview A talk and reading, followed by a book signing.',
    });
  });

  it('parses date texts with times, ranges, or nothing', () => {
    expect(parseOeDates('26 November 2026, 19:00-21:00 (CET)', '2026-11-26')).toEqual({ start: '2026-11-26T19:00', end: '2026-11-26T21:00' });
    expect(parseOeDates('3 December 2026 - 5 December 2026', '2026-12-03')).toEqual({ start: '2026-12-03', end: '2026-12-05' });
    expect(parseOeDates(undefined, '2026-12-15')).toEqual({ start: '2026-12-15' });
  });

  it('builds events with page details and list fallbacks', async () => {
    const adapter = openEuropaAdapter({ id: 'hoeh', organiser: 'House of European History', listUrl: LIST });
    const events = await adapter.fetch({
      get: async (url) => (url === LIST ? fixture('oe-list.html') : url.endsWith('reybrouck') ? fixture('oe-detail.html') : '<main></main>'),
    });
    expect(events).toEqual([
      expect.objectContaining({ id: 'hoeh:evening-david-van-reybrouck', start: '2026-11-26T19:00', end: '2026-11-26T21:00', categories: ['culture'], labels: ['Talks'] }),
      expect.objectContaining({ id: 'hoeh:lunchtime-tour-festive', start: '2026-12-15', location: 'Brussels, Belgium', categories: ['culture'] }),
    ]);
  });
});
