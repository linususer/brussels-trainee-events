/**
 * Interactive helper for manual entries (invitations, newsletters, LinkedIn, ...).
 * Suggests categories and registration from the event's own text; you confirm
 * or change them. Appends to data/manual-events.yaml.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { CATEGORIES, REGISTRATION, makeId, type Category, type EventInput } from '../src/lib/event';
import { classify } from '../src/lib/classify';
import { inBrussels } from '../src/lib/location';
import { appendManualEvent, resolveEnd } from '../src/lib/manual';
import { parseDate } from '../scrapers/adapters/html';

const FILE = resolve(import.meta.dirname, '../data/manual-events.yaml');
// Read lines in sequence: rl.question() drops lines that arrive before the prompt (pasted input).
const rl = createInterface({ input: stdin, terminal: false });
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, fallback = ''): Promise<string> {
  const hint = fallback ? ` [${fallback}]` : '';
  stdout.write(`${question}${hint}: `);
  const { value, done } = await lines.next();
  if (done) throw new Error('input ended before all questions were answered');
  return String(value).trim() || fallback;
}

async function askRequired(
  question: string,
  check: (v: string) => string | undefined = (v) => v || undefined,
  fallback = '',
): Promise<string> {
  for (;;) {
    const value = check(await ask(question, fallback));
    if (value) return value;
    console.log('  Please enter a valid value.');
  }
}

console.log('New manual event (Enter accepts the suggestion in [brackets]).\n');

const title = await askRequired('Title');
const start = await askRequired('Start (e.g. "5.12.2026 18:30" or "2026-12-05")', (v) => parseDate(v));
const endInput = await ask('End (date/time, or just "21:00"; empty for none)');
const end = resolveEnd(start, endInput, parseDate);
const organiser = await askRequired('Organiser');
const location = await ask('Location');
if (inBrussels(location) === 'no') console.log('  ⚠ This location does not look like Brussels (scope is Brussels only).');
const url = await askRequired('Link (details or registration; empty for none)', (v) => {
  if (!v) return ' ';
  try {
    return new URL(v).protocol.startsWith('http') ? v : undefined;
  } catch {
    return undefined;
  }
}).then((v) => v.trim());
const description = await ask('Short description');

const suggestion = classify({ title, description });
const categoryList = Object.keys(CATEGORIES).join(', ');
const categoriesInput = await ask(`Categories (comma-separated: ${categoryList})`, suggestion.categories.join(', '));
const categories = categoriesInput
  .split(/[,\s]+/)
  .filter(Boolean)
  .filter((c): c is Category => {
    const known = c in CATEGORIES;
    if (!known) console.log(`  Ignoring unknown category "${c}".`);
    return known;
  });
const registration = (await askRequired(
  `Registration (${Object.keys(REGISTRATION).join(' | ')})`,
  (v) => (v in REGISTRATION ? v : undefined),
  suggestion.registration,
)) as EventInput['registration'];
const country = (await ask('Country of the organiser (ISO code)', 'DE')).toUpperCase();

const entry: EventInput = {
  id: makeId('manual', start, title),
  title,
  start,
  end,
  organiser,
  location: location || undefined,
  url: url || undefined,
  description: description || undefined,
  categories,
  registration,
  country,
};

try {
  writeFileSync(FILE, appendManualEvent(readFileSync(FILE, 'utf8'), entry));
  console.log(`\n✔ Added "${title}" (${entry.id}) to data/manual-events.yaml`);
} catch (err) {
  console.error(`\n✘ Not saved: ${(err as Error).message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
