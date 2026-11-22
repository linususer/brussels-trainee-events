import type { Category, Event } from './event';

/**
 * Labels are derived from the event itself (title, description and the
 * source's own tags), never from what kind of organiser published it:
 * a foundation's summer party is a party, not a policy talk.
 *
 * Patterns match substrings so German compounds work ("Adventsempfang").
 */
const CATEGORY_RULES: [Category, RegExp][] = [
  ['christmas-market', /weihnachtsmarkt|adventsmarkt|adventsbasar|weihnachtsbasar|christmas market|christmas bazaa?r|christmas fair|kerstmarkt|marché de noël|marche de noel|plaisirs d['’]hiver/i],
  [
    'policy',
    /podium|panel|diskussion|discussion|debatte|debate|débat|konferenz|conference|conférence|vortrag|lecture|fachgespräch|gespräch|roundtable|runder tisch|symposium|expert workshop|fachworkshop|briefing|hearing|anhörung/i,
  ],
  ['party', /empfang|reception|réception|sommerfest|summer party|party|feier|cocktail|apéro|apero|\bfest\b/i],
  ['networking', /networking|netzwerk|stammtisch|after-?work|meet-?up|get-together|kennenlern|drinks|quiz/i],
  [
    'culture',
    /konzert|concert|ausstellung|exhibition|exposition|vernissage|lesung|reading|film|kino|cinema|cinéma|theater|théâtre|musik|music|singen|chor\b|choir|carol|chorale|guided tour|lunchtime tour|führung|visite/i,
  ],
  ['sport', /\blauf\b|\brun\b|running|fußball|football|yoga|radtour|wanderung|\bhike\b|sportfest|turnier|tournament/i],
];

// Order matters: "keine Anmeldung erforderlich" must not count as "Anmeldung erforderlich".
const REGISTRATION_RULES: [Event['registration'], RegExp][] = [
  [
    'invitation',
    /nur (auf|mit|nach) einladung|nur für geladene|geladene gäste|geschlossene veranstaltung|by invitation only|invitation only|invite[- ]only|sur invitation|gästeliste|guest list/i,
  ],
  ['not-required', /ohne anmeldung|keine anmeldung|no registration|sans inscription/i],
  [
    'required',
    /anmeldung (erforderlich|notwendig|nötig|bis)|um anmeldung wird gebeten|bitte melden sie sich|registration (is )?(required|needed|mandatory)|please register|register here|register your interest|inscription (obligatoire|requise)/i,
  ],
];

export interface ClassifyInput {
  title: string;
  description?: string;
  /** The source's own labels for this event, e.g. iCal CATEGORIES or tag chips. */
  labels?: string[];
}

export interface Classification {
  /** Empty when nothing matched: the event stays unclassified until someone labels it. */
  categories: Category[];
  registration: Event['registration'];
}

export function classify({ title, description = '', labels = [] }: ClassifyInput): Classification {
  const text = [title, description, ...labels].join('\n');
  const categories = CATEGORY_RULES.filter(([, re]) => re.test(text)).map(([c]) => c);
  const registration = REGISTRATION_RULES.find(([, re]) => re.test(text))?.[0] ?? 'unknown';
  return { categories, registration };
}
