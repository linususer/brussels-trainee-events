import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDate } from './html';
import { htmlToText, summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * Wild Apricot member sites (e.g. YPFP, members.ypfp.org). The events RSS gives
 * title, link and description for all branches; each event page has
 * `.eventInfoStartDate` / `.eventInfoStartTime` / `.eventInfoEndTime` / `.eventInfoLocation`.
 * Events outside Brussels (other branches) are dropped by location.
 */
export interface FeedItem {
  title: string;
  link: string;
  description: string;
  /** Date announced in the title, e.g. "(November 25, 2026)". */
  titleDate?: string;
}

export function parseEventFeed(xml: string): FeedItem[] {
  const $ = cheerio.load(xml, { xml: true });
  return $('item')
    .map((_, el) => {
      const item = $(el);
      const raw = item.find('title').first().text().trim();
      const dated = raw.match(/^(.*?)\s*\(([A-Z][a-z]+ \d{1,2}, \d{4})\)\s*$/);
      return {
        title: (dated ? dated[1] : raw).trim(),
        link: item.find('link').first().text().trim(),
        description: htmlToText(item.find('description').first().text()),
        titleDate: dated ? parseDate(dated[2])?.slice(0, 10) : undefined,
      };
    })
    .get()
    .filter((i) => i.title && i.link);
}

/** "7:00 PM" → "19:00". */
export function to24h(input: string): string | undefined {
  const m = input.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (!m) return undefined;
  let h = Number(m[1]) % 12;
  if (!m[3]) h = Number(m[1]);
  else if (m[3].toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function parseWildApricotEvent(html: string): { start?: string; end?: string; location?: string } {
  const $ = cheerio.load(html);
  // Fields are classes on <li> elements (some themes use ids ending in the same name).
  const field = (name: string) => $(`.${name}, [id$="${name}"]`).first().text().replace(/\s+/g, ' ').trim();
  const day = parseDate(field('eventInfoStartDate').replace(/^When\s*/i, ''))?.slice(0, 10);
  if (!day) return {};
  const t1 = to24h(field('eventInfoStartTime'));
  const t2 = to24h(field('eventInfoEndTime'));
  const location = field('eventInfoLocation').replace(/^Location\s*/i, '').replace(/\s*Spaces left.*$/i, '') || undefined;
  return { start: t1 ? `${day}T${t1}` : day, end: t1 && t2 ? `${day}T${t2}` : undefined, location };
}

export interface WildApricotConfig extends SourceDefaults {
  feedUrl: string;
}

export function wildApricotAdapter(cfg: WildApricotConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const since = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      const events: EventInput[] = [];
      for (const item of parseEventFeed(await ctx.get(cfg.feedUrl))) {
        // Disabled entries are payment/archive pages; dated past items need no request.
        if (/\(disabled\)/i.test(item.title) || (item.titleDate && item.titleDate < since)) continue;
        const ev = parseWildApricotEvent(await ctx.get(item.link));
        if (!ev.start || inBrussels(ev.location) !== 'yes') continue;
        events.push({
          id: `${cfg.id}:${item.link.match(/event-(\d+)/)?.[1] ?? item.link}`,
          title: item.title,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.link,
          description: item.description ? summarize(item.description) : undefined,
          ...classify({ title: item.title, description: item.description }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
