import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findLinks, jsonLdAdapter, parseJsonLdEvents } from '../scrapers/adapters/jsonld';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LIST = 'https://www.degb.be/termine';
const PATTERN = /^https:\/\/www\.degb\.be\/events-1\/[^/]+$/;

describe('parseJsonLdEvents', () => {
  it('reads schema.org Events, converting times to Brussels local time', () => {
    expect(parseJsonLdEvents(fixture('jsonld-basar.html'))).toEqual([
      {
        name: 'Adventsbasar',
        start: '2026-11-28T13:00',
        end: '2026-11-28T18:00',
        location: 'Forum, Foyer, Kirche + Räume 1. Stock, Av. Salomé 7, 1150 Bruxelles, Belgien',
        description: 'Basar mit Kuchen, Glühwein und Handarbeiten.',
        url: undefined,
        cancelled: false,
      },
    ]);
  });

  it('finds events inside @graph and keeps date-only values all-day', () => {
    expect(parseJsonLdEvents(fixture('jsonld-gent.html'))).toMatchObject([{ name: 'Ausflug', start: '2026-12-12', location: 'Treffpunkt Bahnhof, Gent' }]);
  });
});

describe('findLinks', () => {
  it('keeps unique detail links without query strings, ignoring share links', () => {
    expect(findLinks(fixture('jsonld-list.html'), LIST, PATTERN)).toEqual([
      'https://www.degb.be/events-1/adventsbasar-2',
      'https://www.degb.be/events-1/gottesdienst-mit-abendmahl',
      'https://www.degb.be/events-1/ausflug-nach-gent',
    ]);
  });
});

describe('jsonLdAdapter', () => {
  it('skips excluded titles and events outside Brussels', async () => {
    const pages: Record<string, string> = {
      [LIST]: fixture('jsonld-list.html'),
      'https://www.degb.be/events-1/adventsbasar-2': fixture('jsonld-basar.html'),
      'https://www.degb.be/events-1/gottesdienst-mit-abendmahl': fixture('jsonld-service.html'),
      'https://www.degb.be/events-1/ausflug-nach-gent': fixture('jsonld-gent.html'),
    };
    const adapter = jsonLdAdapter({
      id: 'degb',
      organiser: 'Emmausgemeinde',
      country: 'DE',
      listUrl: LIST,
      linkPattern: PATTERN,
      exclude: /gottesdienst/i,
    });
    const events = await adapter.fetch({ get: async (url) => pages[url] ?? '' });
    expect(events).toEqual([
      expect.objectContaining({
        id: 'degb:adventsbasar-2:2026-11-28',
        title: 'Adventsbasar',
        url: 'https://www.degb.be/events-1/adventsbasar-2',
        categories: ['christmas-market'],
        source: 'degb',
      }),
    ]);
  });
});
