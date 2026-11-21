import { EventSchema, type Event, type EventInput } from './event';

export interface MergeResult {
  events: Event[];
  /** Entries that failed validation, with the reason. */
  invalid: { entry: unknown; error: string }[];
}

/**
 * Validates and merges event lists. Later lists win on duplicate ids,
 * so pass manual entries last to let them override scraped ones.
 * The result is sorted by start time.
 */
export function mergeEvents(...lists: (EventInput | unknown)[][]): MergeResult {
  const byId = new Map<string, Event>();
  const invalid: MergeResult['invalid'] = [];

  for (const list of lists) {
    for (const entry of list) {
      const parsed = EventSchema.safeParse(entry);
      if (parsed.success) {
        byId.set(parsed.data.id, parsed.data);
      } else {
        invalid.push({ entry, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      }
    }
  }

  const events = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start));
  return { events, invalid };
}

/** Keeps events that have not ended before `today` (`YYYY-MM-DD`). */
export function upcoming(events: Event[], today: string): Event[] {
  return events.filter((e) => (e.end ?? e.start).slice(0, 10) >= today);
}
