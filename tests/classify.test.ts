import { describe, expect, it } from 'vitest';
import { classify } from '../src/lib/classify';

describe('classify categories', () => {
  it.each([
    ['Podiumsdiskussion zur Zukunft der Kohäsionspolitik, anschließend Empfang', ['policy', 'party']],
    ['Adventsempfang der Landesvertretung', ['party']],
    ['Besuch des Weihnachtsmarkts', ['christmas-market']],
    ['Plaisirs d’Hiver together', ['christmas-market']],
    ["Plaisirs d'Hiver together", ['christmas-market']],
    ['Stammtisch der Jungen Europäer', ['networking']],
    ['Vernissage: Fotografie aus Thüringen', ['culture']],
    ['Brussels 20 km run with colleagues', ['sport']],
    ['Mitgliederversammlung', []],
    ['European perspectives on German rearmament (Discussion)', ['policy']],
    ['EU-India Climate Expert Workshop', ['policy']],
    ['Upcycling workshop', []], // a workshop alone is not a policy event
  ])('%s → %j', (title, expected) => {
    expect(classify({ title }).categories).toEqual(expected);
  });

  it('labels by event content, not by who organises it', () => {
    // A political foundation's summer party is a party, not a policy event.
    expect(classify({ title: 'Sommerfest der Stiftung' }).categories).toEqual(['party']);
  });

  it("uses the description and the source's own labels", () => {
    expect(classify({ title: 'Europa am Abend', description: 'Ein Konzert mit anschließenden Drinks' }).categories).toEqual([
      'networking',
      'culture',
    ]);
    expect(classify({ title: 'Europa am Abend', labels: ['Diskussion'] }).categories).toEqual(['policy']);
  });

  it('does not match short words inside other words', () => {
    expect(classify({ title: 'Festival of Regions' }).categories).toEqual([]);
    expect(classify({ title: 'Brunch' }).categories).toEqual([]);
  });
});

describe('classify registration', () => {
  it.each([
    ['Teilnahme nur auf Einladung', 'invitation'],
    ['By invitation only', 'invitation'],
    ['Participation sur invitation', 'invitation'],
    ['Keine Anmeldung erforderlich', 'not-required'],
    ['Anmeldung erforderlich bis 1.12.', 'required'],
    ['Please register via the link', 'required'],
    ['Eintritt frei', 'unknown'],
  ])('%s → %s', (description, expected) => {
    expect(classify({ title: 'Event', description }).registration).toBe(expected);
  });
});
