import type { SourceGroup } from './types';

/**
 * Sources that were researched but are deliberately not tracked (neither
 * automated nor on the watchlist). Shown on the sources page so it is clear
 * they were considered. Details: docs/sources.md.
 */
export interface ConsideredSource {
  id: string;
  organiser: string;
  group: SourceGroup;
  reason: string;
  homepage?: string;
}

export const considered: ConsideredSource[] = [
  { id: 'ep-visits', organiser: 'European Parliament visitor offer', group: 'eu-institution', reason: 'Recurring tours and visits (e.g. lunchtime tours), not dated events', homepage: 'https://visiting.europarl.europa.eu/homepage/pagecontent/offer/lunchtime-tours.html' },
  { id: 'delors-centre', organiser: 'Jacques Delors Centre', group: 'think-tank', reason: 'Events take place in Berlin (Hertie School)', homepage: 'https://www.delorscentre.eu/en/events-at-the-jacques-delors-centre' },
  { id: 'debelux', organiser: 'AHK debelux (chamber of commerce)', group: 'business', reason: 'Mostly B2B webinars; only its receptions are relevant (enter by hand)', homepage: 'https://debelux.ahk.de/de/veranstaltungen' },
  { id: 'degb', organiser: 'Emmausgemeinde (Protestant parish)', group: 'community', reason: 'Church communities are out of scope', homepage: 'https://www.degb.be/termine' },
  { id: 'st-paulus', organiser: 'St. Paulus (Catholic parish)', group: 'community', reason: 'Church communities are out of scope' },
  { id: 'idsb', organiser: 'Internationale Deutsche Schule Brüssel', group: 'community', reason: 'Located outside the Brussels region (Wezembeek-Oppem)', homepage: 'https://www.idsb.eu/' },
];
