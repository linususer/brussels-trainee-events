import * as cheerio from 'cheerio';
import { makeId, type EventInput } from '../../src/lib/event';
import type { Adapter, SourceDefaults } from '../types';

const MONTHS: Record<string, number> = {
  januar: 1, jan: 1, january: 1, janvier: 1,
  februar: 2, feb: 2, february: 2, février: 2, fevrier: 2,
  märz: 3, maerz: 3, mär: 3, mar: 3, march: 3, mars: 3,
  april: 4, apr: 4, avril: 4,
  mai: 5, may: 5,
  juni: 6, jun: 6, june: 6, juin: 6,
  juli: 7, jul: 7, july: 7, juillet: 7,
  august: 8, aug: 8, août: 8, aout: 8,
  september: 9, sep: 9, sept: 9, septembre: 9,
  oktober: 10, okt: 10, oct: 10, october: 10, octobre: 10,
  november: 11, nov: 11, novembre: 11,
  dezember: 12, dez: 12, dec: 12, december: 12, décembre: 12, decembre: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parses common German/English/French date strings into Brussels local time, e.g.
 * `05.12.2026, 18:00 Uhr`, `5. Dezember 2026, 18.30 Uhr`, `5 December 2026 6:00` or `2026-12-05 18:00`.
 * Returns undefined if no date is found.
 */
export function parseDate(input: string): string | undefined {
  const s = input.toLowerCase().replace(/\s+/g, ' ');
  let y: number, m: number, d: number;

  let match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/(\d{1,2})\.? ?([a-zäéû]+)\.? (\d{4})/)) && MONTHS[match[2]]) {
    [d, m, y] = [Number(match[1]), MONTHS[match[2]], Number(match[3])];
  } else {
    return undefined;
  }

  const date = `${y}-${pad(m)}-${pad(d)}`;
  const rest = s.slice((match.index ?? 0) + match[0].length);
  const time = rest.match(/(\d{1,2})[:.h](\d{2})/);
  return time ? `${date}T${pad(Number(time[1]))}:${time[2]}` : date;
}

export interface HtmlListConfig extends SourceDefaults {
  url: string;
  /** Selector matching one element per event. */
  item: string;
  /** Selectors relative to the item. `link` defaults to the first `a[href]`. */
  title: string;
  date: string;
  location?: string;
  description?: string;
  link?: string;
}

/** Extracts events from a listing page, one element per event. */
export function parseHtmlList(html: string, cfg: HtmlListConfig): EventInput[] {
  const $ = cheerio.load(html);
  const events: EventInput[] = [];

  $(cfg.item).each((_, el) => {
    const item = $(el);
    const pick = (sel?: string) => (sel ? item.find(sel).first().text().replace(/\s+/g, ' ').trim() : '');
    const title = pick(cfg.title);
    const start = parseDate(pick(cfg.date));
    if (!title || !start) return;

    const href = item.find(cfg.link ?? 'a[href]').first().attr('href');
    events.push({
      id: makeId(cfg.id, start, title),
      title,
      start,
      location: pick(cfg.location) || undefined,
      description: pick(cfg.description) || undefined,
      organiser: cfg.organiser,
      category: cfg.category,
      country: cfg.country,
      url: href ? new URL(href, cfg.url).href : undefined,
      source: cfg.id,
    });
  });
  return events;
}

/** Adapter for simple listing pages without a feed. Selectors break when the site changes. */
export function htmlListAdapter(cfg: HtmlListConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    fetch: async (ctx) => parseHtmlList(await ctx.get(cfg.url), cfg),
  };
}
