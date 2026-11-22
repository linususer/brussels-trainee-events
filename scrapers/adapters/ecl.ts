import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDateTimeRange } from '../dates';
import { summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * Event lists in the Europa Component Library (ECL), e.g. commission.europa.eu.
 * Each content block carries a status label (Upcoming/Ongoing/Past), a type,
 * the title link and secondary meta lines marked by icons: `calendar` (date
 * and time range), `location`, `livestreaming`, `external-events`. The list
 * pages are enough, so no detail pages are requested (europa.eu throttles).
 */
export interface EclItem {
  title: string;
  url: string;
  status?: string;
  type?: string;
  dateText?: string;
  location?: string;
  description?: string;
  livestream: boolean;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseEclList(html: string, pageUrl: string): EclItem[] {
  const $ = cheerio.load(html);
  const byUrl = new Map<string, EclItem>();
  $('.ecl-content-block').each((_, el) => {
    const block = $(el);
    const link = block.find('.ecl-content-block__title a[href]').first();
    if (!link.length) return;
    const url = new URL(link.attr('href')!, pageUrl).href;
    if (byUrl.has(url)) return; // highlighted events repeat in the list
    const meta = (icon: string) =>
      clean(block.find(`.ecl-content-block__secondary-meta-item:has([class*="wt-icon--${icon}"]) .ecl-content-block__secondary-meta-label`).first().text()) ||
      undefined;
    byUrl.set(url, {
      title: clean(link.text()),
      url,
      status: clean(block.find('.ecl-label').first().text()) || undefined,
      type: clean(block.find('.ecl-content-block__primary-meta-item').first().text()) || undefined,
      dateText: meta('calendar'),
      location: meta('location'),
      description: clean(block.find('.ecl-content-block__description').first().text()) || undefined,
      livestream: Boolean(meta('livestreaming')),
    });
  });
  return [...byUrl.values()];
}

export interface EclConfig extends SourceDefaults {
  listUrl: string;
  /** How many list pages to read (`?page=1`, `?page=2`, ...). */
  maxPages?: number;
}

export function eclAdapter(cfg: EclConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const items = new Map<string, EclItem>();
      for (let page = 0; page < (cfg.maxPages ?? 3); page++) {
        const url = page === 0 ? cfg.listUrl : `${cfg.listUrl}${cfg.listUrl.includes('?') ? '&' : '?'}page=${page}`;
        let found: EclItem[];
        try {
          found = parseEclList(await ctx.get(url), cfg.listUrl);
        } catch (err) {
          // A later page failing (e.g. rate limit) should not discard the pages already read.
          if (page === 0) throw err;
          console.warn(`  ${cfg.id}: stopped at page ${page + 1}: ${(err as Error).message}`);
          break;
        }
        const fresh = found.filter((i) => !items.has(i.url));
        for (const i of fresh) items.set(i.url, i);
        if (fresh.length === 0) break;
      }

      const events: EventInput[] = [];
      for (const item of items.values()) {
        // Multi-location organiser: only events clearly in Brussels.
        if (/past/i.test(item.status ?? '') || !item.dateText || inBrussels(item.location) !== 'yes') continue;
        const day = parseDateTimeRange(item.dateText, '').start;
        if (!day) continue;
        const { start, end } = parseDateTimeRange(item.dateText, day);
        const labels = item.type ? [item.type] : [];
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()?.replace(/_[a-z]{2}$/, '')}`,
          title: item.title,
          start,
          end,
          location: item.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.description ? summarize(item.description) : item.livestream ? 'Live streaming available.' : undefined,
          labels: labels.length ? labels : undefined,
          ...classify({ title: item.title, description: item.description, labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
