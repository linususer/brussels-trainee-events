/** Re-checks the watchlist only (also runs at the end of `npm run fetch`). */
import { runWatch } from '../scrapers/watch';

await runWatch();
