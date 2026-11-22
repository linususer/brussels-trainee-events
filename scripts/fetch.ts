/**
 * Runs every adapter in scrapers/sources.ts and writes data/scraped.json,
 * then re-checks the watchlist (sources without automation) for changes.
 * A failing source keeps its previously scraped events, so one broken site
 * does not wipe its entries from the overview.
 */
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sources } from '../scrapers/sources';
import { politeGet } from '../scrapers/http';
import { runWatch } from '../scrapers/watch';
import type { FetchContext } from '../scrapers/types';
import type { EventInput } from '../src/lib/event';

const OUT = resolve(import.meta.dirname, '../data/scraped.json');
/** When events were last collected; shown on the start page. */
const META = resolve(import.meta.dirname, '../data/last-fetch.json');

const ctx: FetchContext = {
  async get(url) {
    const res = await politeGet(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return res.text();
  },
};

const previous: EventInput[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const result: EventInput[] = [];
let failures = 0;
const report: string[] = [];

for (const source of sources) {
  try {
    const events = await source.fetch(ctx);
    console.log(`✔ ${source.id}: ${events.length} events`);
    report.push(`| ✔ | ${source.id} | ${events.length} | |`);
    result.push(...events);
  } catch (err) {
    failures++;
    const kept = previous.filter((e) => e.source === source.id);
    console.error(`✘ ${source.id}: ${(err as Error).message} (keeping ${kept.length} previous events)`);
    report.push(`| ✘ | ${source.id} | ${kept.length} (kept) | ${(err as Error).message.replace(/\|/g, '/')} |`);
    result.push(...kept);
  }
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
writeFileSync(META, JSON.stringify({ fetchedAt: new Date().toISOString(), sources: sources.length, failed: failures }, null, 2) + '\n');
console.log(`Wrote ${result.length} events from ${sources.length} sources to data/scraped.json`);
if (sources.length === 0) console.log('No sources configured yet: add some in scrapers/sources.ts.');

const watchItems = process.argv.includes('--no-watch') ? undefined : await runWatch();

// In GitHub Actions, add a readable summary to the run page.
if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    `## Event fetch`,
    `${result.length} events from ${sources.length} sources, ${failures} failed.`,
    '',
    '| | Source | Events | Note |',
    '|---|---|---|---|',
    ...report,
    '',
  ];
  if (watchItems) {
    lines.push('## Watchlist', watchItems.length ? watchItems.map((i) => `- ${i}`).join('\n') : 'Nothing new.', '');
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}
process.exitCode = failures > 0 ? 1 : 0;
