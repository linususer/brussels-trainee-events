import * as cheerio from 'cheerio';
import { toBrusselsLocal, type EventInput } from '../../src/lib/event';
import { classify } from '../../src/lib/classify';
import { inBrussels } from '../../src/lib/location';
import { parseDateTimeRange } from '../dates';
import { htmlToText, summarize } from '../text';
import { sourceInfo, type Adapter, type SourceDefaults } from '../types';

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

export interface CardItem {
  title: string;
  url: string;
  day: string;
  description?: string;
  location?: string;
  labels: string[];
}

/* ---------- Bruegel (bruegel.org/events) ---------- */

/** Cards on the events page: title, link, teaser and date. */
export function parseBruegelList(html: string, pageUrl: string): CardItem[] {
  const $ = cheerio.load(html);
  return $('article.c-card')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('.c-card__title a[href]').first();
      const day = card.find('time[datetime]').first().attr('datetime')?.slice(0, 10);
      if (!link.length || !day) return null;
      return {
        title: clean(link.text()),
        url: new URL(link.attr('href')!, pageUrl).href,
        day,
        description: clean(card.find('.c-card__description').text()) || undefined,
        labels: card.find('.c-card__keywords a').map((_, a) => clean($(a).text())).get(),
      };
    })
    .get()
    .filter((i) => i !== null) as CardItem[];
}

/**
 * "Time and location" block: first value is the date/time, then venue and notices.
 * `body` is the page's main text (format, speakers, programme) for classification.
 */
export function parseBruegelDetail(html: string): { dateText?: string; location?: string; notes: string; body: string } {
  const $ = cheerio.load(html);
  const main = $('main').first().clone();
  main.find('nav, aside, script, style').remove();
  const body = htmlToText(main.html() ?? '');
  const values = $('.c-meta__row--time-and-location .c-meta__value')
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean);
  const [dateText, ...rest] = values;
  // Notices are written in capitals ("CAPACITY IS LIMITED: ..."); the venue is not.
  const location = rest.find((v) => v !== v.toUpperCase());
  return { dateText, location, notes: rest.join(' '), body };
}

export function bruegelAdapter(cfg: SourceDefaults & { listUrl: string }): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const events: EventInput[] = [];
      for (const item of parseBruegelList(await ctx.get(cfg.listUrl), cfg.listUrl)) {
        if (item.day < yesterday()) continue;
        const detail = parseBruegelDetail(await ctx.get(item.url));
        if (inBrussels(detail.location) === 'no') continue;
        const { start, end } = parseDateTimeRange(detail.dateText, item.day);
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()}`,
          title: item.title,
          start,
          end,
          location: detail.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.description ? summarize(item.description) : undefined,
          labels: item.labels.length ? item.labels : undefined,
          ...classify({ title: item.title, description: `${item.description ?? ''} ${detail.body || detail.notes}`, labels: item.labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}

/* ---------- ECFR (ecfr.eu/events) ---------- */

/** Event teasers: title, link, date, location ("Online", a city) and programme. */
export function parseEcfrList(html: string, pageUrl: string): CardItem[] {
  const $ = cheerio.load(html);
  return $('article.tease-event')
    .map((_, el) => {
      const card = $(el);
      const link = card.find('.event-tease-alt__title a[href]').first();
      const day = card.find('time[datetime]').first().attr('datetime')?.slice(0, 10);
      if (!link.length || !day) return null;
      const programme = clean(card.find('.event-tease-alt__programme-label').text());
      return {
        title: clean(link.text()),
        url: new URL(link.attr('href')!, pageUrl).href,
        day,
        description: clean(card.find('.event-tease-alt__excerpt').text()) || undefined,
        location: clean(card.find('.event-tease-alt__location').text()) || undefined,
        labels: programme ? [programme] : [],
      };
    })
    .get()
    .filter((i) => i !== null) as CardItem[];
}

/** Start/end from the event's own `time.start-time` / `time.end-time` (full timestamps). */
export function parseEcfrTimes(html: string): { start?: string; end?: string } {
  const $ = cheerio.load(html);
  const stamp = (sel: string) => {
    const d = $(sel).first().attr('datetime');
    return d && /T\d{2}:\d{2}/.test(d) ? toBrusselsLocal(new Date(d)) : undefined;
  };
  const start = stamp('time.start-time');
  const end = stamp('time.end-time');
  return { start, end: start && end && end > start ? end : undefined };
}

export function ecfrAdapter(cfg: SourceDefaults & { listUrl: string }): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const events: EventInput[] = [];
      for (const item of parseEcfrList(await ctx.get(cfg.listUrl), cfg.listUrl)) {
        // ECFR has offices across Europe and many online events: keep only clear Brussels venues.
        if (item.day < yesterday() || inBrussels(item.location) !== 'yes') continue;
        const times = parseEcfrTimes(await ctx.get(item.url));
        events.push({
          id: `${cfg.id}:${new URL(item.url).pathname.split('/').filter(Boolean).pop()}`,
          title: item.title,
          start: times.start ?? item.day,
          end: times.end,
          location: item.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: item.url,
          description: item.description ? summarize(item.description) : undefined,
          labels: item.labels.length ? item.labels : undefined,
          ...classify({ title: item.title, description: item.description, labels: item.labels }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}
