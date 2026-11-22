import type { Adapter } from './types';
import { boellAdapter } from './adapters/boell';
import { rosaluxAdapter } from './adapters/rosalux';
import { eventManagerAdapter } from './adapters/eventmanager';
import { wildApricotAdapter } from './adapters/ypfp';
import { openEuropaAdapter } from './adapters/openeuropa';
import { bruegelAdapter, ecfrAdapter, linkListAdapter, parseEpcPage, parseFriendsOfEuropePage } from './adapters/thinktanks';
import { eclAdapter } from './adapters/ecl';
// import { corAdapter } from './adapters/cor'; // paused, see below
import { eescAdapter } from './adapters/eesc';
// import { jsonLdAdapter } from './adapters/jsonld';
// import { icalAdapter } from './adapters/ical';
// import { htmlListAdapter } from './adapters/html';

/**
 * All automated sources. Prefer an .ics or RSS feed where a site offers one;
 * fall back to `htmlListAdapter` with CSS selectors taken from the page.
 * Check each site's robots.txt and terms before adding it.
 * Scope: public events in Brussels only; set `country` to the community addressed.
 * Categories are never set per source: they are derived per event in src/lib/classify.ts.
 *
 * Examples (the URLs and selectors are placeholders, not real endpoints):
 *
 *   icalAdapter({
 *     id: 'lv-example',
 *     organiser: 'Vertretung des Landes Beispiel bei der EU',
 *     country: 'DE',
 *     url: 'https://example.org/veranstaltungen.ics',
 *   }),
 *
 *   htmlListAdapter({
 *     id: 'alumni-example',
 *     organiser: 'Example Alumni Network Brussels',
 *     url: 'https://example.org/events',
 *     item: '.event-teaser',
 *     title: 'h3',
 *     date: '.date',
 *     location: '.location',
 *     labels: '.tag',
 *   }),
 */
