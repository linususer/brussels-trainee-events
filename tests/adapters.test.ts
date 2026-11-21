import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseIcs, icalAdapter } from '../scrapers/adapters/ical';
import { parseDate, parseHtmlList } from '../scrapers/adapters/html';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parseIcs', () => {
  const events = parseIcs(fixture('sample.ics'), { id: 'lv-test', organiser: 'LV Test', category: 'party', country: 'DE' });

  it('converts timed UTC events to Brussels time', () => {
    expect(events[0]).toMatchObject({
      id: 'lv-test:evt-1@example.org',
      title: 'Adventsempfang',
      start: '2026-12-05T18:00',
      end: '2026-12-05T21:00',
      location: 'Rue Montoyer 1, Brussels',
      url: 'https://example.org/advent',
      category: 'party',
      country: 'DE',
      source: 'lv-test',
    });
  });

  it('stores all-day events with an inclusive end date', () => {
    expect(events[1]).toMatchObject({ start: '2026-12-12', end: '2026-12-13' });
  });

  it('handles TZID times in summer', () => {
    expect(events[2]).toMatchObject({ start: '2026-07-15T18:30', end: undefined });
  });

  it('works through the adapter interface', async () => {
    const adapter = icalAdapter({ id: 'lv-test', organiser: 'LV Test', url: 'https://x/feed.ics' });
    const result = await adapter.fetch({ get: async () => fixture('sample.ics') });
    expect(result).toHaveLength(3);
  });
});

describe('parseDate', () => {
  it.each([
    ['05.12.2026, 18:30 Uhr', '2026-12-05T18:30'],
    ['5. Dezember 2026, 18.30 Uhr', '2026-12-05T18:30'],
    ['Thursday 10 December 2026, 6:00', '2026-12-10T06:00'],
    ['jeudi 3 décembre 2026 19h00', '2026-12-03T19:00'],
    ['2026-12-05 09:15', '2026-12-05T09:15'],
    ['5 März 2027', '2027-03-05'],
    ['demnächst', undefined],
  ])('%s → %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });
});

describe('parseHtmlList', () => {
  const events = parseHtmlList(fixture('listing.html'), {
    id: 'lv-html',
    organiser: 'LV HTML',
    category: 'networking',
    url: 'https://lv.example/veranstaltungen',
    item: '.event-teaser',
    title: 'h3',
    date: '.date',
    location: '.location',
  });

  it('extracts dated items and skips undated ones', () => {
    expect(events.map((e) => e.title)).toEqual(['Networking-Abend für Stagiaires', 'Kamingespräch']);
  });

  it('resolves relative links and fills fields', () => {
    expect(events[0]).toMatchObject({
      start: '2026-12-05T18:30',
      url: 'https://lv.example/events/networking-abend',
      location: 'Landesvertretung, Rue Wiertz 77',
      id: 'lv-html:2026-12-05:networking-abend-fur-stagiaires',
    });
    expect(events[1]).toMatchObject({ start: '2026-12-10', url: 'https://other.example/talk', location: undefined });
  });
});
