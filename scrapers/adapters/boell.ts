import * as cheerio from 'cheerio';
import { toBrusselsLocal, type EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { htmlToText, summarize } from '../text';
import type { Adapter, SourceDefaults } from '../types';

/**
 * Heinrich-Böll-Stiftung calendar (calendar.boell.de), filtered to one office.
 *
 * The list page has date, city, type and title per event; detail pages add the
 * description and address. We don't use the per-event .ics export: its UID
 * changes on every request and its times carry no time zone.
 */
export interface BoellListItem {
  nodeId: string;
  url: string;
  title: string;
  subtitle?: string;
  type?: string;
  start: string;
  end?: string;
  city?: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseBoellList(html: string, pageUrl: string): BoellListItem[] {
  const $ = cheerio.load(html);
  const items: BoellListItem[] = [];

  $('[data-history-node-id]').each((_, el) => {
    const row = $(el);
    const link = row.find('a[rel="bookmark"]').first();
    const title = clean(row.find('.event--title').first().text());
    const dates = row.find('[data-start]').first();
    const startTs = Number(dates.attr('data-start'));
    const endTs = Number(dates.attr('data-end'));
    if (!title || !link.attr('href') || !startTs) return;

    items.push({
      nodeId: String(row.attr('data-history-node-id')),
      url: new URL(link.attr('href')!, pageUrl).href,
      title,
      subtitle: clean(row.find('.event--subtitle').first().text()) || undefined,
      type: clean(row.find('.field--event_type').first().text()) || undefined,
      start: toBrusselsLocal(new Date(startTs * 1000)),
      end: endTs > startTs ? toBrusselsLocal(new Date(endTs * 1000)) : undefined,
      city: clean(row.find('.field--city .field__item').first().text()) || undefined,
    });
  });
  return items;
}

export interface BoellDetail {
  /** Full description text, used for classification. */
  body: string;
  address?: string;
}

export function parseBoellDetail(html: string): BoellDetail {
  const $ = cheerio.load(html);
  const body = htmlToText($('.field--name-body').first().html() ?? '');
  const address = clean($('.field--location').first().text().replace(/^\s*(Address|Adresse)\s*➽?/i, ''));
  // "See event description" is the calendar's placeholder for "no address given".
  return { body, address: address && !/event description|beschreibung/i.test(address) ? address : undefined };
}

export interface BoellConfig extends SourceDefaults {
  /** calendar.boell.de list URL filtered to one office. */
  listUrl: string;
}

export function boellAdapter(cfg: BoellConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    async fetch(ctx) {
      // The type can say "Online discussion" when no city is given.
      const where = (i: BoellListItem, place?: string) => [place ?? i.city, i.type].filter(Boolean).join(', ');
      const items = parseBoellList(await ctx.get(cfg.listUrl), cfg.listUrl).filter((i) => inBrussels(where(i)) !== 'no');
      const events: EventInput[] = [];
      for (const item of items) {
        let detail: BoellDetail = { body: '' };
        try {
          detail = parseBoellDetail(await ctx.get(item.url));
        } catch (err) {
          // The list entry alone is still useful.
          console.warn(`  ${cfg.id}: detail page failed for ${item.url}: ${(err as Error).message}`);
        }
        const location = detail.address ?? item.city;
        if (inBrussels(where(item, location)) === 'no') continue;

        const title = item.subtitle ? `${item.title}: ${item.subtitle}` : item.title;
        const labels = item.type ? [item.type] : [];
        events.push({
          id: `${cfg.id}:${item.nodeId}`,
          title,
          start: item.start,
          end: item.end,
          location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: detail.body ? summarize(detail.body) : undefined,
          labels: labels.length ? labels : undefined,
          ...classify({ title, description: detail.body, labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
