import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bruegelAdapter, ecfrAdapter, parseBruegelDetail, parseBruegelList, parseEcfrList, parseEcfrTimes } from '../scrapers/adapters/thinktanks';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('Bruegel', () => {
  const LIST = 'https://www.bruegel.org/events';

  it('reads cards with keywords', () => {
    expect(parseBruegelList(fixture('bruegel-list.html'), LIST)[0]).toEqual({
      title: 'Advancing the Global Gateway',
      url: 'https://www.bruegel.org/event/global-gateway',
      day: '2026-11-30',
      description: 'How can Europe’s partnerships abroad build resilience at home?',
      labels: ['global governance', 'investment'],
    });
  });

  it('separates date, venue and capitalised notices', () => {
    expect(parseBruegelDetail(fixture('bruegel-event.html'))).toEqual({
      dateText: '30 November 2026 11:30-12:30 (CET)',
      location: 'Bruegel Events Suite',
      notes: 'Bruegel Events Suite CAPACITY IS LIMITED: KINDLY REGISTER YOUR INTEREST AND WAIT FOR CONFIRMATION.',
      body: expect.stringContaining('Panel discussion with speakers'),
    });
  });

  it('skips past and online events, marks registration', async () => {
    const pages: Record<string, string> = {
      [LIST]: fixture('bruegel-list.html'),
      'https://www.bruegel.org/event/global-gateway': fixture('bruegel-event.html'),
      'https://www.bruegel.org/event/online-one': fixture('bruegel-online.html'),
    };
    const requested: string[] = [];
    const events = await bruegelAdapter({ id: 'bruegel', organiser: 'Bruegel', listUrl: LIST }).fetch({
      get: async (url) => (requested.push(url), pages[url] ?? ''),
    });
    expect(requested).not.toContain('https://www.bruegel.org/event/old-one');
    expect(events).toEqual([
      expect.objectContaining({ id: 'bruegel:global-gateway', start: '2026-11-30T11:30', end: '2026-11-30T12:30', location: 'Bruegel Events Suite', registration: 'required', categories: ['policy'] }),
    ]);
  });
});

describe('ECFR', () => {
  const LIST = 'https://ecfr.eu/events/';

  it('reads teasers with location and programme', () => {
    expect(parseEcfrList(fixture('ecfr-list.html'), LIST).map((i) => [i.title, i.day, i.location, i.labels])).toEqual([
      ['ECFR Election Update', '2026-11-25', 'Online', ['Middle East and North Africa']],
      ['Roundtable on European defence', '2026-12-02', 'Brussels', ['European Power']],
    ]);
  });

  it("uses the event's own start/end times, not those of other events", () => {
    expect(parseEcfrTimes(fixture('ecfr-event.html'))).toEqual({ start: '2026-12-02T17:00', end: '2026-12-02T18:30' });
  });

  it('drops online events without fetching them', async () => {
    const requested: string[] = [];
    const events = await ecfrAdapter({ id: 'ecfr', organiser: 'ECFR', listUrl: LIST }).fetch({
      get: async (url) => (requested.push(url), url === LIST ? fixture('ecfr-list.html') : fixture('ecfr-event.html')),
    });
    expect(requested).toEqual([LIST, 'https://ecfr.eu/event/brussels-roundtable/']);
    expect(events).toEqual([
      expect.objectContaining({ id: 'ecfr:brussels-roundtable', start: '2026-12-02T17:00', location: 'Brussels', categories: ['policy', 'party'] }),
    ]);
  });
});

describe('EPC, Friends of Europe (event pages as text)', () => {
  it('reads EPC date, times and format from the page text', async () => {
    const { parseEpcPage } = await import('../scrapers/adapters/thinktanks');
    expect(parseEpcPage(fixture('epc-event.html'))).toMatchObject({
      title: "EPC Outlook Forum | Democracy under pressure: Navigating Europe's defining choices for 2027",
      start: '2026-12-02T14:00',
      end: '2026-12-02T18:30',
      format: 'In Person',
    });
  });

  it('reads Friends of Europe times as shown, despite the +00:00 label', async () => {
    const { parseFriendsOfEuropePage } = await import('../scrapers/adapters/thinktanks');
    expect(parseFriendsOfEuropePage(fixture('fofe-event.html'))).toMatchObject({
      start: '2026-12-01T19:00',
      end: '2026-12-01T21:30',
      format: 'In person',
      teaser: 'European leaders and stakeholders discuss the future of Earth observation.',
    });
  });

  it('without an About block, labels come from the description, not the whole page', async () => {
    const { parseFriendsOfEuropePage } = await import('../scrapers/adapters/thinktanks');
    const html = `<html><head><meta name="description" content="A summit on EU enlargement."></head><body><main>
      <div class="e-head"><span class="e-head__relative__label">In person</span><h1>Enlargement Summit</h1>
      <div class="e-head__times"><time datetime="2026-12-10T09:00:00+00:00">09:00</time></div></div>
      <div class="speakers">Former football player, runs a film festival, hosted the reception.</div></main></body></html>`;
    expect(parseFriendsOfEuropePage(html)?.text.trim()).toBe('A summit on EU enlargement.');
  });

  it('collects unique event links and skips online-only events', async () => {
    const { findEventLinks, linkListAdapter, parseFriendsOfEuropePage } = await import('../scrapers/adapters/thinktanks');
    const LIST = 'https://www.friendsofeurope.org/events/';
    const pattern = /^https:\/\/www\.friendsofeurope\.org\/events\/[a-z0-9-]{12,}$/;
    expect(findEventLinks(fixture('linklist.html'), LIST, pattern)).toEqual([
      'https://www.friendsofeurope.org/events/from-satellites-to-policy-how-copernicus',
      'https://www.friendsofeurope.org/events/webinar-on-digital-markets',
    ]);
    const adapter = linkListAdapter({ id: 'fofe', organiser: 'Friends of Europe', listUrl: LIST, linkPattern: pattern }, parseFriendsOfEuropePage);
    const events = await adapter.fetch({
      get: async (url) => (url === LIST ? fixture('linklist.html') : url.includes('webinar') ? fixture('fofe-online.html') : fixture('fofe-event.html')),
    });
    expect(events).toEqual([
      expect.objectContaining({ id: 'fofe:from-satellites-to-policy-how-copernicus', start: '2026-12-01T19:00', registration: 'invitation', categories: [] }),
    ]);
  });
});
