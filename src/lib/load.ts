import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { mergeEvents } from './merge';
import type { Event } from './event';

const DATA_DIR = resolve(process.cwd(), 'data');

function readList(file: string, parser: (text: string) => unknown): unknown[] {
  const path = resolve(DATA_DIR, file);
  if (!existsSync(path)) return [];
  const data = parser(readFileSync(path, 'utf8'));
  return Array.isArray(data) ? data : [];
}

/** Loads scraped events and manual entries (manual wins on duplicate ids). */
export function loadEvents(): Event[] {
  const scraped = readList('scraped.json', JSON.parse);
  const manual = readList('manual-events.yaml', parse).map((e) => ({ source: 'manual', ...(e as object) }));
  const { events, invalid } = mergeEvents(scraped, manual);
  for (const { entry, error } of invalid) {
    console.warn(`[events] skipped invalid entry (${error}):`, entry);
  }
  return events;
}
