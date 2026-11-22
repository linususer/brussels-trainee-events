import { describe, expect, it } from 'vitest';
import { fitsAroundWork } from '../src/lib/workday';

describe('fitsAroundWork', () => {
  it.each([
    ['2026-11-24T10:00', false], // Tuesday morning
    ['2026-11-24T13:59', false],
    ['2026-11-24T14:00', true], // Tuesday from 2 pm
    ['2026-11-25T19:00', true],
    ['2026-12-12T11:00', true], // Saturday morning
    ['2026-12-13T09:30', true], // Sunday
    ['2026-12-01', true], // all-day on a weekday
  ])('%s → %s', (start, expected) => {
    expect(fitsAroundWork({ start })).toBe(expected);
  });
});
