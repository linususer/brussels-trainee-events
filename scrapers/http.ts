export const USER_AGENT = 'brussels-trainee-events/1.0 (personal event overview; low request rate)';

const MIN_INTERVAL_MS = 1000;
let lastRequest = 0;

export async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
}

/** Like `get`, but at most one request per second across all sources. */
export async function politeGet(url: string): Promise<Response> {
  const wait = lastRequest + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return get(url);
}
