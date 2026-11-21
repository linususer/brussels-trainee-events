import { describe, expect, it } from 'vitest';
import { EventSchema, isAllDay, makeId, toBrusselsLocal } from '../src/lib/event';

describe('EventSchema', () => {
  it('applies defaults', () => {
    const e = EventSchema.parse({ id: 'x', title: 'T', start: '2026-12-05', organiser: 'O' });
    expect(e).toMatchObject({ categories: [], registration: 'unknown', source: 'manual' });
  });

  it('accepts policy talks, invitations and country codes', () => {
    const e = EventSchema.parse({
      id: 'x', title: 'T', start: '2026-12-05', organiser: 'O', categories: ['policy', 'party'], registration: 'invitation', country: 'DE',
    });
    expect(e).toMatchObject({ categories: ['policy', 'party'], registration: 'invitation', country: 'DE' });
    expect(EventSchema.safeParse({ id: 'x', title: 'T', start: '2026-12-05', organiser: 'O', country: 'de' }).success).toBe(false);
  });

  it('rejects malformed dates and unknown categories', () => {
    expect(EventSchema.safeParse({ id: 'x', title: 'T', start: '05.12.2026', organiser: 'O' }).success).toBe(false);
    expect(
      EventSchema.safeParse({ id: 'x', title: 'T', start: '2026-12-05', organiser: 'O', categories: ['nope'] }).success,
    ).toBe(false);
  });
});

describe('helpers', () => {
  it('detects all-day events', () => {
    expect(isAllDay({ start: '2026-12-05' })).toBe(true);
    expect(isAllDay({ start: '2026-12-05T18:00' })).toBe(false);
  });

  it('converts instants to Brussels time across DST', () => {
    expect(toBrusselsLocal(new Date('2026-12-05T17:00:00Z'))).toBe('2026-12-05T18:00');
    expect(toBrusselsLocal(new Date('2026-07-15T16:30:00Z'))).toBe('2026-07-15T18:30');
  });

  it('builds readable stable ids', () => {
    expect(makeId('lv', '2026-12-05T18:00', 'Glühwein & Networking!')).toBe('lv:2026-12-05:gluhwein-networking');
  });
});
