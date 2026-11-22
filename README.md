# Brussels Trainee Events

One overview of the free-time events relevant to trainees (stagiaires) at the EU institutions in Brussels: networking evenings, receptions at the German state representations, alumni meet-ups, talks, culture and Christmas markets. No more checking a dozen websites.

The site is static (Astro) and meant for GitHub Pages. It also publishes an **`.ics` calendar feed** you can subscribe to on your phone.

## How events get in

| Way | For | Where |
|---|---|---|
| **Adapters** (automated) | Sources with a feed, an API or a parsable listing page | `scrapers/sources.ts` → `npm run fetch` → `data/scraped.json` |
| **Manual entries** | Newsletters, LinkedIn, WhatsApp groups, flyers | `data/manual-events.yaml` |

Manual entries are easiest with `npm run add`: it accepts dates as written in invitations ("5. Dezember 2026, 18:30 Uhr", end "21:00"), suggests categories and registration from the text, warns about non-Brussels locations and validates before saving.

Both are merged at build time. Manual entries win when the ids match, so you can correct a scraped event.

## Getting started

Requires Node.js ≥ 22.22.

```bash
npm install
npm run dev        # local site at http://localhost:4321/brussels-trainee-events/
npm test           # unit tests (Vitest), no network access
npm run fetch      # run all adapters, update data/scraped.json, then re-check the watchlist
npm run watch      # re-check the watchlist only
npm run add        # add a manual event interactively (invitations, newsletters, LinkedIn, ...)
npm run build      # static site in dist/
```

## Deployment (GitHub Pages)

- `.github/workflows/deploy.yml` tests, builds and publishes the site on every push to `main` (and when called by the nightly run).
- `.github/workflows/nightly.yml` runs **every night at 04:30 UTC**: tests, `npm run fetch` (all sources plus the watchlist), commits changed `data/` as `github-actions[bot]`, then deploys. A failing source keeps its previous events. The run page shows a summary table of all sources and the watchlist findings. Start it by hand under **Actions → Nightly fetch → Run workflow**.
- Because the bot commits to `main` every night, run `git pull` before working locally. Manual runs of `npm run fetch` are still possible but no longer needed.
- GitHub may start scheduled runs late, and disables schedules in repositories without activity for 60 days (the nightly commits count as activity).

One-time setup: in the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. The site URL and base path come from that Pages configuration, so the repository name does not need to be hard-coded.

## Adding a source

1. Look for an `.ics`/iCal or RSS link on the organiser's event page. That's the most robust option.
2. Add an entry to `scrapers/sources.ts`:
   - `icalAdapter({ id, organiser, url, category? })` for feeds
   - `htmlListAdapter({ id, organiser, url, item, title, date, location?, ... })` for listing pages, using CSS selectors from the page
   - `jsonLdAdapter({ id, organiser, listUrl, linkPattern, exclude? })` when detail pages carry schema.org `Event` JSON-LD (Wix, many WordPress plugins). Check for it first: it is the most robust format
   - a dedicated adapter when a site needs more (see `scrapers/adapters/boell.ts`, `rosalux.ts`)
3. Save a copy of the page/feed into `tests/fixtures/` and add a test, so a site redesign shows up as a failing test rather than silently missing events.
4. Check the site's terms first. `robots.txt` is enforced automatically: every request goes through `politeGet` (`scrapers/http.ts`), which evaluates `robots.txt` per RFC 9309 (longest match, wildcards, `Crawl-delay`) and refuses disallowed URLs. It keeps a minimum interval per site (1 s; 10 s for europa.eu, which rate-limits quickly) and backs off on HTTP 429 (honours `Retry-After`, retries twice, slows that site down for the rest of the run).
5. Drop events that are clearly not in Brussels with `inBrussels()` from `src/lib/location.ts` (unknown locations are kept).

If a source fails during `npm run fetch`, its previously scraped events are kept.

## Calendar subscriptions and views

