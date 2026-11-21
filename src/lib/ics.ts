import { isAllDay, REGISTRATION, type Event } from './event';

// Europe/Brussels rules (EU summer time), so calendar apps need no lookup.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Brussels',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets as required by RFC 5545. */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + len > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  out.push(current);
  return out.join('\r\n ');
}

const compact = (local: string) => local.replace(/[-:]/g, '') + (local.includes('T') ? '00' : '');

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateLines(e: Event): string[] {
  if (isAllDay(e)) {
    // DTEND is exclusive for all-day events.
    const end = nextDay((e.end ?? e.start).slice(0, 10));
    return [`DTSTART;VALUE=DATE:${compact(e.start)}`, `DTEND;VALUE=DATE:${compact(end)}`];
  }
  const lines = [`DTSTART;TZID=Europe/Brussels:${compact(e.start)}`];
  if (e.end) lines.push(`DTEND;TZID=Europe/Brussels:${compact(e.end)}`);
  return lines;
}

export function toIcs(events: Event[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//brussels-trainee-events//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Brussels trainee events',
    'X-WR-TIMEZONE:Europe/Brussels',
    ...VTIMEZONE,
  ];

  for (const e of events) {
    const prefix = e.registration === 'invitation' ? '[Invitation] ' : '';
    const description = [e.description, `Organiser: ${e.organiser}`, registrationNote(e), e.url]
      .filter(Boolean)
      .join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id.replace(/[^A-Za-z0-9:._-]/g, '-')}@brussels-trainee-events`,
      `DTSTAMP:${stamp}`,
      ...dateLines(e),
      `SUMMARY:${escapeText(prefix + e.title)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `CATEGORIES:${escapeText(e.category)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function registrationNote(e: Event): string | undefined {
  return REGISTRATION[e.registration] ? `${REGISTRATION[e.registration]}.` : undefined;
}
