import { describe, expect, it } from 'vitest';
import { mergeEvents, upcoming } from '../src/lib/merge';

const base = { organiser: 'O', source: 's' };

describe('mergeEvents', () => {
  it('sorts by start and lets later lists override duplicates', () => {
    const scraped = [
      { ...base, id: 'b', title: 'Scraped B', start: '2026-12-10T18:00' },
      { ...base, id: 'a', title: 'A', start: '2026-12-01' },
    ];
    const manual = [{ ...base, id: 'b', title: 'Manual B', start: '2026-12-10T19:00' }];
    const { events, invalid } = mergeEvents(scraped, manual);
    expect(events.map((e) => e.title)).toEqual(['A', 'Manual B']);
    expect(invalid).toEqual([]);
  });

  it('reports invalid entries instead of throwing', () => {
    const { events, invalid } = mergeEvents([{ id: 'x', title: '' }]);
    expect(events).toEqual([]);
    expect(invalid).toHaveLength(1);
  });
});

describe('upcoming', () => {
  it('keeps events that end today or later', () => {
    const { events } = mergeEvents([
      { ...base, id: 'past', title: 'P', start: '2026-11-01' },
      { ...base, id: 'ongoing', title: 'O', start: '2026-11-20', end: '2026-12-24' },
      { ...base, id: 'today', title: 'T', start: '2026-11-21T20:00' },
    ]);
    expect(upcoming(events, '2026-11-21').map((e) => e.id)).toEqual(['ongoing', 'today']);
  });
});
