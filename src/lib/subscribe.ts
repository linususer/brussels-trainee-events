import { isAllDay, type Event } from './event';

/** One-click subscription links for a feed published at `httpsUrl`. */
export function subscribeLinks(httpsUrl: string, name: string) {
  const webcal = httpsUrl.replace(/^https?:/, 'webcal:');
  const q = (s: string) => encodeURIComponent(s);
  return {
    /** Google Calendar (web and Android) shows an "Add calendar" prompt. */
    google: `https://calendar.google.com/calendar/render?cid=${q(webcal)}`,
    /** iPhone, iPad and Mac open the subscription dialog for webcal links. */
    apple: webcal,
    /** Outlook.com / personal Microsoft accounts. */
    outlookPersonal: `https://outlook.live.com/calendar/0/addfromweb?url=${q(httpsUrl)}&name=${q(name)}`,
    /** Microsoft 365 work or school accounts. */
    outlookWork: `https://outlook.office.com/calendar/0/addfromweb?url=${q(httpsUrl)}&name=${q(name)}`,
    https: httpsUrl,
  };
}

const compact = (local: string) => local.replace(/[-:]/g, '') + (local.includes('T') ? '00' : '');

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Google Calendar "add this event" link (times in Brussels time). */
export function googleEventLink(e: Pick<Event, 'title' | 'start' | 'end' | 'location' | 'url' | 'description' | 'organiser'>): string {
  let dates: string;
  if (isAllDay(e)) {
    dates = `${compact(e.start)}/${compact(nextDay((e.end ?? e.start).slice(0, 10)))}`;
  } else {
    // Without an end, assume two hours so the entry is visible in the day view.
    const end = e.end && e.end.includes('T') ? e.end : addHours(e.start, 2);
    dates = `${compact(e.start)}/${compact(end)}`;
  }
  const details = [e.description, `Organiser: ${e.organiser}`, e.url].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, ctz: 'Europe/Brussels', details });
  if (e.location) params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function addHours(local: string, hours: number): string {
  // Local wall-clock arithmetic in UTC avoids DST shifts for this purpose.
  const d = new Date(`${local}:00Z`);
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().slice(0, 16);
}

/** File-safe slug for per-event files and anchors. */
export const eventSlug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
