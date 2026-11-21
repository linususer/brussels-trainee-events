import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDate } from './html';
import { htmlToText, summarize } from '../text';
import type { Adapter, SourceDefaults } from '../types';

/**
 * Rosa-Luxemburg-Stiftung Brussels (rosalux.eu), a WordPress site with an
 * events post type (`termine`). The API gives title, venue, type and hosts;
 * the real dates are only on the event page. The per-event .ics and the
 * post `date` carry the publishing time, not the event time, so we avoid them.
 */
export interface RosaluxItem {
  id: number;
  title: string;
  url: string;
  /** Post date: the event's start day (time part is not meaningful). */
  day: string;
  venues: string[];
  types: string[];
  hosts: string[];
  text: string;
}

interface WpTerm {
  taxonomy: string;
  name: string;
}

interface WpTermin {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  content?: { rendered: string };
  _embedded?: { 'wp:term'?: WpTerm[][] };
}

export function parseRosaluxApi(json: unknown): RosaluxItem[] {
  if (!Array.isArray(json)) return [];
  return (json as WpTermin[]).map((t) => {
    const terms = (t._embedded?.['wp:term'] ?? []).flat();
    const names = (taxonomy: string) => terms.filter((x) => x.taxonomy === taxonomy).map((x) => htmlToText(x.name));
    return {
      id: t.id,
      title: htmlToText(t.title.rendered),
      url: t.link,
      day: t.date.slice(0, 10),
      venues: names('terminveranstaltungsort'),
      types: names('termintyp'),
      hosts: names('terminveranstalter'),
      text: htmlToText(t.content?.rendered ?? ''),
    };
  });
}

/** Start and end from the event page's `.termin-zeiten` block. */
export function parseRosaluxDates(html: string): { start?: string; end?: string } {
  const $ = cheerio.load(html);
  const block = $('.termin-zeiten').first();
  const day = block.find('time[datetime]').first().attr('datetime')?.slice(0, 10);
  const text = block.text().replace(/\s+/g, ' ').trim();
  if (!day) return {};

  const [, right] = text.split(/\s[–-]\s/);
  const endDay = right ? parseDate(right)?.slice(0, 10) : undefined;
  const times = [...text.matchAll(/(\d{1,2})[:.](\d{2})/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);

  const start = times[0] ? `${day}T${times[0]}` : day;
  const lastDay = endDay && endDay > day ? endDay : day;
  let end: string | undefined;
  if (times[1]) end = `${lastDay}T${times[1]}`;
  else if (lastDay !== day) end = times[0] ? undefined : lastDay;
  return { start, end };
}

export interface RosaluxConfig extends SourceDefaults {
  baseUrl: string;
}

export function rosaluxAdapter(cfg: RosaluxConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    async fetch(ctx) {
      const api = `${cfg.baseUrl}/wp-json/wp/v2/termine?per_page=50&_embed=wp:term`;
      const items = parseRosaluxApi(JSON.parse(await ctx.get(api)));
      // Skip long-past entries before fetching pages (multi-day events get two weeks of slack).
      const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);

      const events: EventInput[] = [];
      for (const item of items) {
        const location = item.venues.join(', ') || undefined;
        if (item.day < since || inBrussels(location) === 'no') continue;

        const { start, end } = parseRosaluxDates(await ctx.get(item.url));
        events.push({
          id: `${cfg.id}:${item.id}`,
          title: item.title,
          start: start ?? item.day,
          end,
          location,
          organiser: item.hosts.length ? item.hosts.join(', ') : cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.text ? summarize(item.text) : undefined,
          labels: item.types.length ? item.types : undefined,
          ...classify({ title: item.title, description: item.text, labels: item.types }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
