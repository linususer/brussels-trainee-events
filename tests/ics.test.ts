import { describe, expect, it } from 'vitest';
import { escapeText, foldLine, toIcs } from '../src/lib/ics';
import { EventSchema } from '../src/lib/event';
import { parseIcs } from '../scrapers/adapters/ical';

const now = new Date('2026-11-21T10:00:00Z');

describe('toIcs', () => {
  const timed = EventSchema.parse({
    id: 'manual:x',
    title: 'Drinks, finally',
    start: '2026-12-05T18:00',
    end: '2026-12-05T21:00',
    organiser: 'Org',
    registration: 'required',
    location: 'Place; Brussels',
    categories: ['policy', 'party'],
  });
  const allDay = EventSchema.parse({ id: 'm:y', title: 'Market', start: '2026-12-12', end: '2026-12-13', organiser: 'O' });

  it('writes timed events in Brussels time and all-day events with exclusive end', () => {
    const ics = toIcs([timed, allDay], now);
    expect(ics).toContain('DTSTART;TZID=Europe/Brussels:20261205T180000');
    expect(ics).toContain('DTEND;TZID=Europe/Brussels:20261205T210000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261212');
    expect(ics).toContain('DTEND;VALUE=DATE:20261214');
    expect(ics).toContain('SUMMARY:Drinks\\, finally');
    expect(ics).toContain('LOCATION:Place\\; Brussels');
    expect(ics).toContain('CATEGORIES:policy,party');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });

  it('round-trips through the iCal parser', () => {
    const parsed = parseIcs(toIcs([timed, allDay], now), { id: 'rt', organiser: 'Org' });
    expect(parsed.map((e) => [e.title, e.start, e.end])).toEqual([
      ['Drinks, finally', '2026-12-05T18:00', '2026-12-05T21:00'],
      ['Market', '2026-12-12', '2026-12-13'],
    ]);
  });
});

describe('registration notes', () => {
  it('prefixes guest-list events and explains them', () => {
    const e = EventSchema.parse({ id: 'i', title: 'Reception', start: '2026-12-01T19:00', organiser: 'LV', registration: 'invitation' });
    const ics = toIcs([e], now);
    expect(ics).toContain('SUMMARY:[Invitation] Reception');
    expect(ics).toContain('Get an invitation first.');
  });
});

describe('text helpers', () => {
  it('escapes special characters', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('folds long lines without splitting multi-byte characters', () => {
    const folded = foldLine('DESCRIPTION:' + 'ü'.repeat(60));
    expect(folded.split('\r\n ').join('')).toBe('DESCRIPTION:' + 'ü'.repeat(60));
  });
});
