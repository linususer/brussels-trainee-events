/**
 * robots.txt evaluation per RFC 9309 (as Google implements it): the group for
 * our user agent applies, otherwise `*`; the longest matching rule wins and
 * `Allow` wins ties; `*` and a trailing `$` are supported.
 */
export interface RobotsRules {
  rules: { allow: boolean; pattern: string }[];
  crawlDelaySeconds?: number;
}

/** Rules from robots.txt text for the given product token (e.g. `brussels-trainee-events`). */
export function parseRobots(text: string, token: string): RobotsRules {
  type Group = { agents: string[]; rules: RobotsRules['rules']; delay?: number };
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const sep = line.indexOf(':');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') current.rules.push({ allow: key === 'allow', pattern: value });
    if (key === 'crawl-delay' && Number.isFinite(Number(value))) current.delay = Number(value);
  }

  const name = token.toLowerCase();
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && name.includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  const delays = chosen.map((g) => g.delay).filter((d): d is number => d !== undefined);
  return {
    rules: chosen.flatMap((g) => g.rules),
    crawlDelaySeconds: delays.length ? Math.max(...delays) : undefined,
  };
}

function matches(pattern: string, path: string): boolean {
  if (!pattern) return false; // "Disallow:" with nothing means allow all
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
}

/** Whether `pathWithQuery` may be fetched under these rules. */
export function isAllowed(robots: RobotsRules, pathWithQuery: string): boolean {
  let best: { allow: boolean; pattern: string } | undefined;
  for (const rule of robots.rules) {
    if (!matches(rule.pattern, pathWithQuery)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule;
    }
  }
  return !best || best.allow;
}
