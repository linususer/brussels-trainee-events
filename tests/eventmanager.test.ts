import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';
import { eventManagerAdapter, parsePortalDates, parsePortalDescription, parsePortalList, parsePortalSentenceDate } from '../scrapers/adapters/eventmanager';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const START = 'https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE';

describe('registration portal (eventmanager-system)', () => {
  it('lists public events with their portal id, title and venue', () => {
    expect(parsePortalList(fixture('portal-start.html'), START)).toEqual([
      {
        eventId: '3E268',
        title: 'Filmvorführung "Ash and Crayons"',
        url: 'https://bruessel.veranstaltungen.land.nrw/event.php?vnrtoken=ABC%2B123&intLinkSource=OVLEventName',
        location: 'Vertretung des Landes Nordrhein-Westfalen bei der Europäischen Union, Rue Montoyer 47, 1000 Brüssel',
      },
      expect.objectContaining({ eventId: '4F001', location: 'Staatskanzlei, Düsseldorf' }),
    ]);
  });

  it('reads the date spans shown in lists and on closed event pages', () => {
    const html = `<p class="OVListDate"><span class="EventDatesSD"><span class="EventDatesDateStart">16. November 2026, </span>
      <span class="EventDatesTimeStart">18:00</span> <span class="EventDatesDelimiter">bis </span><span class="EventDatesTimeEnd">22:00</span></span></p>`;
    expect(parsePortalDates(cheerio.load(html)('body'))).toEqual({ start: '2026-11-16T18:00', end: '2026-11-16T22:00' });
    const multi = '<span class="EventDatesDateStart">3. Dezember 2026</span><span class="EventDatesDateEnd">5. Dezember 2026</span>';
    expect(parsePortalDates(cheerio.load(multi)('body'))).toEqual({ start: '2026-12-03', end: '2026-12-05' });
    expect(parsePortalDates(cheerio.load('<p>no dates</p>')('body'))).toEqual({});
  });

  it('keeps an event whose page lost its JSON-LD after the registration deadline', async () => {
    const list = `<div id="OffeneVeranstaltungen"><ul><li class="OLVListEvent_1E55"><h2 class="OVListEventname"><a href="/event.php?vnrtoken=Q">Die GAP nach 2027</a></h2>
      <p class="OVListDate"><span class="EventDatesDateStart">16. Dezember 2026, </span><span class="EventDatesTimeStart">18:00</span><span class="EventDatesTimeEnd">22:00</span></p>
      <p class="OVListLocation">Vertretung des Landes Rheinland-Pfalz bei der EU</p></li></ul></div>`;
    const closed = '<html><body><p>Die Anmeldefrist für die Veranstaltung ist leider abgelaufen.</p></body></html>';
    const adapter = eventManagerAdapter({ id: 'lv-rp', organiser: 'LV RP', startUrl: 'https://bruessel.landesvertretung-rlp.de/' });
    const events = await adapter.fetch({ get: async (url) => (url.endsWith('/') ? list : closed) });
    expect(events).toEqual([expect.objectContaining({ id: 'lv-rp:1E55', start: '2026-12-16T18:00', end: '2026-12-16T22:00', categories: [] })]);
  });

  it('keeps address lines apart', () => {
    const html = `<div id="OffeneVeranstaltungen"><ul><li class="OLVListEvent_9A1"><h2 class="OVListEventname"><a href="/event.php?x=1">Lesung</a></h2>
      <p class="OVListLocation">Vertretung des Landes Sachsen-Anhalt bei der EU<br>Boulevard Saint Michel 80<br>1040 Brüssel</p></li></ul></div>`;
    expect(parsePortalList(html, START)[0].location).toBe('Vertretung des Landes Sachsen-Anhalt bei der EU Boulevard Saint Michel 80 1040 Brüssel');
  });

  it('reads the date sentence of older portal versions, and only that sentence', () => {
    const page = `<html><body><p>Stand 01.01.2026</p><h1>Debriefing zum Europäischen Rat</h1>
      <p>Schön, dass Sie sich für die Veranstaltung am Montag, 30.11.2026 um 16:30 Uhr (Einlass ab 16:00 Uhr) in der Vertretung anmelden möchten.</p></body></html>`;
    expect(parsePortalSentenceDate(page)).toEqual({ start: '2026-11-30T16:30' });
    expect(parsePortalSentenceDate('<p>Stand 01.01.2026</p>')).toEqual({});
  });

  it('accepts an empty list but fails loudly when the layout changed', () => {
    const empty = '<div id="OffeneVeranstaltungen"><p>Zur Zeit sind keine offenen Veranstaltungen verfügbar</p></div>';
    expect(parsePortalList(empty, START)).toEqual([]);
    expect(() => parsePortalList('<html><body>Neues Design</body></html>', START)).toThrow(/layout changed/);
  });

  it('takes the description from the page, not the placeholder in JSON-LD', () => {
    expect(parsePortalDescription(fixture('portal-event.html'))).toBe(
      'Die Landesvertretung lädt ein zur Filmvorführung mit anschließendem Empfang. Ergänzend wird eine Fotoausstellung gezeigt.',
    );
  });

  it('builds Brussels events only, never fetching pages of events elsewhere', async () => {
    const requested: string[] = [];
    const adapter = eventManagerAdapter({ id: 'lv-nrw', organiser: 'LV NRW', country: 'DE', startUrl: START });
    const events = await adapter.fetch({
      get: async (url) => {
        requested.push(url);
        return url === START ? fixture('portal-start.html') : fixture('portal-event.html');
      },
    });
    expect(requested).toHaveLength(2);
    expect(events).toEqual([
      expect.objectContaining({
        id: 'lv-nrw:3E268',
        start: '2026-11-30T17:30',
        end: '2026-11-30T21:00',
        categories: ['party', 'culture'],
        registration: 'required',
        country: 'DE',
      }),
    ]);
  });
});
