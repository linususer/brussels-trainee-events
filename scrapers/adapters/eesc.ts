import * as cheerio from 'cheerio';
import type { EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { htmlToText, summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

/**
 * European Economic and Social Committee (eesc.europa.eu). The upcoming-events
 * list has title, date, venue, optional event type and a summary per teaser.
 * Only public events in Brussels are kept: internal formats (meetings, JCC/DAG
 * meetings, plenaries), online events, events elsewhere and long-running
 * entries (yearly calendars, prizes) are skipped.
 */
const INTERNAL_TYPES = /plenary|meeting|webinar/i;
const INTERNAL_TITLES = /\bmeeting\b|plenary|\bJCC\b|\bDAG\b|calendar of/i;
const MAX_DAYS = 3;

export interface EescItem {
  title: string;
  url: string;
  startDay: string;
  endDay?: string;
  type?: string;
  address?: string;
  city?: string;
  abstract: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseEescList(html: string, pageUrl: string): EescItem[] {
  const $ = cheerio.load(html);
  return $('.node--type-event.node--view-mode-teaser')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('h2 a[href]').first();
      // The list's times are a 12:00 UTC placeholder: only the dates count.
      const days = card.find('.field--name-field-date time[datetime]').map((_, t) => ($(t).attr('datetime') ?? '').slice(0, 10)).get();
      if (!link.length || !days[0]) return null;
      const field = (name: string) => clean(card.find(`.field--name-${name}`).first().text()) || undefined;
      return {
        title: clean(link.text()),
        url: new URL(link.attr('href')!, pageUrl).href,
        startDay: days[0],
        endDay: days[1] && days[1] > days[0] ? days[1] : undefined,
        type: field('field-event-type')?.replace(/^Event type\s*/i, ''),
        address: field('field-address'),
        city: field('field-city'),
        abstract: htmlToText(card.find('.field--name-field-abstract').first().html() ?? ''),
      };
    })
    .get()
    .filter((i) => i !== null) as EescItem[];
}

/** Whether a teaser describes a public event in Brussels worth showing to trainees. */
export function isPublicBrusselsEvent(i: EescItem): boolean {
  const days = i.endDay ? (Date.parse(i.endDay) - Date.parse(i.startDay)) / 864e5 + 1 : 1;
  if (days > MAX_DAYS) return false;
  if (INTERNAL_TYPES.test(i.type ?? '') || INTERNAL_TITLES.test(i.title)) return false;
  if (/online/i.test(i.address ?? '')) return false;
  if (/postponed|cancell?ed/i.test(`${i.title} ${i.abstract}`)) return false;
  return inBrussels([i.address, i.city].filter(Boolean).join(', ')) === 'yes';
}

/** "from 14:30-16:30" in the summary gives the real times. */
export function timesFromText(text: string): [string, string] | undefined {
  const m = text.match(/\b(\d{1,2})[:.](\d{2})\s*(?:-|–|to)\s*(\d{1,2})[:.](\d{2})/);
  return m ? [`${m[1].padStart(2, '0')}:${m[2]}`, `${m[3].padStart(2, '0')}:${m[4]}`] : undefined;
}

export function eescAdapter(cfg: SourceDefaults & { listUrl: string; maxPages?: number }): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const items = new Map<string, EescItem>();
      for (let page = 0; page < (cfg.maxPages ?? 2); page++) {
        const url = page === 0 ? cfg.listUrl : `${cfg.listUrl}?page=${page}`;
        let found: EescItem[];
        try {
          found = parseEescList(await ctx.get(url), cfg.listUrl);
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
        if (!isPublicBrusselsEvent(item)) continue;
        const times = item.endDay ? undefined : timesFromText(item.abstract);
        const labels = item.type ? [item.type] : [];
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()}`,
          title: item.title,
          start: times ? `${item.startDay}T${times[0]}` : item.startDay,
          end: times ? `${item.startDay}T${times[1]}` : item.endDay,
          location: [item.address, item.city].filter(Boolean).join(', '),
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.abstract ? summarize(item.abstract) : undefined,
          labels: labels.length ? labels : undefined,
          ...classify({ title: item.title, description: item.abstract, labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
