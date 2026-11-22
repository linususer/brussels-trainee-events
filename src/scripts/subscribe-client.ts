/**
 * Browser helpers shared by the subscribe page and the events page:
 * device detection, app links, clipboard and the "what happens next" messages.
 */
import { subscribeLinks } from '../lib/subscribe';

export type AppId = 'apple' | 'google' | 'outlookPersonal' | 'outlookWork' | 'thunderbird' | 'copy';

export const APP_LABELS: Record<AppId, string> = {
  apple: 'Apple Calendar',
  google: 'Google Calendar',
  outlookPersonal: 'Outlook (personal)',
  outlookWork: 'Outlook (work or school)',
  thunderbird: 'Thunderbird',
  copy: 'Copy link',
};

/** Shown right after the click, so people know what to do in the app that opens. */
export const APP_HINTS: Record<AppId, string> = {
  apple: 'Your Calendar app opens and asks whether to subscribe. Tap or click “Subscribe”, then “OK”. Done.',
  google: 'Google Calendar opens in a new tab. Click “Add” to confirm. It can take a few hours until the events appear.',
  outlookPersonal: 'Outlook opens in a new tab. Confirm the calendar there (“Import” / “Subscribe”). Done.',
  outlookWork: 'Outlook opens in a new tab. Confirm the calendar there (“Import” / “Subscribe”). Some organisations block external calendars; then use your personal calendar.',
  thunderbird:
    'Link copied. In Thunderbird: open the Calendar, choose “New Calendar…” → “On the Network”, paste the link as Location and click “Find Calendars”, then “Subscribe”.',
  copy: 'Link copied. Paste it where your calendar app asks for a calendar address (often called “subscribe from web” or “add by URL”).',
};

/** The calendar most people on this device use. */
export function detectApp(ua = navigator.userAgent): 'apple' | 'google' {
  // iPadOS reports itself as Macintosh.
  return /iPhone|iPad|iPod|Macintosh/i.test(ua) ? 'apple' : 'google';
}

/** URL to open for an app, or undefined for apps that work with a copied link. */
export function appLink(app: AppId, httpsUrl: string, name: string): string | undefined {
  const links = subscribeLinks(httpsUrl, name);
  return app === 'thunderbird' || app === 'copy' ? undefined : links[app];
}

export const opensNewTab = (app: AppId) => app === 'google' || app === 'outlookPersonal' || app === 'outlookWork';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Copy this calendar link:', text);
    return false;
  }
}

/** Shows a message in a status element (announced by screen readers via aria-live). */
export function say(status: HTMLElement, message: string) {
  status.textContent = message;
  status.hidden = false;
}
