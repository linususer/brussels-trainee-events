import { z } from 'zod';

export const CATEGORIES = {
  networking: 'Networking',
  policy: 'Policy talk',
  culture: 'Culture',
  'christmas-market': 'Christmas market',
  party: 'Party & reception',
  sport: 'Sport',
  other: 'Other',
} as const;

export type Category = keyof typeof CATEGORIES;

export const REGISTRATION = {
  required: 'Registration required',
  /** Publicly listed, but with a guest list: an invitation is needed first. */
  invitation: 'Get an invitation first',
  'not-required': 'No registration needed',
  unknown: '',
} as const;

/**
 * Times are Brussels wall-clock time without offset:
 * `2026-12-05T18:00` for a timed event, `2026-12-05` for an all-day event.
 */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, 'expected YYYY-MM-DD or YYYY-MM-DDTHH:mm');

export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  start: localDateTime,
  end: localDateTime.optional(),
  location: z.string().optional(),
  organiser: z.string().min(1),
  /** Derived per event (see classify.ts); empty means unclassified. */
  categories: z.array(z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]])).default([]),
  /** The source's own labels for this event, kept verbatim for review. */
  labels: z.array(z.string()).optional(),
  url: z.url().optional(),
  registration: z.enum(Object.keys(REGISTRATION) as [keyof typeof REGISTRATION, ...(keyof typeof REGISTRATION)[]]).default('unknown'),
  /** National community the organiser mainly addresses (ISO 3166 code, e.g. `DE`). */
  country: z.string().regex(/^[A-Z]{2}$/, 'expected ISO country code like DE').optional(),
  description: z.string().optional(),
  /** Where the entry came from: `manual` or an adapter id. */
  source: z.string().default('manual'),
});

export type Event = z.infer<typeof EventSchema>;
/** Shape accepted before defaults are applied (what adapters and YAML provide). */
export type EventInput = z.input<typeof EventSchema>;

export const isAllDay = (e: Pick<Event, 'start'>) => !e.start.includes('T');

/** Converts an instant to Brussels wall-clock time (`YYYY-MM-DDTHH:mm`). */
export function toBrusselsLocal(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Brussels',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Stable id from date and title, used when a source has no own id. */
export function makeId(source: string, start: string, title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return `${source}:${start.slice(0, 10)}:${slug}`;
}
