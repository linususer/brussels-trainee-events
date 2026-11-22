import { describe, expect, it } from 'vitest';
import { EventSchema } from '../src/lib/event';
import { eventsForFeed, feedForCategory, feedForSelection, feedIds, feedName, feedTitle } from '../src/lib/feeds';
import { eventSlug, googleEventLink, subscribeLinks } from '../src/lib/subscribe';
import { buildMonths } from '../src/lib/calendar';
import { toIcs } from '../src/lib/ics';

const ev = (id: string, start: string, categories: string[], extra: object = {}) =>
  EventSchema.parse({ id, title: `Event ${id}`, start, organiser: 'Org', categories, ...extra });

describe('feeds', () => {
  const events = [ev('a', '2026-12-01T18:00', ['networking']), ev('b', '2026-12-02', ['christmas-market']), ev('c', '2026-12-03T19:00', ['policy', 'party']), ev('d', '2026-12-04', [])];

  it('publishes every combination of groups as one feed (no separate Christmas-market feed)', () => {
    expect(feedIds).toEqual(['all', 'social', 'culture', 'social-culture', 'policy', 'social-policy', 'culture-policy']);
    expect(eventsForFeed(events, 'all').map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(eventsForFeed(events, 'social').map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(eventsForFeed(events, 'policy').map((e) => e.id)).toEqual(['c']);
    expect(eventsForFeed(events, 'culture-policy').map((e) => e.id)).toEqual(['c']);
    expect(eventsForFeed(events, 'culture')).toEqual([]);
  });

  it('maps a selection of groups to exactly one feed', () => {
    expect(feedForSelection(['culture', 'social'])).toBe('social-culture');
    expect(feedForSelection(['policy'])).toBe('policy');
    expect(feedForSelection(['social', 'culture', 'policy'])).toBe('all');
    expect(feedForSelection([])).toBe('all');
  });

  it('names feeds and maps event-page filters to feeds', () => {
    expect(feedName('social-culture')).toBe('Networking & social + Culture');
    expect(feedTitle('policy')).toBe('Brussels trainee events: Policy talks');
    expect(feedForCategory('party')).toBe('social');
    expect(feedForCategory('culture')).toBe('culture');
    expect(feedForCategory('other')).toBe('all');
  });
});

describe('subscribe links', () => {
  const links = subscribeLinks('https://linususer.github.io/brussels-trainee-events/calendar/all.ics', 'Brussels trainee events');

  it('builds one-click links per app', () => {
    expect(links.apple).toBe('webcal://linususer.github.io/brussels-trainee-events/calendar/all.ics');
    expect(links.google).toBe(
      'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Flinususer.github.io%2Fbrussels-trainee-events%2Fcalendar%2Fall.ics',
    );
    expect(links.outlookPersonal).toBe(
      'https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Flinususer.github.io%2Fbrussels-trainee-events%2Fcalendar%2Fall.ics&name=Brussels%20trainee%20events',
    );
    expect(links.outlookWork.startsWith('https://outlook.office.com/calendar/0/addfromweb?url=')).toBe(true);
  });

  it('builds Google "add event" links for timed, open-ended and all-day events', () => {
    const timed = new URL(googleEventLink(ev('t', '2026-12-05T18:30', [], { end: '2026-12-05T21:00', location: 'Brussels' })));
    expect(timed.searchParams.get('dates')).toBe('20261205T183000/20261205T210000');
    expect(timed.searchParams.get('ctz')).toBe('Europe/Brussels');
    expect(timed.searchParams.get('location')).toBe('Brussels');
    expect(new URL(googleEventLink(ev('o', '2026-12-05T18:30', []))).searchParams.get('dates')).toBe('20261205T183000/20261205T203000');
    expect(new URL(googleEventLink(ev('d', '2026-12-12', [], { end: '2026-12-13' }))).searchParams.get('dates')).toBe('20261212/20261214');
  });

  it('makes file-safe slugs from ids', () => {
    expect(eventSlug('lv-nrw:3E268')).toBe('lv-nrw-3e268');
    expect(eventSlug('boell-eu:2026-12-01:Glühwein & Talk')).toBe('boell-eu-2026-12-01-gl-hwein-talk');
  });
});

describe('month grid', () => {
  it('builds Monday-first weeks and spreads multi-day events over their days', () => {
    const months = buildMonths([ev('m', '2026-11-30', [], { end: '2026-12-02' }), ev('x', '2027-01-05T10:00', [])], '2026-11');
    expect(months.map((m) => m.key)).toEqual(['2026-11', '2026-12', '2027-01']);
    const nov = months[0];
    expect(nov.weeks[0][0].date).toBe('2026-10-26'); // Monday before 1 Nov 2026 (a Sunday)
    expect(nov.weeks.every((w) => w.length === 7)).toBe(true);
    expect(nov.weeks.flat().find((d) => d.date === '2026-11-30')?.events.map((e) => e.id)).toEqual(['m']);
    const dec = months[1].weeks.flat();
    expect(dec.filter((d) => d.inMonth && d.events.length).map((d) => d.date)).toEqual(['2026-12-01', '2026-12-02']);
    expect(months[1].label).toBe('December 2026');
  });
});

describe('ics calendar info', () => {
  it('names the calendar and suggests a refresh interval; events are free time', () => {
    const ics = toIcs([ev('a', '2026-12-01T18:00', ['networking'])], new Date('2026-11-22T10:00:00Z'), {
      name: 'Brussels trainee events: Networking & social',
      description: 'Networking evenings, receptions',
    });
    expect(ics).toContain('X-WR-CALNAME:Brussels trainee events: Networking & social');
    expect(ics).toContain('X-WR-CALDESC:Networking evenings\\, receptions');
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT6H');
    expect(ics).toContain('TRANSP:TRANSPARENT');
  });
});
