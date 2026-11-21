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
export type WatchStatus = 'no-calendar' | 'blocked' | 'not-located';

export interface WatchEntry {
  id: string;
  organiser: string;
  status: WatchStatus;
  url?: string;
  reviewed: string;
  note?: string;
}

export const watchlist: WatchEntry[] = [
  // Group A: state level (DE)
  { id: 'lv-bw', organiser: 'Vertretung des Landes Baden-Württemberg bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://im.baden-wuerttemberg.de/de/europa/vertretung-bei-der-eu' },
  { id: 'lv-by', organiser: 'Vertretung des Freistaates Bayern bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.bayern.de/staatskanzlei/bayern-in-bruessel/' },
  { id: 'lv-be', organiser: 'Büro des Landes Berlin bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.berlin.de/sen/europa/buero-bruessel/', note: 'RSS exists but empty; event newsletter available' },
  { id: 'lv-hanse', organiser: 'Hanse-Office (Hamburg & Schleswig-Holstein)', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://hanse-office.de/category/veranstaltungen-termine/', note: 'feed has after-event posts only' },
  { id: 'lv-he', organiser: 'Vertretung des Landes Hessen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://staatskanzlei.hessen.de/berlin-europa-und-die-welt/hessen-in-europa/vertretung-des-landes-hessen-bei-der-europaeischen-union' },
  { id: 'lv-ni', organiser: 'Vertretung des Landes Niedersachsen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.stk.niedersachsen.de/startseite/die_staatskanzlei/niedersachsische_landesvertretung_bei_der_eu/veranstaltungen_und_besuchergruppen/veranstaltungen-und-besuchergruppen-243358.html' },
  { id: 'lv-sn', organiser: 'Vertretung des Freistaates Sachsen bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.bxl.sachsen.de/veranstaltungen-3973.html' },
  { id: 'lv-st', organiser: 'Vertretung des Landes Sachsen-Anhalt bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://europa.sachsen-anhalt.de/die-landesvertretung/veranstaltungen' },
  { id: 'staev', organiser: 'Ständige Vertretung Deutschlands bei der EU', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://bruessel-eu.diplo.de/eu-de' },
  { id: 'botschaft-be', organiser: 'Deutsche Botschaft Brüssel', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://bruessel.diplo.de/be-de' },
  { id: 'goethe-bxl', organiser: 'Goethe-Institut Brüssel', status: 'blocked', reviewed: '2026-11-21', url: 'https://www.goethe.de/ins/be/de/ver.cfm', note: 'real calendar; 403 for non-browser clients, ask for permission/feed' },
  { id: 'lv-sl', organiser: 'Vertretung des Saarlandes bei der EU', status: 'blocked', reviewed: '2026-11-21', url: 'https://www.saarland.de/', note: 'bot protection; Brussels page not located either' },
  { id: 'euagenda', organiser: 'EU Agenda (aggregator)', status: 'blocked', reviewed: '2026-11-21', url: 'https://euagenda.eu/', note: 'Cloudflare; check terms/API' },
  { id: 'lv-bb', organiser: 'Vertretung des Landes Brandenburg bei der EU', status: 'not-located', reviewed: '2026-11-21', note: 'invitation PDFs on brandenburg.de media_fast/365' },
  { id: 'lv-hb', organiser: 'Vertretung der Freien Hansestadt Bremen bei der EU', status: 'not-located', reviewed: '2026-11-21' },
  { id: 'lv-mv', organiser: 'Vertretung des Landes Mecklenburg-Vorpommern bei der EU', status: 'not-located', reviewed: '2026-11-21', note: 'site moved to land-mv.de' },
  { id: 'lv-nrw', organiser: 'Vertretung des Landes Nordrhein-Westfalen bei der EU', status: 'not-located', reviewed: '2026-11-21' },
  { id: 'lv-rp', organiser: 'Vertretung des Landes Rheinland-Pfalz bei der EU', status: 'not-located', reviewed: '2026-11-21' },
  { id: 'lv-th', organiser: 'Vertretung des Freistaats Thüringen bei der EU', status: 'not-located', reviewed: '2026-11-21' },

  // Group B: political foundations (Böll and Rosa-Luxemburg are candidates for adapters)
  { id: 'fes-bxl', organiser: 'Friedrich-Ebert-Stiftung EU Office', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://brussels.fes.de/events.html', note: 'event list exists but is empty' },
  { id: 'kas-bxl', organiser: 'Konrad-Adenauer-Stiftung Europabüro Brüssel', status: 'blocked', reviewed: '2026-11-21', url: 'https://www.kas.de/de/web/bruessel/veranstaltungen', note: 'web application firewall' },
  { id: 'fnf-europe', organiser: 'Friedrich-Naumann-Stiftung Europe', status: 'no-calendar', reviewed: '2026-11-21', url: 'https://www.freiheit.org/europe', note: 'restructured Feb 2026' },
  // Group D: community
  { id: 'st-paulus', organiser: 'Kath. Gemeinde deutscher Sprache St. Paulus', status: 'not-located', reviewed: '2026-11-21', note: 'sankt-paulus.eu not reachable; ecumenical events show up in the degb calendar' },
  { id: 'hss-bxl', organiser: 'Hanns-Seidel-Stiftung', status: 'not-located', reviewed: '2026-11-21', note: 'hss.de/veranstaltungen only lists Bavarian seminars; Brussels page not found' },
];
