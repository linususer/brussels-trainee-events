import { describe, expect, it } from 'vitest';
import { EventSchema, isAllDay, makeId, toBrusselsLocal } from '../src/lib/event';

describe('EventSchema', () => {
  it('applies defaults', () => {
    const e = EventSchema.parse({ id: 'x', title: 'T', start: '2026-12-05', organiser: 'O' });
    expect(e).toMatchObject({ category: 'other', registration: 'unknown', source: 'manual' });
  });

  it('rejects malformed dates and unknown categories', () => {
    expect(EventSchema.safeParse({ id: 'x', title: 'T', start: '05.12.2026', organiser: 'O' }).success).toBe(false);
    expect(
      EventSchema.safeParse({ id: 'x', title: 'T', start: '2026-12-05', organiser: 'O', category: 'nope' }).success,
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
