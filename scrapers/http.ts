import { isAllowed, parseRobots, type RobotsRules } from './robots';

export const USER_AGENT = 'brussels-trainee-events/1.0 (personal event overview; low request rate)';
const ROBOTS_TOKEN = 'brussels-trainee-events';

/** Minimum pause between two requests to the same site. */
const DEFAULT_INTERVAL_MS = 1000;
/** europa.eu sites answer 429 after a few requests, even at one per 6 s. */
const SLOW_HOSTS: [RegExp, number][] = [[/(^|\.)europa\.eu$/, 10_000]];
/** On HTTP 429: wait (Retry-After, capped) and retry this often. */
const MAX_RETRIES = 2;
const MAX_RETRY_WAIT_MS = 60_000;
const DEFAULT_RETRY_WAIT_MS = 20_000;

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
/** Extra slowdown per host after it answered 429 in this run. */
const backoff = new Map<string, number>();

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
  return Math.max(configured, (robots.crawlDelaySeconds ?? 0) * 1000) * (backoff.get(host) ?? 1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry-After in seconds or as an HTTP date; undefined if absent or invalid. */
export function retryAfterMs(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/**
 * Fetches politely: obeys robots.txt (throws RobotsDisallowedError instead of
 * requesting), keeps a per-site minimum interval (Crawl-delay respected) and
 * backs off on HTTP 429 (Retry-After honoured, site slowed down for the run).
 */
export async function politeGet(url: string): Promise<Response> {
  const u = new URL(url);
  const robots = await robotsFor(u.origin);
  if (!isAllowed(robots, u.pathname + u.search)) throw new RobotsDisallowedError(url);

  for (let attempt = 0; ; attempt++) {
    const wait = (lastRequest.get(u.host) ?? 0) + intervalFor(u.hostname, robots) - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequest.set(u.host, Date.now());
    const res = await get(url);
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;

    backoff.set(u.hostname, (backoff.get(u.hostname) ?? 1) * 2);
    await sleep(Math.min(retryAfterMs(res.headers.get('retry-after')) ?? DEFAULT_RETRY_WAIT_MS, MAX_RETRY_WAIT_MS));
  }
}