export const sources: Adapter[] = [
  boellAdapter({
    id: 'boell-eu',
    organiser: 'Heinrich-Böll-Stiftung, EU office',
    country: 'DE',
    group: 'foundation',
    homepage: 'https://eu.boell.org/en/events',
    // Calendar filtered to events of the Brussels EU office.
    listUrl: 'https://calendar.boell.de/en/calendar/advancedsearch?f%5B0%5D=webseiten_zuordnung_des_termins%3A3619',
  }),
  rosaluxAdapter({
    id: 'rosalux-bxl',
    organiser: 'Rosa-Luxemburg-Stiftung, Brussels office',
    country: 'DE',
    group: 'foundation',
    homepage: 'https://rosalux.eu/termine/',
    baseUrl: 'https://rosalux.eu',
  }),
  // State representations using the same online registration portal ("Offene Veranstaltungen").
  eventManagerAdapter({
    id: 'lv-nrw',
    organiser: 'Vertretung des Landes Nordrhein-Westfalen bei der EU',
    country: 'DE',
    group: 'state',
    homepage: 'https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE',
    startUrl: 'https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE',
  }),
  eventManagerAdapter({
    id: 'lv-rp',
    organiser: 'Vertretung des Landes Rheinland-Pfalz bei der EU',
    country: 'DE',
    group: 'state',
    homepage: 'https://bruessel.landesvertretung-rlp.de/',
    startUrl: 'https://bruessel.landesvertretung-rlp.de/',
  }),
  eventManagerAdapter({
    id: 'lv-mv',
    organiser: 'Vertretung des Landes Mecklenburg-Vorpommern bei der EU',
    country: 'DE',
    group: 'state',
    homepage: 'https://eu.landesvertretung-mv.de/',
    startUrl: 'https://eu.landesvertretung-mv.de/',
  }),
  eventManagerAdapter({
    id: 'lv-st',
    organiser: 'Vertretung des Landes Sachsen-Anhalt bei der EU',
    country: 'DE',
    group: 'state',
    homepage: 'https://lv-bxl.sachsen-anhalt-events.de/',
    startUrl: 'https://lv-bxl.sachsen-anhalt-events.de/',
  }),
  eventManagerAdapter({
    id: 'lv-bw',
    organiser: 'Vertretung des Landes Baden-Württemberg bei der EU',
    country: 'DE',
    group: 'state',
    homepage: 'https://event-bw.eu/index.php?Locale=de_DE',
    // The public list only appears in the German version of the portal.
    startUrl: 'https://event-bw.eu/index.php?Locale=de_DE',
  }),
  // EU-wide sources (no country tag).
  wildApricotAdapter({
    id: 'ypfp-bxl',
    organiser: 'YPFP Brussels (Young Professionals in Foreign Policy)',
    group: 'network',
    homepage: 'https://www.ypfp.org/brussels',
    // Feed covers all branches; the adapter keeps events located in Brussels.
    feedUrl: 'https://members.ypfp.org/events/RSS',
  }),
  openEuropaAdapter({
    id: 'hoeh',
    organiser: 'House of European History',
    group: 'eu-institution',
    homepage: 'https://historia.europa.eu/en/exhibitions-events/events',
    listUrl: 'https://historia.europa.eu/en/exhibitions-events/events',
  }),
  bruegelAdapter({
    id: 'bruegel',
    organiser: 'Bruegel',
    group: 'think-tank',
    homepage: 'https://www.bruegel.org/events',
    listUrl: 'https://www.bruegel.org/events',
  }),
  ecfrAdapter({
    id: 'ecfr',
    organiser: 'European Council on Foreign Relations (ECFR)',
    group: 'think-tank',
    homepage: 'https://ecfr.eu/events/',
    // Many events are online or in other capitals; only Brussels ones are kept.
    listUrl: 'https://ecfr.eu/events/',
  }),
  linkListAdapter(
    {
      id: 'epc',
      organiser: 'European Policy Centre (EPC)',
      group: 'think-tank',
      homepage: 'https://www.epc.eu/events/',
      listUrl: 'https://www.epc.eu/events/',
      linkPattern: /^https:\/\/www\.epc\.eu\/events\/[a-z0-9-]{12,}$/,
    },
    parseEpcPage,
  ),
  linkListAdapter(
    {
      id: 'friends-of-europe',
      organiser: 'Friends of Europe',
      group: 'think-tank',
      homepage: 'https://www.friendsofeurope.org/events/',
      listUrl: 'https://www.friendsofeurope.org/events/',
      linkPattern: /^https:\/\/www\.friendsofeurope\.org\/events\/[a-z0-9-]{12,}$/,
    },
    parseFriendsOfEuropePage,
  ),
  eclAdapter({
    id: 'ec-events',
    organiser: 'European Commission',
    group: 'eu-institution',
    homepage: 'https://commission.europa.eu/get-involved/events_en',
    // List pages carry date, time and location; europa.eu is fetched at 1 request per 6 s.
    listUrl: 'https://commission.europa.eu/get-involved/events_en',
    maxPages: 3,
  }),
  // Committee of the Regions: connector built and tested (scrapers/adapters/cor.ts, tests/cor.test.ts),
  // paused for now. To enable it, uncomment this block and the corAdapter import above;
  // then remove the 'cor' entry from scrapers/considered.ts.
  // corAdapter({
  //   id: 'cor',
  //   organiser: 'European Committee of the Regions',
  //   group: 'eu-institution',
  //   homepage: 'https://cor.europa.eu/en/plenaries-events/upcoming-events',
  //   // Only public formats (conferences, exhibitions, ...) in Brussels; internal meetings are skipped.
  //   listUrl: 'https://cor.europa.eu/en/plenaries-events/upcoming-events',
  //   maxPages: 2,
  // }),
  eescAdapter({
    id: 'eesc',
    organiser: 'European Economic and Social Committee (EESC)',
    group: 'eu-institution',
    homepage: 'https://www.eesc.europa.eu/en/agenda/our-events/upcoming-events',
    // Only public events in Brussels; meetings, online events and year-long entries are skipped.
    listUrl: 'https://www.eesc.europa.eu/en/agenda/our-events/upcoming-events',
    maxPages: 2,
  }),
];
