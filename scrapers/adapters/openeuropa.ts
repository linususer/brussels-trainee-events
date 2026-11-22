import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDate } from './html';
import { htmlToText, summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * Event lists built with the EU's OpenEuropa site template (e.g. the House of
 * European History). The list gives date, title, summary and type per card;
 * the event page's definition list gives "Date" (with times) and "Location".
 * Detail pages also show related events, so only the page's own <dl> is read.
 */
export interface OeListItem {
  title: string;
  url: string;
  day: string;
  summary?: string;
  type?: string;
  location?: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseOeList(html: string, pageUrl: string): OeListItem[] {
  const $ = cheerio.load(html);
  return $('article')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('.card-title a[href]').first();
      const day = card.find('time[datetime]').first().attr('datetime')?.slice(0, 10);
      if (!link.length || !day) return null;
      return {
        title: clean(link.attr('title') ?? link.text()),
        url: new URL(link.attr('href')!, pageUrl).href,
        day,
        summary: clean(card.find('[class*="oe-summary"]').first().text()) || undefined,
        type: clean(card.find('[class*="event-type"] a').first().text()) || undefined,
        location: clean(card.find('[class*="oe-sc-event-location"]').first().text()) || undefined,
      };
    })
    .get()
    .filter((i) => i !== null) as OeListItem[];
}

/** Reads "Date" and "Location" from the event's own definition list. */
export function parseOeDetail(html: string): { dateText?: string; location?: string; overview?: string } {
  const $ = cheerio.load(html);
  const main = $('main').first();
  const value = (label: string) => {
    const dt = main.find('dt').filter((_, el) => clean($(el).text()).toLowerCase() === label).first();
    // dt and dd sit in separate wrapper divs inside the same <dl>.
    return dt.length ? clean(dt.closest('dl').find('dd').first().text()) || undefined : undefined;
  };
  const overview = main.find('#paragraph-event-overview').first();
  return {
    dateText: value('date'),
    location: value('location'),
    overview: overview.length ? htmlToText(overview.html() ?? '') : undefined,
  };
}

/**
 * "26 November 2026, 19:00-21:00 (CET)" or "3 December 2026 - 5 December 2026"
 * → local start/end. Falls back to the list day.
 */
export function parseOeDates(dateText: string | undefined, day: string): { start: string; end?: string } {
  if (!dateText) return { start: day };
  const [first, second] = dateText.split(/\s[-–]\s/);
  const startDay = parseDate(first)?.slice(0, 10) ?? day;
  const endDay = second ? parseDate(second)?.slice(0, 10) : undefined;
  const times = [...dateText.matchAll(/(\d{1,2})[:.](\d{2})/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  if (!times[0]) return { start: startDay, end: endDay && endDay > startDay ? endDay : undefined };
  return { start: `${startDay}T${times[0]}`, end: times[1] ? `${endDay ?? startDay}T${times[1]}` : undefined };
}

export interface OpenEuropaConfig extends SourceDefaults {
  listUrl: string;
}

export function openEuropaAdapter(cfg: OpenEuropaConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const events: EventInput[] = [];
      for (const item of parseOeList(await ctx.get(cfg.listUrl), cfg.listUrl)) {
        if (inBrussels(item.location) === 'no') continue;
        const detail = parseOeDetail(await ctx.get(item.url));
        const location = detail.location ?? item.location;
        if (inBrussels(location) === 'no') continue;
        const { start, end } = parseOeDates(detail.dateText, item.day);
        const text = [item.summary, detail.overview].filter(Boolean).join(' ');
        const labels = item.type ? [item.type] : [];
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()}`,
          title: item.title,
          start,
          end,
          location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.summary ? summarize(item.summary) : detail.overview ? summarize(detail.overview) : undefined,
          labels: labels.length ? labels : undefined,
          ...classify({ title: item.title, description: text, labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
