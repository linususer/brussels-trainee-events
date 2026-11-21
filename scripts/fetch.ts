/**
 * Runs every adapter in scrapers/sources.ts and writes data/scraped.json.
 * A failing source keeps its previously scraped events, so one broken site
 * does not wipe its entries from the overview.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sources } from '../scrapers/sources';
import type { FetchContext } from '../scrapers/types';
import type { EventInput } from '../src/lib/event';

const OUT = resolve(import.meta.dirname, '../data/scraped.json');
const USER_AGENT = 'brussels-trainee-events/1.0 (personal event overview; low request rate)';

const ctx: FetchContext = {
  async get(url) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return res.text();
  },
};

const previous: EventInput[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const result: EventInput[] = [];
let failures = 0;

for (const source of sources) {
  try {
    const events = await source.fetch(ctx);
    console.log(`✔ ${source.id}: ${events.length} events`);
    result.push(...events);
  } catch (err) {
    failures++;
    const kept = previous.filter((e) => e.source === source.id);
    console.error(`✘ ${source.id}: ${(err as Error).message} (keeping ${kept.length} previous events)`);
    result.push(...kept);
  }
  // Be polite: one request per second at most.
  await new Promise((r) => setTimeout(r, 1000));
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote ${result.length} events from ${sources.length} sources to data/scraped.json`);
if (sources.length === 0) console.log('No sources configured yet: add some in scrapers/sources.ts.');
process.exitCode = failures > 0 ? 1 : 0;
