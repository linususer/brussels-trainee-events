import type { Adapter } from './types';
import { boellAdapter } from './adapters/boell';
import { rosaluxAdapter } from './adapters/rosalux';
import { eventManagerAdapter } from './adapters/eventmanager';
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
    // Calendar filtered to events of the Brussels EU office.
    listUrl: 'https://calendar.boell.de/en/calendar/advancedsearch?f%5B0%5D=webseiten_zuordnung_des_termins%3A3619',
  }),
  rosaluxAdapter({
    id: 'rosalux-bxl',
    organiser: 'Rosa-Luxemburg-Stiftung, Brussels office',
    country: 'DE',
    baseUrl: 'https://rosalux.eu',
  }),
  // State representations using the same online registration portal ("Offene Veranstaltungen").
  eventManagerAdapter({
    id: 'lv-nrw',
    organiser: 'Vertretung des Landes Nordrhein-Westfalen bei der EU',
    country: 'DE',
    startUrl: 'https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE',
  }),
  eventManagerAdapter({
    id: 'lv-rp',
    organiser: 'Vertretung des Landes Rheinland-Pfalz bei der EU',
    country: 'DE',
    startUrl: 'https://bruessel.landesvertretung-rlp.de/',
  }),
  eventManagerAdapter({
    id: 'lv-mv',
    organiser: 'Vertretung des Landes Mecklenburg-Vorpommern bei der EU',
    country: 'DE',
    startUrl: 'https://eu.landesvertretung-mv.de/',
  }),
];
