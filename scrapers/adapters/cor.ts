import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDate } from './html';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * European Committee of the Regions (cor.europa.eu). The upcoming-events list
 * has everything per card (date pill, type pill, title, location, time), so no
 * detail pages are requested. Only formats open to the public and interesting
 * to trainees are kept (allowlist), so internal meetings never show up.
 */
export const COR_PUBLIC_FORMATS = /conference|exhibition|open day|forum|festival|concert|award|debate|summit|seminar/i;

export interface CorItem {
  title: string;
  url: string;
  dateText: string;
  type?: string;
  location?: string;
  timeText?: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseCorList(html: string, pageUrl: string): CorItem[] {
  const $ = cheerio.load(html);
  return $('article.c-event')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('.c-event__title a[href]').first();
      const pills = card.find('.c-pill').map((_, p) => clean($(p).text())).get();
      const dateText = pills.find((p) => /\d{4}/.test(p));
      if (!link.length || !dateText) return null;
      return {
        title: clean(link.text()),
        url: new URL(link.attr('href')!, pageUrl).href,
        dateText,
        type: pills.find((p) => p !== dateText),
        location: clean(card.find('.c-event__location').text()) || undefined,
        timeText: clean(card.find('.c-event__time').text()) || undefined,
      };
    })
    .get()
    .filter((i) => i !== null) as CorItem[];
}

/**
 * "25 November 2026", "03 - 04 December 2026", "30 November - 01 December 2026"
 * plus "09:00 - 17:30 (Brussels time)" or "Multiple day event".
 */
export function parseCorDates(dateText: string, timeText = ''): { start?: string; end?: string } {
  const [left, right] = dateText.split(/\s+-\s+/);
  const endDay = parseDate(right ?? left)?.slice(0, 10);
  if (!endDay) return {};
  let startDay = endDay;
  if (right) {
    const year = Number(endDay.slice(0, 4));
    if (/^\d{1,2}$/.test(left.trim())) {
      startDay = `${endDay.slice(0, 8)}${left.trim().padStart(2, '0')}`; // "03 - 04 December 2026"
    } else {
      // "30 November - 01 December 2026": the year belongs to the end; a December start belongs to the year before a January end.
      const sameYear = parseDate(`${left} ${year}`)?.slice(0, 10);
      startDay = sameYear && sameYear > endDay ? parseDate(`${left} ${year - 1}`)!.slice(0, 10) : (sameYear ?? endDay);
    }
  }
  const times = [...timeText.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`);
  if (startDay === endDay && times[0]) {
    return { start: `${startDay}T${times[0]}`, end: times[1] ? `${endDay}T${times[1]}` : undefined };
  }
  return { start: startDay, end: endDay > startDay ? endDay : undefined };
}

export interface CorConfig extends SourceDefaults {
  listUrl: string;
  maxPages?: number;
}

export function corAdapter(cfg: CorConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const items = new Map<string, CorItem>();
      for (let page = 0; page < (cfg.maxPages ?? 2); page++) {
        const url = page === 0 ? cfg.listUrl : `${cfg.listUrl}?page=${page}`;
        let found: CorItem[];
        try {
          found = parseCorList(await ctx.get(url), cfg.listUrl);
        } catch (err) {
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
        if (!COR_PUBLIC_FORMATS.test(item.type ?? '') || inBrussels(item.location) !== 'yes') continue;
        const { start, end } = parseCorDates(item.dateText, item.timeText);
        if (!start) continue;
        const labels = item.type ? [item.type] : [];
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()}`,
          title: item.title,
          start,
          end,
          location: item.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          labels: labels.length ? labels : undefined,
          ...classify({ title: item.title, labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
