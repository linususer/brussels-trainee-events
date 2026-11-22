import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { appendManualEvent, resolveEnd } from '../src/lib/manual';
import { parseDate } from '../scrapers/adapters/html';

const HEADER = '# Hand-kept events\n# Example:\n# - id: manual:example\n\n[]\n';
const entry = {
  id: 'manual:2026-12-05:alumni-drinks',
  title: 'Alumni drinks',
  start: '2026-12-05T18:30',
  organiser: 'Alumni Network',
  categories: ['networking' as const],
  country: 'DE',
};

describe('appendManualEvent', () => {
  it('replaces the empty list, keeps comments and drops defaults', () => {
    const text = appendManualEvent(HEADER, entry);
    expect(text.startsWith('# Hand-kept events\n# Example:')).toBe(true);
    expect(text).not.toMatch(/^\[\]$/m);
    expect(text).not.toMatch(/source:|registration:/);
    expect(parse(text)).toEqual([entry]);
  });

  it('appends to an existing list', () => {
    const once = appendManualEvent(HEADER, entry);
    const twice = appendManualEvent(once, { ...entry, id: 'manual:2026-12-06:second', title: 'Second' });
    expect(parse(twice).map((e: { title: string }) => e.title)).toEqual(['Alumni drinks', 'Second']);
  });

  it('refuses invalid entries', () => {
    expect(() => appendManualEvent(HEADER, { ...entry, start: '5.12.2026' })).toThrow();
  });
});

describe('resolveEnd', () => {
  it('reads a bare time as the start day and full dates as given', () => {
    expect(resolveEnd('2026-12-05T18:30', '21:00', parseDate)).toBe('2026-12-05T21:00');
    expect(resolveEnd('2026-12-05T18:30', '21.30 Uhr', parseDate)).toBe('2026-12-05T21:30');
    expect(resolveEnd('2026-12-05', '7. Dezember 2026', parseDate)).toBe('2026-12-07');
    expect(resolveEnd('2026-12-05', '', parseDate)).toBeUndefined();
  });
});
