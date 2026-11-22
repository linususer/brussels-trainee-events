import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eescAdapter, parseEescList, timesFromText } from '../scrapers/adapters/eesc';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const LIST = 'https://www.eesc.europa.eu/en/agenda/our-events/upcoming-events';

describe('EESC', () => {
  it('reads teasers with dates (not the 12:00 placeholder), type and venue', () => {
    const items = parseEescList(fixture('eesc-list.html'), LIST);
    expect(items).toHaveLength(6);
    expect(items[0]).toMatchObject({ startDay: '2025-12-15', endDay: '2026-12-31' });
    expect(items[2]).toMatchObject({ type: 'Debate', address: 'Online event', city: 'Brussels' });
  });

  it('finds real times in the summary', () => {
    expect(timesFromText('On Tuesday 1 December, from 14:30-16:30 CEST')).toEqual(['14:30', '16:30']);
    expect(timesFromText('No time given')).toBeUndefined();
  });

  it('skips postponed or cancelled entries', async () => {
    const { isPublicBrusselsEvent } = await import('../scrapers/adapters/eesc');
    const base = { title: 'Competitiveness beyond growth', url: 'x', startDay: '2027-01-01', city: 'Brussels', abstract: '' };
    expect(isPublicBrusselsEvent({ ...base, abstract: 'EVENT POSTPONED to 2027' })).toBe(false);
    expect(isPublicBrusselsEvent(base)).toBe(true);
  });

  it('keeps public Brussels events only: no meetings, online, elsewhere or year-long entries', async () => {
    const events = await eescAdapter({ id: 'eesc', organiser: 'EESC', listUrl: LIST, maxPages: 1 }).fetch({ get: async () => fixture('eesc-list.html') });
    expect(events.map((e) => [e.id, e.start, e.end, e.categories])).toEqual([
      ['eesc:plant-based-sector', '2026-12-01T14:30', '2026-12-01T16:30', ['policy']],
      ['eesc:battery-map', '2026-11-30', undefined, []],
    ]);
  });
});
