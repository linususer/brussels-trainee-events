import * as cheerio from 'cheerio';
import { toBrusselsLocal, type EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { htmlToText, summarize } from '../text';
import type { Adapter, SourceDefaults } from '../types';

/**
 * Generic adapter for sites whose event pages carry schema.org `Event`
 * JSON-LD (Wix Events, many WordPress plugins). A list page provides links
 * to the detail pages; each detail page provides the structured data.
 */
export interface JsonLdEvent {
  name: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
  url?: string;
  cancelled: boolean;
}

type Json = Record<string, unknown>;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);

function placeText(loc: unknown): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc)) return loc.map(placeText).filter(Boolean).join('; ') || undefined;
  const place = loc as Json;
  const addr = place.address;
  const address =
    typeof addr === 'string'
      ? addr
      : addr && typeof addr === 'object'
        ? ['streetAddress', 'postalCode', 'addressLocality'].map((k) => str((addr as Json)[k])).filter(Boolean).join(', ')
        : undefined;
  return [str(place.name), address].filter(Boolean).join(', ') || undefined;
}

/** Local Brussels time; date-only values stay all-day. */
function toLocal(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : toBrusselsLocal(d);
}

/** All schema.org Events in a page's JSON-LD blocks (also inside @graph). */
export function parseJsonLdEvents(html: string): JsonLdEvent[] {
  const $ = cheerio.load(html);
  const nodes: Json[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      for (const item of [data].flat()) {
        nodes.push(item, ...(((item as Json)['@graph'] as Json[] | undefined) ?? []));
      }
    } catch {
      // ignore malformed blocks
    }
  });

  const events: JsonLdEvent[] = [];
  for (const n of nodes) {
    const types = [n['@type']].flat().map(String);
    if (!types.some((t) => /Event$/.test(t))) continue;
    const name = str(n.name);
    const start = str(n.startDate) && toLocal(str(n.startDate)!);
    if (!name || !start) continue;
    const end = str(n.endDate) && toLocal(str(n.endDate)!);
    events.push({
      name: htmlToText(name),
      start,
      end: end && end > start ? end : undefined,
      location: placeText(n.location),
      description: str(n.description) ? htmlToText(str(n.description)!) : undefined,
      url: str(n.url),
      cancelled: /Cancelled|Postponed/i.test(String(n.eventStatus ?? '')),
    });
  }
  return events;
}

/** Unique detail-page links on a list page that match `pattern`. */
export function findLinks(html: string, pageUrl: string, pattern: RegExp): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    try {
      const url = new URL($(el).attr('href')!, pageUrl);
      url.hash = '';
      url.search = '';
      if (pattern.test(url.href)) links.add(url.href);
    } catch {
      // ignore malformed links
    }
  });
  return [...links];
}

export interface JsonLdConfig extends SourceDefaults {
  listUrl: string;
  /** Which links on the list page are event detail pages. */
  linkPattern: RegExp;
  /** Titles that are out of scope for this source (e.g. church services). */
  exclude?: RegExp;
}

export function jsonLdAdapter(cfg: JsonLdConfig): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    async fetch(ctx) {
      const links = findLinks(await ctx.get(cfg.listUrl), cfg.listUrl, cfg.linkPattern);
      const events: EventInput[] = [];
      for (const link of links) {
        for (const ev of parseJsonLdEvents(await ctx.get(link))) {
          if (ev.cancelled || cfg.exclude?.test(ev.name) || inBrussels(ev.location) === 'no') continue;
          const slug = new URL(link).pathname.split('/').filter(Boolean).pop() ?? ev.name;
          events.push({
            id: `${cfg.id}:${slug}:${ev.start.slice(0, 10)}`,
            title: ev.name,
            start: ev.start,
            end: ev.end,
            location: ev.location,
            organiser: cfg.organiser,
            country: cfg.country,
            url: ev.url ?? link,
            description: ev.description ? summarize(ev.description) : undefined,
            ...classify({ title: ev.name, description: ev.description }),
            source: cfg.id,
          });
        }
      }
      return events;
    },
  };
}
