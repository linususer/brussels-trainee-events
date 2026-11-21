export const USER_AGENT = 'brussels-trainee-events/1.0 (personal event overview; low request rate)';

/** One request per second at most, across all sources. */
export const politeDelay = () => new Promise((r) => setTimeout(r, 1000));

export async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
}
