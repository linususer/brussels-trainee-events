import { EventSchema, type Event, type EventInput } from './event';

export interface MergeResult {
  events: Event[];
  /** Entries that failed validation, with the reason. */
  invalid: { entry: unknown; error: string }[];
}

/**
 * Merges event lists and validates the result. Entries with the same id are
 * combined field by field, later lists winning, so a manual entry with just
 * `id` and `categories` corrects a scraped event. The result is sorted by start.
 */
export function mergeEvents(...lists: (EventInput | unknown)[][]): MergeResult {
  const byId = new Map<string, Record<string, unknown>>();
  const invalid: MergeResult['invalid'] = [];

  for (const list of lists) {
    for (const entry of list) {
      const id = (entry as { id?: unknown } | null)?.id;
      if (typeof entry !== 'object' || entry === null || typeof id !== 'string') {
        invalid.push({ entry, error: 'id: missing' });
        continue;
      }
      byId.set(id, { ...byId.get(id), ...entry });
    }
  }

  const events: Event[] = [];
  for (const entry of byId.values()) {
    const parsed = EventSchema.safeParse(entry);
    if (parsed.success) events.push(parsed.data);
    else invalid.push({ entry, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  }

  events.sort((a, b) => a.start.localeCompare(b.start));
  return { events, invalid };
}

/** Keeps events that have not ended before `today` (`YYYY-MM-DD`). */
export function upcoming(events: Event[], today: string): Event[] {
  return events.filter((e) => (e.end ?? e.start).slice(0, 10) >= today);
}
