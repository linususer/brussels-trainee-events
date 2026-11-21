/**
 * Decides whether a venue is in Brussels. Scope is Brussels only, but many
 * sources give vague or missing locations, so only clear "elsewhere" answers
 * drop an event; unknown locations are kept.
 */
export type BrusselsMatch = 'yes' | 'no' | 'unknown';

const BRUSSELS = new RegExp(
  [
    'brussels', 'bruxelles', 'brussel', 'brüssel', 'bruessel',
    // municipalities of the Brussels-Capital Region (ambiguous ones like Forest/Vorst left out)
    'ixelles', 'elsene', 'etterbeek', 'schaerbeek', 'schaarbeek', 'saint-gilles', 'sint-gillis', 'uccle', 'ukkel',
    'woluwe', 'anderlecht', 'molenbeek', 'laeken', 'laken', 'evere', 'auderghem', 'oudergem', 'jette', 'koekelberg',
    'ganshoren', 'watermael', 'watermaal', 'saint-josse', 'sint-joost',
    // EU quarter landmarks and streets with many representations
    'berlaymont', 'rue de la loi', 'wetstraat', 'rue belliard', 'belliardstraat', 'rue wiertz', 'rue montoyer',
    'place du luxembourg', 'luxemburgplein', 'rond-point schuman', 'avenue palmerston', 'boulevard saint-michel',
  ].join('|'),
  'i',
);

// Brussels-Capital Region postcodes 1000–1210.
const BRUSSELS_POSTCODE = /\b(1[01]\d\d|120\d|1210)\b/;

const ONLINE = /\b(online|virtual|virtuell|livestream|webinar|zoom|teams)\b/i;

const ELSEWHERE = new RegExp(
  '\\b(' +
    [
      'berlin', 'münchen', 'muenchen', 'munich', 'hamburg', 'frankfurt', 'köln', 'koeln', 'cologne', 'bonn', 'dresden',
      'leipzig', 'stuttgart', 'düsseldorf', 'duesseldorf', 'hannover', 'bremen', 'mainz', 'wiesbaden', 'erfurt',
      'magdeburg', 'potsdam', 'kiel', 'schwerin', 'saarbrücken', 'saarbruecken', 'strasbourg', 'straßburg', 'strassburg',
      'luxembourg', 'luxemburg', 'paris', 'liège', 'liege', 'luik', 'lüttich', 'hasselt', 'antwerp', 'antwerpen', 'anvers',
      'ghent', 'gent', 'gand', 'leuven', 'louvain', 'bruges', 'brugge', 'namur', 'mons', 'ostend', 'oostende', 'ostende',
      'geneva', 'genève', 'genf', 'vienna', 'wien', 'prague', 'prag', 'madrid', 'rome', 'rom', 'warsaw', 'warschau',
      'thessaloniki', 'the hague', 'den haag', 'amsterdam', 'maastricht', 'aachen',
    ].join('|') +
    ')\\b',
  'i',
);

const PLACEHOLDER = /^(see event description|siehe beschreibung|tba|tbc|tbd|n\/a|-|–)?$/i;

export function inBrussels(location: string | undefined): BrusselsMatch {
  const text = (location ?? '').replace(/\s+/g, ' ').trim();
  if (PLACEHOLDER.test(text)) return 'unknown';
  // Brussels markers win: "Place du Luxembourg, Brussels" is in Brussels.
  if (BRUSSELS.test(text) || BRUSSELS_POSTCODE.test(text)) return 'yes';
  if (ELSEWHERE.test(text) || ONLINE.test(text)) return 'no';
  return 'unknown';
}
