import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import { parseDate } from './adapters/html';
import { get, politeDelay } from './http';
import { watchlist, type WatchEntry } from './watchlist';

/** What we remember about a watched page between runs. */
export interface WatchState {
  /** HTTP status of the last check, or 0 if the request failed. */
  status: number;
  /** Consecutive checks that were not successful (one-off timeouts are ignored). */
  failures: number;
  /** Signals from the last successful check; kept when a check fails. */
  feeds: string[];
  futureDates: string[];
  checkedAt: string;
}

const ok = (status?: number) => status !== undefined && status >= 200 && status < 300;

/** Combines a new observation with the previous state. */
export function nextState(
  prev: WatchState | undefined,
  status: number,
  signals: Pick<WatchState, 'feeds' | 'futureDates'> | undefined,
  today: string,
): WatchState {
  if (ok(status) && signals) return { status, failures: 0, ...signals, checkedAt: today };
  return {
    status,
    failures: (prev?.failures ?? 0) + 1,
    feeds: prev?.feeds ?? [],
    futureDates: prev?.futureDates ?? [],
    checkedAt: today,
  };
}

const DATE_PATTERN =
  /\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}|\d{1,2}\.? ?(?:jan|feb|mär|mar|apr|mai|may|jun|jul|aug|sep|okt|oct|nov|dez|dec|janvier|février|avril|juin|juillet|août|décembre)[a-zäéû]*\.? \d{4}/gi;

/** Dates in `text` after `today` (page stamps are usually today) up to one year ahead, sorted and unique. */
export function findFutureDates(text: string, today: string): string[] {
  const limit = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  const dates = new Set<string>();
  for (const match of text.matchAll(DATE_PATTERN)) {
    const date = parseDate(match[0])?.slice(0, 10);
    if (!date || !isRealDate(date)) continue;
    if (date > today && date <= limit) dates.add(date);
  }
  return [...dates].sort();
}

function isRealDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

// "ical" only as its own path/query part, so "political" or "critical" don't match.
const FEED_HREF =
  /\.ics(\?|$)|(^|[/?&=_.-])i?cal(endar)?([/?&=_.-]|$)|savetocalendar|webcal:|\/feed\/?$|\.rss(\?|$)|\/rss\/?$/i;

/** Feed links (RSS/Atom/iCal) and future dates in the page's main text. */
export function extractSignals(html: string, pageUrl: string, today: string): Pick<WatchState, 'feeds' | 'futureDates'> {
  const $ = cheerio.load(html);
  const feeds = new Set<string>();
  const add = (href?: string) => {
    if (!href) return;
    try {
      feeds.add(new URL(href.replace(/^webcal:/i, 'https:'), pageUrl).href);
    } catch {
      // ignore malformed links
    }
  };
  $('link[rel="alternate"]').each((_, el) => {
    if (/rss|atom|calendar/i.test($(el).attr('type') ?? '')) add($(el).attr('href'));
  });
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (FEED_HREF.test(href)) add(href);
  });

  $('script, style, noscript, nav, header, footer').remove();
  const text = $('main').length ? $('main').text() : $('body').text();
  return { feeds: [...feeds].sort(), futureDates: findFutureDates(text.replace(/\s+/g, ' '), today) };
}

/** Human-readable findings worth a look; empty if nothing relevant changed. */
export function compareWatch(entry: WatchEntry, prev: WatchState | undefined, next: WatchState): string[] {
  const findings: string[] = [];

  // A blocked site answering is news right away; otherwise ignore one-off failures.
  const wasDown = prev && !ok(prev.status) && (entry.status === 'blocked' || prev.failures >= 2);
  if (wasDown && ok(next.status)) findings.push(`now reachable (was ${prev.status || 'error'})`);
  if (entry.status !== 'blocked' && next.failures === 2) {
    findings.push(`not reachable twice in a row (${next.status || 'error'}): page moved?`);
  }

  const newFeeds = next.feeds.filter((f) => !prev?.feeds.includes(f));
  if (newFeeds.length) findings.push(`feed links${prev ? ' (new)' : ''}: ${newFeeds.join(', ')}`);

  const newDates = next.futureDates.filter((d) => !prev?.futureDates.includes(d));
  if (newDates.length) findings.push(`upcoming dates mentioned${prev ? ' (new)' : ''}: ${newDates.join(', ')}`);

  return findings;
}

/** Reminder for entries that need a manual look (blocked or not located) every 30 days. */
export function reviewReminder(entry: WatchEntry, today: string): string | undefined {
  if (entry.status === 'no-calendar') return undefined;
  const age = (Date.parse(today) - Date.parse(entry.reviewed)) / 864e5;
  if (age <= 30) return undefined;
  const what = entry.status === 'blocked' ? 'check terms/contact or browse by hand' : 'search for its Brussels event page';
  return `${entry.id}: last reviewed ${entry.reviewed} (${Math.floor(age)} days ago): ${what}, then update \`reviewed\``;
}

const STATE_FILE = resolve(import.meta.dirname, '../data/watch-state.json');

/** Checks every watched page, prints findings and saves the new state. */
export async function runWatch(today = new Date().toISOString().slice(0, 10)): Promise<number> {
  const state: Record<string, WatchState> = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
  let flagged = 0;

  console.log(`\nWatchlist (${watchlist.length} sources without automation):`);
  for (const entry of watchlist) {
    const reminder = reviewReminder(entry, today);
    if (reminder) {
      flagged++;
      console.log(`  ⏰ ${reminder}`);
    }
    if (!entry.url) continue;

    let next: WatchState;
    try {
      const res = await get(entry.url);
      const signals = res.ok ? extractSignals(await res.text(), res.url || entry.url, today) : undefined;
      next = nextState(state[entry.id], res.status, signals, today);
    } catch {
      next = nextState(state[entry.id], 0, undefined, today);
    }

    const findings = compareWatch(entry, state[entry.id], next);
    if (findings.length) {
      flagged++;
      console.log(`  👀 ${entry.id} (${entry.url})`);
      for (const f of findings) console.log(`     - ${f}`);
    }
    state[entry.id] = next;
    await politeDelay();
  }

  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(flagged ? `${flagged} watchlist item(s) to look at.` : 'Nothing new on the watchlist.');
  return flagged;
}
