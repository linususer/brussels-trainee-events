import { describe, expect, it } from 'vitest';
import { isAllowed, parseRobots } from '../scrapers/robots';

const TOKEN = 'brussels-trainee-events';

describe('robots.txt', () => {
  it('uses the * group, longest match wins, Allow wins ties', () => {
    const r = parseRobots('User-agent: *\nDisallow: /events\nAllow: /events/public\nDisallow: /a\nAllow: /a', TOKEN);
    expect(isAllowed(r, '/events/2026')).toBe(false);
    expect(isAllowed(r, '/events/public/x')).toBe(true);
    expect(isAllowed(r, '/a')).toBe(true);
    expect(isAllowed(r, '/other')).toBe(true);
  });

  it('supports * and $ (which Python robotparser ignores)', () => {
    const r = parseRobots('User-agent: *\nDisallow: /*add-to-cart=*\nDisallow: /*.pdf$\nAllow: /core/*.css$', TOKEN);
    expect(isAllowed(r, '/shop?add-to-cart=5')).toBe(false);
    expect(isAllowed(r, '/files/report.pdf')).toBe(false);
    expect(isAllowed(r, '/files/report.pdf?x=1')).toBe(true);
    expect(isAllowed(r, '/events/')).toBe(true);
  });

  it('prefers a group naming us over *, and merges grouped user-agents', () => {
    const text = 'User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nUser-agent: brussels-trainee-events\nDisallow: /\n';
    expect(isAllowed(parseRobots(text, TOKEN), '/events')).toBe(false);
    expect(isAllowed(parseRobots('User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /', TOKEN), '/events')).toBe(true);
  });

  it('treats an empty Disallow as allow-all and reads Crawl-delay', () => {
    const r = parseRobots('User-agent: *\nDisallow:\nCrawl-delay: 5', TOKEN);
    expect(isAllowed(r, '/anything')).toBe(true);
    expect(r.crawlDelaySeconds).toBe(5);
  });

  it('blocks everything for "Disallow: /"', () => {
    expect(isAllowed(parseRobots('User-agent: *\nDisallow: /', TOKEN), '/events')).toBe(false);
  });
});
