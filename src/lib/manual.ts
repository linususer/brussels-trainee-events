import { stringify } from 'yaml';
import { EventSchema, type Event, type EventInput } from './event';

/**
 * Appends one validated entry to the text of data/manual-events.yaml,
 * keeping the comments at the top. An empty flow list (`[]`) is replaced.
 */
export function appendManualEvent(fileText: string, entry: EventInput): string {
  const parsed = EventSchema.parse(entry);
  const lines = fileText.replace(/\s+$/, '').split('\n');
  if (lines.at(-1)?.trim() === '[]') lines.pop();
  const body = lines.join('\n').replace(/\s+$/, '');
  return `${body}\n\n${stringify([compact(parsed)], { lineWidth: 0 })}`;
}

/** Drops defaults and empty fields so the YAML stays short. */
function compact(e: Event): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (k === 'source' && v === 'manual') continue;
    if (k === 'registration' && v === 'unknown') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Normalises a typed end value: a bare time ("21:00") means the start day.
 * Returns undefined for empty input.
 */
export function resolveEnd(start: string, input: string, parse: (s: string) => string | undefined): string | undefined {
  const value = input.trim();
  if (!value) return undefined;
  const time = value.match(/^(\d{1,2})[:.h](\d{2})(\s*uhr)?$/i);
  if (time) return `${start.slice(0, 10)}T${time[1].padStart(2, '0')}:${time[2]}`;
  return parse(value);
}
