import { describe, expect, it } from 'vitest';
import { inBrussels } from '../src/lib/location';

describe('inBrussels', () => {
  it.each([
    ['Brussels', 'yes'],
    ['Rue Montoyer 47, 1000 Bruxelles', 'yes'],
    ['Avenue Palmerston 20', 'yes'],
    ['Place du Luxembourg', 'yes'], // Brussels square, not the country
    ['Ixelles', 'yes'],
    ['B-1040', 'yes'], // Belgian postcode notation
    ['1040 Etterbeek', 'yes'],
    ['Berlin', 'no'],
    ['Biennale de l’Image Possible, Liège', 'no'],
    ['Online', 'no'],
    ['Online and Brussels', 'yes'],
    ['See event description', 'unknown'],
    ['', 'unknown'],
    [undefined, 'unknown'],
    ['Haus der Europäischen Geschichte', 'unknown'],
  ])('%s → %s', (location, expected) => {
    expect(inBrussels(location)).toBe(expected);
  });
});
