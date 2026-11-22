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
| Baden-Württemberg | [im.baden-wuerttemberg.de › Vertretung bei der EU](https://im.baden-wuerttemberg.de/de/europa/vertretung-bei-der-eu); registration portal [event-bw.eu](https://event-bw.eu/) | Info and room booking only. The portal only accepts booking numbers from invitations (no public list) and times out for non-browser clients | none | No → invitation list | checked |
| Bayern | [bayern.de › Bayern in Brüssel](https://www.bayern.de/staatskanzlei/bayern-in-bruessel/) | No calendar. Monthly "EB" Europabericht PDFs | none | No → invitation list | checked |
| Berlin | [berlin.de › Büro Brüssel](https://www.berlin.de/sen/europa/buero-bruessel/) | Yearly "Veranstaltungen 2026" page (looks retrospective) and an event newsletter (`/sen/europa/service/veranstaltungsnewsletter/`) | RSS exists but has **0 items** | No → **subscribe to newsletter** | checked |
| Brandenburg | [europa-brandenburg.eu › Vertretung bei der EU](https://www.europa-brandenburg.eu/seite/334943/vertretung-bei-der-eu.html) | Rue Joseph II 108. No calendar; single dates appear in the brandenburg.de Termine list (e.g. LEADER talk on 1 Oct 2026). Joint events with Berlin | none | No → invitation list; watch | checked |
| Bremen | [landesportal.bremen.de › Landesvertretung in Brüssel](https://landesportal.bremen.de/bund-europa-international/die-landesvertretung-in-bruessel) | Avenue Palmerston 22. Describes conferences, exhibitions and concerts; no calendar | none | No → invitation list (events contact listed on the page); watch | checked |
| Hamburg + Schleswig-Holstein (Hanse-Office) | [hanse-office.de](https://hanse-office.de/), category "Veranstaltungen/Termine" | WordPress; category feed only has **write-ups after the event**. Invitation PDFs are uploaded in batches after the events. Registration portal `veranstaltungen.hanse-office.de` lists nothing publicly and works with codes from invitations | `/category/veranstaltungen-termine/feed/` (after-event posts only) | No → invitation list (events@hanse-office.de) | checked |
| Hessen | [staatskanzlei.hessen.de › Vertretung bei der EU](https://staatskanzlei.hessen.de/berlin-europa-und-die-welt/hessen-in-europa/vertretung-des-landes-hessen-bei-der-europaeischen-union) | "Aktivitäten in Brüssel" (retrospective); "Bericht aus Brüssel" PDFs every two weeks; per-event `.ics` downloads seen on partner sites | none | No → invitation list; check whether the Bericht PDFs announce events | checked |
| Mecklenburg-Vorpommern | [eu.landesvertretung-mv.de](https://eu.landesvertretung-mv.de/) (registration portal) | "Offene Veranstaltungen" list, empty at the moment | portal (see below) | **Automated: adapter `lv-mv`** | checked |
| Niedersachsen | [stk.niedersachsen.de › Veranstaltungen und Besuchergruppen](https://www.stk.niedersachsen.de/startseite/die_staatskanzlei/niedersachsische_landesvertretung_bei_der_eu/veranstaltungen_und_besuchergruppen/veranstaltungen-und-besuchergruppen-243358.html) | Write-ups after events (mostly `policy`: panels, breakfasts, Week of Regions) | Site RSS `/rss/` (press, not checked for events) | No → invitation list | checked |
| Nordrhein-Westfalen | [bruessel.veranstaltungen.land.nrw](https://bruessel.veranstaltungen.land.nrw/index.php?Locale=de_DE) (registration portal); write-ups on [mbeim.nrw](https://mbeim.nrw/nrw-bei-der-eu/aktuelle-veranstaltungen-public-events) | Public events list: film screening "Ash and Crayons" with reception, 30 Nov. Known formats: Sommerfest (~1,200 guests), Förderpreis concert in December, Adventsmatinee | portal (see below) | **Automated: adapter `lv-nrw`** | checked |
| Rheinland-Pfalz | [bruessel.landesvertretung-rlp.de](https://bruessel.landesvertretung-rlp.de/) (registration portal) | Public events list ("Die GAP nach 2027", 16 Nov, registration closed). Avenue de Tervueren 60 | portal (see below) | **Automated: adapter `lv-rp`** | checked |
| Saarland | [saarland.de › LV Brüssel](https://www.saarland.de/stk/DE/portale/europa/saarland-in-europa/lv-bruessel) | No calendar. Moving out of Rue du Luxembourg 15 (with Grand Est). The bot protection seen earlier did not block the later Node requests | none | No → invitation list; watch | checked |
| Sachsen | [bxl.sachsen.de › Veranstaltungen](https://www.bxl.sachsen.de/veranstaltungen-3973.html) | No list; registration via veranstaltung@bxl.sachsen.de. Only state institutions may host events there | none | No → invitation list | checked |
| Sachsen-Anhalt | [europa.sachsen-anhalt.de › Veranstaltungen](https://europa.sachsen-anhalt.de/die-landesvertretung/veranstaltungen) | Event section with a Rückblick (archive). Many **culture** formats (film, readings, puppet theatre, music) plus a summer party | none | Maybe: recheck when upcoming entries are listed | checked |
| Thüringen | thueringen.de (no event page found) | Rue Frédéric Pelletier 111, 1030; shared with Hauts-de-France since Oct 2023 | n/a | n/a | not located |
| Ständige Vertretung (Permanent Representation) | [bruessel-eu.diplo.de](https://bruessel-eu.diplo.de/eu-de) | No event section | none | No | checked |
| German Embassy Brussels | [bruessel.diplo.de](https://bruessel.diplo.de/be-de) | No event section. Holds the Day of German Unity reception (1 Oct, by invitation) | none | No | checked |
| Goethe-Institut Brüssel | [goethe.de/ins/be/de/ver.cfm](https://www.goethe.de/ins/be/de/ver.cfm) | **Real calendar of upcoming events**, mostly `culture`, some `policy` talks. Has a location field (Brussels, Liège, Hasselt, online), so filtering to Brussels is easy. A separate calendar "Europanetzwerk Deutsch" lists events by invitation | none found | Technically yes, but **returns 403 to non-browser clients**. Ask Goethe for permission or a feed; until then, enter manually | checked |

### Registration portal shared by several representations

NRW, Rheinland-Pfalz and Mecklenburg-Vorpommern (and Baden-Württemberg, without a public list) use the same registration software ("Online Veranstaltungs-Anmeldung", `eventmanager-system`). The start page lists public events under **"Offene Veranstaltungen"**; event pages carry schema.org JSON-LD, which disappears once registration closes, so the adapter (`scrapers/adapters/eventmanager.ts`) falls back to the date spans shown on the page. Events in the portal are marked "registration required" unless their text says otherwise. `robots.txt` only blocks the software's internal folders. The adapter only reads pages and never submits the registration form.

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
| Neujahrsempfang (New Year reception) | AHK debelux with German Embassy | January | party, networking |
| Sommerfest (summer party) | AHK debelux | June | party |

### Other public channels checked for the "no public calendar" sources (2026-11-22)

None of these announces the representations' own events in advance:

| Channel | Result |
|---|---|
| Ministers' appointment calendars (Sachsen Ministerpräsident, Brandenburg, MV) | Sachsen: Brussels only in the navigation; Brandenburg and MV render their lists only with JavaScript and showed no Brussels events in static HTML |
| Hessen "Bericht aus Brüssel" (PDF, every two weeks) | The "Vorschau" lists EU institution meetings (Council, Commission, EP plenary), not events of the representation |
| Bayern "Europabericht" (PDF, monthly) | Policy reporting; no event announcements |
| FES central event database (fes.de/veranstaltungen) | Has a place filter, but filter URLs are signed (TYPO3 cHash), and the Brussels office list is empty anyway |

Conclusion: for these sources the information exists only in **invitations and newsletters** (email).

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

## Groups G–J: EU-wide sources (researched 2026-11-22)

Scope extended to sources open to all trainees regardless of nationality (no `country` tag). `robots.txt` was evaluated per RFC 9309 (longest match, wildcards); **all candidates below allow access**. Python's `urllib.robotparser` reported false "blocked" results for several of them because it ignores wildcards and rule precedence.

**europa.eu sites throttle quickly** (HTTP 429 after a few requests at 1 req/s on commission.europa.eu and cor.europa.eu): adapters for them need a much slower rate.

### Automatable

| Source | Group | Event page | How | Fit | Notes |
|---|---|---|---|---|---|
| YPFP Brussels (Young Professionals in Foreign Policy) | I | [members.ypfp.org/events](https://members.ypfp.org/events/) | RSS `/events/RSS` (event date in title) + detail page ("Location …") | ★★★ networking, e.g. Christmas Pub Quiz | **Automated: `ypfp-bxl`** (only events with a Brussels venue) |
| House of European History | G | [historia.europa.eu › events](https://historia.europa.eu/en/exhibitions-events/events) | List + detail pages in the OpenEuropa template (`oe-sc-event__…` dates/location fields, `<time datetime>`) | ★★★ free talks, film, culture | **Automated: `hoeh`** |
| European Commission events | G | [commission.europa.eu › events](https://commission.europa.eu/get-involved/events_en) | Detail pages carry schema.org `Event` JSON-LD | ★★ conferences, many online or elsewhere | **Automated: `ec-events`** from the list pages alone (ECL meta icons); 10 s interval and 429 back-off |
| Bruegel | H | [bruegel.org/events](https://www.bruegel.org/events) | List page has `<time datetime>` per event; event page has a "Time and location" block | ★★ policy | **Automated: `bruegel`** (labels from the event page text) |
| ECFR | H | [ecfr.eu/events](https://ecfr.eu/events/) | Detail pages have `<time datetime>` start/end | ★★ policy | **Automated: `ecfr`** (RSS returns 403; HTML used; only events clearly in Brussels, most are online) |
| JEF Europe | I | [jef.eu/events](https://jef.eu/events/) | The Events Calendar (WordPress): JSON-LD on detail pages | ★ most events outside Brussels; JSON-LD venue often empty | `?ical=1` returns HTML, not iCal |
| EESC | G | [eesc.europa.eu › upcoming events](https://www.eesc.europa.eu/en/agenda/our-events/upcoming-events) | RSS (publication dates only) + detail pages | ★ mostly institutional (plenaries, hearings) | |

### Closer look (done 2026-11-22)

| Source | Group | Result |
|---|---|---|
| EPC | H | **Automated: `epc`**. Event pages show "Wed Dec 02, 2026 14:00-18:30 In Person" as text; online-only events skipped |
| Friends of Europe | H | **Automated: `friends-of-europe`**. Event header has format (In person/Online), start/end times labelled `+00:00` but shown as local time (read as local); labels only from the event's own "About" text or description (speaker bios caused false labels) |
| CEPS | H | Event pages perfect for trainees ("free and open to the public", When/Where), but **Cloudflare challenge** on repeated requests: **watchlist (blocked)** |
| Carnegie Europe | H | List rendered by JavaScript: **watchlist** |
| Jacques Delors Centre | H | Events in **Berlin** (Hertie School): **not tracked** |
| Committee of the Regions | G | Upcoming-events page answered 429: **watchlist (not located)** |
| European Union portal (all institutions) | G | No event links in static HTML; Commission events are covered by `ec-events` |
| Committee of the Regions | G | **Automated: `cor`** from the list cards (date, type, location, time). To avoid noise only exhibitions/open days/festivals/concerts and flagship conferences (forum, summit, awards) in Brussels are kept; project conferences and meetings are skipped. europa.eu throttles: page 2 often answers 429 |
| EESC | G | **Automated: `eesc`** from the list teasers. Only public events in Brussels: no meetings/JCC/DAG/plenaries, no online events, no year-long entries, no postponed/cancelled ones. List times are a 12:00 UTC placeholder; real times are taken from the summary ("from 14:30-16:30") |
| JEF Europe | I | Event calendar not maintained (newest entries from 2022): **not tracked** |

### Manual only

| Source | Group | Finding |
|---|---|---|
| European Commission Trainees' Committee (ECTA) | I | [traineescommittee.com](https://www.traineescommittee.com/) (Wix): T-Card, partner discounts, guides; no event calendar; blog feed has two guides (2025). Events are announced via social media/messenger groups. **On the watchlist** |
| EUNIC Brussels (cultural institutes) | J | No public calendar found; announcements on Instagram/LinkedIn/X. **On the watchlist** (monthly reminder) |
| European Parliament visitor offer | G | Lunchtime tours and visits are recurring offers on visiting.europarl.europa.eu, not dated events |

## Group C: business

| Source | Event page | What's there | Feed / API | Automatable? | Status |
|---|---|---|---|---|---|
| AHK debelux (German-Belgian-Luxembourg chamber of commerce) | [debelux.ahk.de/de/veranstaltungen](https://debelux.ahk.de/de/veranstaltungen) | Upcoming list (5 at the moment), almost all **B2B**: webinars on Belgian labour law and tax, an online security circle, a matchmaking event in Luxembourg. Dates only in the teaser text. `/de/events` also lists old events | none | Not worth it: low relevance for trainees, and the list always has future dates (too noisy to watch). Enter receptions by hand: **Neujahrsempfang** (with the German Embassy, January) and **Sommerfest** (June, with the members' meeting) | checked |

## Group D: German-speaking community

**Decision (2026-11-21): church communities are out of scope.** The research is kept for reference; the generic `jsonLdAdapter` built for the Emmausgemeinde stays available for other sources.

| Source | Event page | What's there | Feed / API | Automatable? | Status |
|---|---|---|---|---|---|
| Emmausgemeinde (Ev. Gemeinde deutscher Sprache) | [degb.be/termine](https://www.degb.be/termine) | Wix Events calendar: Adventsbasar, Adventssingen, Pikkujoulut, Martinsumzug, lunches, plus many services | **schema.org `Event` JSON-LD** on every detail page | **Out of scope** (churches). Was automatable with `jsonLdAdapter` | checked |
| Kath. Gemeinde deutscher Sprache St. Paulus | sankt-paulus.eu (address: Av. de Tervuren 221, 1150) | Site not reachable | n/a | **Out of scope** (churches) | not located |
| Internationale Deutsche Schule Brüssel | [idsb.eu](https://www.idsb.eu/) | Christmas market (date per newsletter) | n/a | **Out of scope**: Wezembeek-Oppem is outside the Brussels region | search only |