- **Subscribe page** (`/subscribe/`): one-click buttons per feed for Google Calendar, Apple Calendar (webcal), Outlook (personal and work/school), Thunderbird (copy link + steps) and "copy link". Explains subscribe vs. download.
- **Feeds** (`/calendar/<feed>.ics`, defined in `src/lib/feeds.ts`): `all`, `social` (networking, receptions, Christmas markets, sport), `culture`, `policy`. `/events.ics` stays as an alias of `all` for existing subscriptions. Feeds carry a name, description and a 6-hour refresh hint; events are marked as free time (`TRANSP:TRANSPARENT`).
- **Single events**: every event has "Add to calendar" links (Google template link and `/calendar/event/<slug>.ics`).
- **Month view**: the events page switches between list and a Monday-first month grid (choice remembered per browser). On phones, days show counts; clicking a day opens its events.

Subscriptions update automatically; the feeds are rebuilt every night by the nightly run.

## Sources page

`/sources/` shows every organiser that was considered: a bar of coverage (read automatically, no public calendar, event page not found, blocks automated access), the same split per kind of organiser, and a list with links for checking each uncovered source by hand. It is built from `scrapers/sources.ts` (active connectors, with `group` and `homepage`), `scrapers/watchlist.ts` (inactive, with `group`) and `scrapers/considered.ts` (researched but not tracked), so it always matches the configuration.

## Watchlist: sources without automation

Sources we could not automate (no calendar, blocked, or not located yet) are listed in `scrapers/watchlist.ts` and **re-checked on every fetch**. Each run compares against `data/watch-state.json` and reports only what is new:

- 👀 a page now links a **feed** (RSS/Atom/iCal/webcal) → consider an adapter
- 👀 a page now mentions **upcoming dates** → it may have started listing events
- 👀 a blocked site **became reachable**, or a page failed **twice in a row** (moved?)
- ⏰ a blocked or not-located source was **last reviewed more than 30 days ago** → look by hand, then update its `reviewed` date

When a watched source gets an adapter, move it from `watchlist.ts` to `sources.ts`.

## Event format

See the comment at the top of `data/manual-events.yaml`. Times are Brussels wall-clock time: `2026-12-05T18:00` (timed) or `2026-12-05` (all day). Categories: `networking`, `policy`, `culture`, `christmas-market`, `party`, `sport`, `other`. An event can have several (a panel followed by a reception is `policy` and `party`).

**Labels describe the event, not the organiser.** Scraped events are classified from their own title, description and the source's own tags (`src/lib/classify.ts`), never from the type of source. If nothing matches, the event stays *unclassified*; label it by adding a manual entry with the same id. Invitation-only and registration hints ("nur auf Einladung", "registration required", ...) are detected the same way.

Scope: **public events in Brussels**. Events that are listed publicly but have a guest list get `registration: invitation` and are flagged "Get an invitation first". Each event can carry a `country` code for the community it addresses; v1 covers German (`DE`) sources, others will follow.

## Decisions

- **Classification is rule-based** (`src/lib/classify.ts`). An LLM classifier (Claude API) as a primary labeller, with rules as fallback and cached results, was considered on 2026-11-21 and **deferred**: with only a handful of events, sources are the bottleneck. Revisit when wording gaps keep showing up in the disagreement or unclassified lists.

## Project layout

```
data/            manual-events.yaml (hand-kept), scraped.json (generated by npm run fetch)
scrapers/        adapter interface, iCal + HTML adapters, list of sources
scripts/fetch.ts runs all adapters
src/lib/         event schema, merging, .ics generation, data loading
src/pages/       index.astro (event list), events.ics.ts (calendar feed)
tests/           Vitest tests + fixtures
```

## Status / next steps

- [x] Automated sources: Böll EU office, Rosa-Luxemburg-Stiftung Brussels, state representations of NRW, Rheinland-Pfalz and Mecklenburg-Vorpommern (shared registration portal)
- [ ] More sources (see `docs/sources.md`); get on the invitation lists in `docs/invitation-lists.md`
- [x] Deploy workflow for GitHub Pages (on push)
- [x] Nightly fetch in CI (`nightly.yml`)

*Not an official service. Always check the organiser's page before attending.*
