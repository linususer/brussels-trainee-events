import { isAllowed, parseRobots, type RobotsRules } from './robots';

export const USER_AGENT = 'brussels-trainee-events/1.0 (personal event overview; low request rate)';
const ROBOTS_TOKEN = 'brussels-trainee-events';

/** Minimum pause between two requests to the same site. */
const DEFAULT_INTERVAL_MS = 1000;
/** europa.eu sites answer 429 after a few requests at 1/s. */
const SLOW_HOSTS: [RegExp, number][] = [[/(^|\.)europa\.eu$/, 6000]];

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows ${url}`);
    this.name = 'RobotsDisallowedError';
  }
}

export async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
}

const robotsCache = new Map<string, Promise<RobotsRules>>();
const lastRequest = new Map<string, number>();

async function robotsFor(origin: string): Promise<RobotsRules> {
  let cached = robotsCache.get(origin);
  if (!cached) {
    cached = (async () => {
      try {
        const res = await get(`${origin}/robots.txt`);
        // 4xx: no rules. 5xx/network errors: RFC 9309 says assume full disallow,
        // but a flaky robots.txt would then hide whole sources; we treat it as no rules
        // and rely on the polite rate instead.
        return res.ok ? parseRobots(await res.text(), ROBOTS_TOKEN) : { rules: [] };
      } catch {
        return { rules: [] };
      }
    })();
    robotsCache.set(origin, cached);
  }
  return cached;
}

function intervalFor(host: string, robots: RobotsRules): number {
  const configured = SLOW_HOSTS.find(([re]) => re.test(host))?.[1] ?? DEFAULT_INTERVAL_MS;
  return Math.max(configured, (robots.crawlDelaySeconds ?? 0) * 1000);
}

/**
 * Fetches politely: obeys robots.txt (throws RobotsDisallowedError instead of
 * requesting) and keeps a per-site minimum interval (Crawl-delay respected).
 */
export async function politeGet(url: string): Promise<Response> {
  const u = new URL(url);
  const robots = await robotsFor(u.origin);
  if (!isAllowed(robots, u.pathname + u.search)) throw new RobotsDisallowedError(url);

  const wait = (lastRequest.get(u.host) ?? 0) + intervalFor(u.hostname, robots) - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest.set(u.host, Date.now());
  return get(url);
}
