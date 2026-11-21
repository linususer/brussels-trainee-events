import type { Adapter } from './types';
// import { icalAdapter } from './adapters/ical';
// import { htmlListAdapter } from './adapters/html';

/**
 * All automated sources. Prefer an .ics or RSS feed where a site offers one;
 * fall back to `htmlListAdapter` with CSS selectors taken from the page.
 * Check each site's robots.txt and terms before adding it.
 *
 * Examples (the URLs and selectors are placeholders, not real endpoints):
 *
 *   icalAdapter({
 *     id: 'lv-example',
 *     organiser: 'Vertretung des Landes Beispiel bei der EU',
 *     url: 'https://example.org/veranstaltungen.ics',
 *   }),
 *
 *   htmlListAdapter({
 *     id: 'alumni-example',
 *     organiser: 'Example Alumni Network Brussels',
 *     category: 'networking',
 *     url: 'https://example.org/events',
 *     item: '.event-teaser',
 *     title: 'h3',
 *     date: '.date',
 *     location: '.location',
 *   }),
 */
export const sources: Adapter[] = [];
