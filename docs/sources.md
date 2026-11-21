# Source research

Scope: **public events in Brussels**, German sources first (`country: DE`).
Status as of **2026-11-21**. Each row says how far it was checked:

- **checked**: event page fetched and read
- **search only**: found via web search, page not inspected yet
- **not located**: no Brussels event page found yet

## Re-check policy

Sources without automation are not dropped. They sit on the watchlist (`scrapers/watchlist.ts`), are re-checked on every `npm run fetch`, and come with a monthly reminder for manual review where an automatic check is impossible. See the README section "Watchlist".

## Group A: state level

### Key finding

Most state representations (Landesvertretungen) publish **write-ups after events**, not upcoming calendars. Announcements go out as **emailed invitations**, sometimes as PDF invitations on the website. So for group A:

1. **Get on the invitation lists** (Einladungsverteiler). Most representations will add trainees on request. Invitations then become manual entries in `data/manual-events.yaml`. Adding them automatically from email could come later.
2. **Automate only where a real calendar exists.** In group A that is only the Goethe-Institut, and it blocks automated clients (see below).
3. Keep a **watchlist of recurring annual events** (below) to check each season.

### Sources

| Source | Event page | What's there | Feed / API | Automatable? | Status |
|---|---|---|---|---|---|
| Baden-Württemberg | [im.baden-wuerttemberg.de › Vertretung bei der EU](https://im.baden-wuerttemberg.de/de/europa/vertretung-bei-der-eu) | Info and room booking only; events appear as press releases afterwards | none | No → invitation list | checked |
| Bayern | [bayern.de › Bayern in Brüssel](https://www.bayern.de/staatskanzlei/bayern-in-bruessel/) | No calendar. Monthly "EB" Europabericht PDFs | none | No → invitation list | checked |
| Berlin | [berlin.de › Büro Brüssel](https://www.berlin.de/sen/europa/buero-bruessel/) | Yearly "Veranstaltungen 2026" page (looks retrospective) and an event newsletter (`/sen/europa/service/veranstaltungsnewsletter/`) | RSS exists but has **0 items** | No → **subscribe to newsletter** | checked |
| Brandenburg | Invitation PDFs on brandenburg.de (`media_fast/365/…AN LV…`) | Mixed with its Berlin representation; joint events with Berlin | none | No | search only |
| Bremen | Brussels page not located (EuropaPunktBremen is in Bremen, **out of scope**) | n/a | n/a | n/a | not located |
| Hamburg + Schleswig-Holstein (Hanse-Office) | [hanse-office.de](https://hanse-office.de/), category "Veranstaltungen/Termine" | WordPress; category feed only has **write-ups after the event**. Invitation PDFs are uploaded in batches after the events. Registration portal `veranstaltungen.hanse-office.de` lists nothing publicly and works with codes from invitations | `/category/veranstaltungen-termine/feed/` (after-event posts only) | No → invitation list (events@hanse-office.de) | checked |
| Hessen | [staatskanzlei.hessen.de › Vertretung bei der EU](https://staatskanzlei.hessen.de/berlin-europa-und-die-welt/hessen-in-europa/vertretung-des-landes-hessen-bei-der-europaeischen-union) | "Aktivitäten in Brüssel" (retrospective); "Bericht aus Brüssel" PDFs every two weeks; per-event `.ics` downloads seen on partner sites | none | No → invitation list; check whether the Bericht PDFs announce events | checked |
| Mecklenburg-Vorpommern | Site moved to land-mv.de; old event URLs redirect, new Brussels page not located | n/a | n/a | n/a | not located |
| Niedersachsen | [stk.niedersachsen.de › Veranstaltungen und Besuchergruppen](https://www.stk.niedersachsen.de/startseite/die_staatskanzlei/niedersachsische_landesvertretung_bei_der_eu/veranstaltungen_und_besuchergruppen/veranstaltungen-und-besuchergruppen-243358.html) | Write-ups after events (mostly `policy`: panels, breakfasts, Week of Regions) | Site RSS `/rss/` (press, not checked for events) | No → invitation list | checked |
| Nordrhein-Westfalen | land.nrw › Europa (Brussels page not located) | Event series "NRWinEU: Spotlight" | n/a | n/a | not located |
| Rheinland-Pfalz | Not located | n/a | n/a | n/a | not located |
| Saarland | saarland.de | **Bot protection** (403 "establishing a secure connection") | n/a | No (don't bypass) | checked |
| Sachsen | [bxl.sachsen.de › Veranstaltungen](https://www.bxl.sachsen.de/veranstaltungen-3973.html) | No list; registration via veranstaltung@bxl.sachsen.de. Only state institutions may host events there | none | No → invitation list | checked |
| Sachsen-Anhalt | [europa.sachsen-anhalt.de › Veranstaltungen](https://europa.sachsen-anhalt.de/die-landesvertretung/veranstaltungen) | Event section with a Rückblick (archive). Many **culture** formats (film, readings, puppet theatre, music) plus a summer party | none | Maybe: recheck when upcoming entries are listed | checked |
| Thüringen | Not located | n/a | n/a | n/a | not located |
| Ständige Vertretung (Permanent Representation) | [bruessel-eu.diplo.de](https://bruessel-eu.diplo.de/eu-de) | No event section | none | No | checked |
| German Embassy Brussels | [bruessel.diplo.de](https://bruessel.diplo.de/be-de) | No event section. Holds the Day of German Unity reception (1 Oct, by invitation) | none | No | checked |
| Goethe-Institut Brüssel | [goethe.de/ins/be/de/ver.cfm](https://www.goethe.de/ins/be/de/ver.cfm) | **Real calendar of upcoming events**, mostly `culture`, some `policy` talks. Has a location field (Brussels, Liège, Hasselt, online), so filtering to Brussels is easy. A separate calendar "Europanetzwerk Deutsch" lists events by invitation | none found | Technically yes, but **returns 403 to non-browser clients**. Ask Goethe for permission or a feed; until then, enter manually | checked |

### Aggregators seen along the way

| Source | Notes |
|---|---|
| [euagenda.eu](https://euagenda.eu/) | Brussels EU event aggregator with organiser pages (e.g. NRW). **Cloudflare bot protection** (403). Useful to browse by hand; check their terms or ask about an API before automating |

### Watchlist: recurring events (verify dates each year)

| Event | Organiser | Usually | Likely labels |
|---|---|---|---|
| Neujahrsempfang (New Year reception) | Baden-Württemberg | late January | party, networking |
| Erzgebirgischer Weihnachtsmarkt | Sachsen | second half of November | christmas-market |
| Sommerempfang (summer reception) | Hanse-Office | June | party |
| Sommerfest (summer party) | Sachsen-Anhalt | late June | party |
| Oktoberfest | Bayern | every two years (2025 was the last) | party |
| Tag der Deutschen Einheit (Day of German Unity) | German Embassy | 1 October, by invitation | party (invitation) |
| Week of Regions and Cities (side events) | several representations | October | policy |

## Group B: political foundations (Brussels offices)

### Key finding

The foundations publish **real lists of upcoming events**, unlike the state representations. Two of them can be automated cleanly today. They are mostly `policy` (panels, workshops, conferences), with some networking formats.

### Sources

| Source | Event page | What's there | Feed / API | Automatable? | Status |
|---|---|---|---|---|---|
| Heinrich-Böll-Stiftung EU office | [eu.boell.org/en/events](https://eu.boell.org/en/events) → [calendar.boell.de, filtered to the EU office](https://calendar.boell.de/en/calendar/advancedsearch?f%5B0%5D=webseiten_zuordnung_des_termins%3A3619) | Upcoming events with detail pages (date, time, format, organiser). **Automated: adapter `boell-eu`** (list page + one request per Brussels event; online-only and non-Brussels events dropped) | Per event: `/en/node/<id>/savetoCalendar` returns `text/calendar`. Detail pages carry `<meta name="datetime-start/end">` | **Yes.** List page → detail links → per-event `.ics`. Quirks: the `.ics` has a **new UID on every request** (use the node id) and **floating times without a time zone** (they are Brussels time); no LOCATION/URL in the `.ics`, so take those from the detail page | checked |
| Rosa-Luxemburg-Stiftung Brussels | [rosalux.eu/termine](https://rosalux.eu/termine/) | Few entries (1 at the moment: "European Forum", 11–13 Dec, **in Berlin**, so filtered out). **Automated: adapter `rosalux-bxl`**; dates come from the event page because the API date and per-event `.ics` carry the publishing time | RSS `/termine/feed/`; WordPress API `/wp-json/wp/v2/termine` with venue taxonomy `terminveranstaltungsort` and type `termintyp` | **Yes.** WordPress API; filter by venue for Brussels. Venue terms are messy (split at commas: "Brussels)", "room 319)") | checked |
| Friedrich-Ebert-Stiftung EU office | [brussels.fes.de/events](https://brussels.fes.de/events.html) | Event list currently empty ("No news available"); past events page exists | none | Watch: structure unknown until entries appear | checked |
| Konrad-Adenauer-Stiftung Europabüro | [kas.de/de/web/bruessel/veranstaltungen](https://www.kas.de/de/web/bruessel/veranstaltungen) | Per search: talks ("KAS Europe Talks", "Brüsseler Gespräch", "Der Morgen danach") | n/a | **Blocked** (web application firewall, 403). Ask KAS / subscribe to invitations | checked |
| Friedrich-Naumann-Stiftung | [freiheit.org/europe](https://www.freiheit.org/europe) | EU office merged into "FNF Europe" in Feb 2026; site-wide event list has no Brussels filter. Formats per search: Liberal Afterwork (networking), New Year's reception | none | No → mailing list; watch | checked |
| Hanns-Seidel-Stiftung | [hss.de/veranstaltungen](https://www.hss.de/veranstaltungen/) | Event list with location filter, but only Bavarian seminars; Brussels page not located | none | No (watching this list would flag every new Bavarian seminar) | not located |

### Recurring formats worth knowing

| Format | Organiser | Likely labels |
|---|---|---|
| Liberal Afterwork | Naumann (Brussels) | networking, policy |
| New Year's reception (Bibliothèque Solvay) | Naumann (Brussels) | party, policy |
| KAS Europe Talks, Brüsseler Gespräch | KAS Europabüro | policy |
| European Forum | Rosa-Luxemburg-Stiftung | policy |

## Groups C–D

Not researched yet.
