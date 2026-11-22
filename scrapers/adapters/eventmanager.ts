import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDate } from './html';
import { parseJsonLdEvents } from './jsonld';
import { htmlToText, summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * Online registration portals ("Online Veranstaltungs-Anmeldung") used by
 * several state representations (NRW, Rheinland-Pfalz, Mecklenburg-Vorpommern).
 * The start page lists public events ("Offene Veranstaltungen"); each event
 * page has schema.org JSON-LD for dates and venue and the full text in `.LongDes`.
 * We only read these pages and never submit the registration form.
 */
export interface PortalListItem {
  /** Portal-internal event id from the list entry's class, e.g. `3E268`. */
  eventId: string;
  title: string;
  url: string;
  location?: string;
  /** Dates shown in the list (some portals show them, some don't). */
  start?: string;
  end?: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Reads the portal's date spans (`EventDatesDateStart`, `EventDatesTimeStart`, ...).
 * Used when an event page has no JSON-LD, e.g. after its registration deadline.
 */
export function parsePortalDates(scope: cheerio.Cheerio<any>): { start?: string; end?: string } {
  const span = (cls: string) => clean(scope.find(`.${cls}`).first().text()).replace(/,$/, '');
  const startDay = parseDate(span('EventDatesDateStart'))?.slice(0, 10);
  if (!startDay) return {};
  const endDay = parseDate(span('EventDatesDateEnd'))?.slice(0, 10) ?? startDay;
  const time = (s: string) => s.match(/^(\d{1,2})[:.](\d{2})/)?.slice(1, 3).map((x) => x.padStart(2, '0')).join(':');
  const t1 = time(span('EventDatesTimeStart'));
  const t2 = time(span('EventDatesTimeEnd'));
  if (!t1) return { start: startDay, end: endDay > startDay ? endDay : undefined };
  return { start: `${startDay}T${t1}`, end: t2 ? `${endDay}T${t2}` : undefined };
}

export function parsePortalList(html: string, pageUrl: string): PortalListItem[] {
  const $ = cheerio.load(html);
  // An empty list still has the container; a missing one means the layout changed.
  if ($('#OffeneVeranstaltungen').length === 0) throw new Error('list container #OffeneVeranstaltungen not found (layout changed?)');
  const items: PortalListItem[] = [];
  $('#OffeneVeranstaltungen li[class*="OLVListEvent_"]').each((_, el) => {
    const li = $(el);
    const eventId = (li.attr('class') ?? '').match(/OLVListEvent_([A-Za-z0-9]+)/)?.[1];
    const link = li.find('.OVListEventname a[href]').first();
    const title = clean(link.text());
    if (!eventId || !title) return;
    items.push({
      eventId,
      title,
      url: new URL(link.attr('href')!, pageUrl).href,
      // Address lines are separated by <br>, which plain .text() would glue together.
      location: htmlToText(li.find('.OVListLocation').first().html() ?? '').replace(/\s+,/g, ',') || undefined,
      ...parsePortalDates(li),
    });
  });
  return items;
}

/** Full description from the event page (the JSON-LD description is often a placeholder). */
export function parsePortalDescription(html: string): string | undefined {
  const $ = cheerio.load(html);
  const text = $('.LongDes')
    .map((_, el) => htmlToText($(el).html() ?? ''))
    .get()
    .join(' ')
    .trim();
  return text || undefined;
}

/**
 * Older portal versions (e.g. Baden-Württemberg) only state the date in a
 * sentence: "… für die Veranstaltung am Montag, 30.11.2026 um 16:30 Uhr …".
 * Only that phrase is read, so other dates on the page are never picked up.
 */
export function parsePortalSentenceDate(html: string): { start?: string } {
  const $ = cheerio.load(html);
  $('script, style').remove();
  const text = $('body').text().replace(/\s+/g, ' ');
  const m = text.match(/Veranstaltung am\s+(?:[A-Za-zÄÖÜäöü]+,\s*)?(\d{1,2}\.\d{1,2}\.\d{4}(?:\s+um\s+\d{1,2}[:.]\d{2})?)/);
  return m ? { start: parseDate(m[1].replace(/\s+um\s+/, ' ')) } : {};
}

export interface EventManagerConfig extends SourceDefaults {
  /** Start page of the portal, e.g. https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE */
  startUrl: string;
}

export function eventManagerAdapter(cfg: EventManagerConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const items = parsePortalList(await ctx.get(cfg.startUrl), cfg.startUrl);
      const events: EventInput[] = [];
      for (const item of items) {
        if (inBrussels(item.location) === 'no') continue;
        const page = await ctx.get(item.url);
        const [ld] = parseJsonLdEvents(page);
        if (ld?.cancelled) continue;
        // Pages lose their JSON-LD once registration closes; fall back to the shown dates.
        const fromPage = () => {
          const spans = parsePortalDates(cheerio.load(page)('body'));
          return spans.start ? spans : parsePortalSentenceDate(page);
        };
        const dates = ld ?? (item.start ? item : fromPage());
        if (!dates.start) continue;

        const location = item.location ?? ld?.location;
        if (inBrussels(location) === 'no') continue;
        const description = parsePortalDescription(page);
        const { categories, registration } = classify({ title: item.title, description });
        events.push({
          id: `${cfg.id}:${item.eventId}`,
          title: item.title,
          start: dates.start,
          end: dates.end,
          location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: description ? summarize(description) : undefined,
          categories,
          // It is a registration portal: sign-up is needed unless the text says otherwise.
          registration: registration === 'unknown' ? 'required' : registration,
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
