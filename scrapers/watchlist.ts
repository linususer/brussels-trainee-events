/**
 * Sources we could not automate yet. They are re-checked on every
 * `npm run fetch` (see watch.ts) in case they start publishing upcoming
 * events or a feed. Details and reasoning: docs/sources.md.
 *
 * - `no-calendar`: page reachable, but no list of upcoming events
 * - `blocked`: site refuses automated requests; we only check if that changes
 * - `not-located`: no Brussels event page found yet; search again by hand
 *
 * `reviewed` is the date of the last manual look. Blocked and not-located
 * entries are flagged once it is older than 30 days: update it after reviewing.
 */
import type { SourceGroup } from './types';

export type WatchStatus = 'no-calendar' | 'blocked' | 'not-located';

export interface WatchEntry {
  id: string;
  organiser: string;
  status: WatchStatus;
  group: SourceGroup;
  url?: string;
  reviewed: string;
  note?: string;
  /**
   * Where to sign up for invitations or a newsletter that says it covers events
   * (shown on the sources page). General policy newsletters are left out.
   */
  signup?: { url: string; label: string };
}

export const watchlist: WatchEntry[] = [
  // Group A: state level (DE)
  { id: 'lv-bw', group: 'state', organiser: 'Vertretung des Landes Baden-Württemberg bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://im.baden-wuerttemberg.de/de/europa/vertretung-bei-der-eu' },
  { id: 'lv-by', group: 'state', organiser: 'Vertretung des Freistaates Bayern bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.bayern.de/staatskanzlei/bayern-in-bruessel/' },
  { id: 'lv-be', group: 'state', organiser: 'Büro des Landes Berlin bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.berlin.de/sen/europa/buero-bruessel/', note: 'RSS exists but empty', signup: { url: 'https://www.berlin.de/sen/europa/service/veranstaltungsnewsletter/', label: 'Event newsletter' } },
  { id: 'lv-hanse', group: 'state', organiser: 'Hanse-Office (Hamburg & Schleswig-Holstein)', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://hanse-office.de/category/veranstaltungen-termine/', note: 'feed has after-event posts only', signup: { url: 'mailto:events@hanse-office.de', label: 'Ask to be invited: events@hanse-office.de' } },
  { id: 'lv-he', group: 'state', organiser: 'Vertretung des Landes Hessen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://staatskanzlei.hessen.de/berlin-europa-und-die-welt/hessen-in-europa/vertretung-des-landes-hessen-bei-der-europaeischen-union', signup: { url: 'https://staatskanzlei.hessen.de/berlin-europa-und-die-welt/hessen-in-europa/vertretung-des-landes-hessen-bei-der-europaeischen-union/der-hessen-in-europa-newsletter', label: 'Newsletter "Hessen in Europa" (presents its events)' } },
  { id: 'lv-ni', group: 'state', organiser: 'Vertretung des Landes Niedersachsen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.stk.niedersachsen.de/startseite/die_staatskanzlei/niedersachsische_landesvertretung_bei_der_eu/veranstaltungen_und_besuchergruppen/veranstaltungen-und-besuchergruppen-243358.html' },
  { id: 'lv-sn', group: 'state', organiser: 'Vertretung des Freistaates Sachsen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.bxl.sachsen.de/veranstaltungen-3973.html', signup: { url: 'https://www.bxl.sachsen.de/veranstaltungen-3973.html', label: 'Invitation list: email veranstaltung@bxl.sachsen.de (what to send is on this page)' } },
  { id: 'lv-st', group: 'state', organiser: 'Vertretung des Landes Sachsen-Anhalt bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://europa.sachsen-anhalt.de/die-landesvertretung/veranstaltungen' },
  { id: 'lv-bw-portal', group: 'state', organiser: 'Vertretung des Landes Baden-Württemberg bei der EU (registration portal)', status: 'blocked', reviewed: '2026-11-21', url: 'https://event-bw.eu/', note: 'times out for non-browser clients; only booking-number entry, no public list' },
  { id: 'lv-bb', group: 'state', organiser: 'Vertretung des Landes Brandenburg bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.europa-brandenburg.eu/seite/334943/vertretung-bei-der-eu.html', note: 'dates appear in the brandenburg.de Termine list' },
  { id: 'lv-hb', group: 'state', organiser: 'Vertretung der Freien Hansestadt Bremen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://landesportal.bremen.de/bund-europa-international/die-landesvertretung-in-bruessel' },
  { id: 'lv-sl', group: 'state', organiser: 'Vertretung des Saarlandes bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.saarland.de/stk/DE/portale/europa/saarland-in-europa/lv-bruessel', note: 'moving out of Rue du Luxembourg 15 with Grand Est' },
  { id: 'lv-th', group: 'state', organiser: 'Vertretung des Freistaats Thüringen bei der EU', status: 'not-located', reviewed: '2026-11-21', note: 'Rue Frédéric Pelletier 111, 1030; shared with Hauts-de-France; no event page found' },
  { id: 'staev', group: 'state', organiser: 'Ständige Vertretung Deutschlands bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://bruessel-eu.diplo.de/eu-de' },
  { id: 'botschaft-be', group: 'state', organiser: 'Deutsche Botschaft Brüssel', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://bruessel.diplo.de/be-de' },
  { id: 'goethe-bxl', group: 'culture', organiser: 'Goethe-Institut Brüssel', status: 'blocked', reviewed: '2026-11-21', url: 'https://www.goethe.de/ins/be/de/ver.cfm', note: 'real calendar; 403 for non-browser clients, ask for permission/feed', signup: { url: 'https://www.goethe.de/ins/be/de/new.html', label: 'Newsletter "Agenda" (cultural events)' } },
  { id: 'euagenda', group: 'aggregator', organiser: 'EU Agenda (aggregator)', status: 'blocked', reviewed: '2026-11-21', url: 'https://euagenda.eu/', note: 'Cloudflare; check terms/API' },

  // EU-wide: young professional & trainee networks, culture
  { id: 'ecta', group: 'network', organiser: "European Commission Trainees' Committee (ECTA)", status: 'no-calendar', reviewed: '2026-11-22', url: 'https://www.traineescommittee.com/', note: 'events announced via social media and messenger groups; T-Card and guides on the website' },
  { id: 'eunic-bxl', group: 'culture', organiser: 'EUNIC Brussels (cultural institutes of EU member states)', status: 'not-located', reviewed: '2026-11-22', note: 'no public calendar found; announcements on Instagram/LinkedIn/X' },

  { id: 'ceps', group: 'think-tank', organiser: 'Centre for European Policy Studies (CEPS)', status: 'blocked', reviewed: '2026-11-22', url: 'https://www.ceps.eu/ceps-events/', note: 'Cloudflare challenge on event pages; events are free and open to the public' },
  { id: 'carnegie-europe', group: 'think-tank', organiser: 'Carnegie Europe', status: 'no-calendar', reviewed: '2026-11-22', url: 'https://carnegieendowment.org/europe/events', note: 'event list rendered by JavaScript' },

  // Group B: political foundations (Böll and Rosa-Luxemburg are candidates for adapters)
  { id: 'fes-bxl', group: 'foundation', organiser: 'Friedrich-Ebert-Stiftung EU Office', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://brussels.fes.de/events.html', note: 'event list exists but is empty', signup: { url: 'https://brussels.fes.de/newsletter.html', label: 'Newsletter (publications and events)' } },
  { id: 'kas-bxl', group: 'foundation', organiser: 'Konrad-Adenauer-Stiftung Europabüro Brüssel', status: 'blocked', reviewed: '2026-11-21', url: 'https://www.kas.de/de/web/bruessel/veranstaltungen', note: 'web application firewall' },
  { id: 'fnf-europe', group: 'foundation', organiser: 'Friedrich-Naumann-Stiftung Europe', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.freiheit.org/europe', note: 'restructured Feb 2026' },
  { id: 'hss-bxl', group: 'foundation', organiser: 'Hanns-Seidel-Stiftung', status: 'not-located', reviewed: '2026-11-21', note: 'hss.de/veranstaltungen only lists Bavarian seminars; Brussels page not found' },
];
