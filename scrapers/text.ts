import * as cheerio from 'cheerio';

/** Plain text from an HTML fragment, whitespace collapsed. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(`<div id="root">${html}</div>`);
  $('script, style').remove();
  $('br, p, li, h1, h2, h3, h4, div').after(' ');
  return $('#root').text().replace(/\s+/g, ' ').trim();
}

/**
 * Short teaser for the site, cut at a sentence or word boundary.
 * We link to the organiser's page for the full text.
 */
export function summarize(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + ' …';
}
