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

/* ---------- Shared: list of links + one parser per event page ---------- */

export interface PageEvent {
  title: string;
  start: string;
  end?: string;
  location?: string;
  /** Text used for labels and registration hints (description, format, programme). */
  text: string;
  /** Short teaser for the site. */
  teaser?: string;
  /** e.g. "In person", "Online"; an online-only event is skipped. */
  format?: string;
}

export interface LinkListConfig extends SourceDefaults {
  listUrl: string;
  /** Matches event page URLs among the list page's links. */
  linkPattern: RegExp;
  /** Most recent N links only (lists are ordered by date). */
  maxEvents?: number;
}

export function findEventLinks(html: string, pageUrl: string, pattern: RegExp): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    try {
      const u = new URL($(el).attr('href')!, pageUrl);
      u.hash = '';
      u.search = '';
      const href = u.href.replace(/\/$/, '');
      if (pattern.test(href) && href !== pageUrl.replace(/\/$/, '')) links.add(href);
    } catch {
      // ignore malformed links
    }
  });
  return [...links];
}

export function linkListAdapter(cfg: LinkListConfig, parsePage: (html: string) => PageEvent | undefined): Adapter {
  return {
    id: cfg.id,
    organiser: cfg.organiser,
    info: sourceInfo(cfg),
    async fetch(ctx) {
      const links = findEventLinks(await ctx.get(cfg.listUrl), cfg.listUrl, cfg.linkPattern).slice(0, cfg.maxEvents ?? 20);
      const events: EventInput[] = [];
      for (const link of links) {
        const ev = parsePage(await ctx.get(link));
        if (!ev || ev.start.slice(0, 10) < yesterday()) continue;
        if (/^online$/i.test(ev.format ?? '') || inBrussels(ev.location) === 'no') continue;
        events.push({
          id: `${cfg.id}:${new URL(link).pathname.split('/').filter(Boolean).pop()}`,
          title: ev.title,
          start: ev.start,
          end: ev.end,
          location: ev.location,
          organiser: cfg.organiser,
          country: cfg.country,
          url: link,
          description: ev.teaser ? summarize(ev.teaser) : undefined,
          ...classify({ title: ev.title, description: ev.text }),
          source: cfg.id,
        });
      }
      return events;
    },
  };
}

const mainText = ($: cheerio.CheerioAPI) => {
  const main = ($('main').first().length ? $('main').first() : $('body')).clone();
  main.find('nav, header, footer, script, style, form').remove();
  return htmlToText(main.html() ?? '');
};

/* ---------- CEPS: "When Monday 23 Nov 2026 / 09:30 - 11:15 (CET) Where … Register" ---------- */

export function parseCepsPage(html: string): PageEvent | undefined {
  const $ = cheerio.load(html);
  const text = mainText($);
  const when = text.match(/When\s+(.+?\d{4}\s*\/\s*[\d:]+\s*-\s*[\d:]+)/);
  if (!when) return undefined;
  const { start, end } = parseDateTimeRange(when[1].replace('/', ','), '');
  if (!start) return undefined;
  const where = text.match(/Where\s+(.+?)\s+(?:Register|Add to|This (?:in-person|online|hybrid) event)/i)?.[1];
  const title = clean($('h1').first().text()) || clean($('meta[property="og:title"]').attr('content') ?? '');
  return {
    title,
    start,
    end,
    location: where,
    text,
    teaser: clean($('meta[name="description"]').attr('content') ?? '') || undefined,
    format: /online event/i.test(text) && !/in-person/i.test(text) ? 'Online' : undefined,
  };
}

/* ---------- EPC: "Wed Dec 02, 2026 14:00-18:30 In Person" ---------- */

export function parseEpcPage(html: string): PageEvent | undefined {
  const $ = cheerio.load(html);
  const text = mainText($);
  const m = text.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\.?\s+([A-Z][a-z]{2,8}\.? \d{1,2}, \d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(In Person|Online|Hybrid)?/);
  if (!m) return undefined;
  const { start, end } = parseDateTimeRange(`${m[1]}, ${m[2]}-${m[3]}`, '');
  if (!start) return undefined;
  const title = clean($('h1').first().text()) || clean($('meta[property="og:title"]').attr('content') ?? '');
  return { title, start, end, text, format: m[4], teaser: clean($('meta[name="description"]').attr('content') ?? '') || undefined };
}

/* ---------- Friends of Europe: e-head block with format, date and start/end ---------- */

/** The site labels local times as UTC (+00:00 but shown as 19:00), so the clock time is used as is. */
const localClock = (iso?: string) => iso?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)?.slice(1, 3).join('T');

export function parseFriendsOfEuropePage(html: string): PageEvent | undefined {
  const $ = cheerio.load(html);
  const times = $('.e-head__times time[datetime]').map((_, el) => localClock($(el).attr('datetime'))).get();
  const start = times[0] ?? localClock($('.e-head__date time[datetime]').attr('datetime'))?.slice(0, 10);
  if (!start) return undefined;
  const title = clean($('h1').first().text()) || clean($('meta[property="og:title"]').attr('content') ?? '');
  const topic = clean($('.e-head__topic').first().text());
  return {
    title,
    start,
    end: times[1] && times[1] > start ? times[1] : undefined,
    format: clean($('.e-head__relative__label').first().text()) || undefined,
    // Only the event's own text: the "About" block, or (on other layouts) the page description.
    // Full pages carry speaker bios and related content that would trigger false labels.
    text: `${topic} ${htmlToText($('#about, .about').first().html() ?? '') || ($('meta[name="description"]').attr('content') ?? '')}`,
    teaser: clean($('meta[name="description"]').attr('content') ?? '') || undefined,
  };
}
