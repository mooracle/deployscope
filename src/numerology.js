'use strict';

// Release numbers: [score delta, reading]. 11, 22 and 33 are master numbers
// and are not reduced further.
const NUMBERS = {
  1: [6, 'Beginnings and leadership. A fine number for the first of a line.'],
  2: [3, 'Partnership. It goes well if the dependants are told first.'],
  3: [7, 'Expression. Users will talk about this release.'],
  4: [5, 'Foundation. Boring in the best sense.'],
  5: [-6, 'Restlessness and change. A breaking change hides in here somewhere.'],
  6: [4, 'Care and responsibility. Maintenance energy; backports are welcome.'],
  7: [-2, 'Introspection. More refactoring than feature; nobody will notice it shipped.'],
  8: [8, 'Power and material success. Good for performance and for revenue.'],
  9: [-4, 'Completion. This release line is nearing its end of life.'],
  11: [9, 'A master number: illumination. The release where it finally makes sense.'],
  22: [12, 'A master number: the master builder. The architecture holds.'],
  33: [10, 'A master number: the master teacher. Even the documentation is complete.'],
};

// Karmic debt numbers: a sum that passes through one of these on its way down
// carries a debt from earlier releases.
const KARMIC = {
  13: 'Work that was shirked comes due: the shortcuts of earlier releases are all in this one.',
  14: 'Freedom was abused: this release pays for the breaking changes that went before it.',
  16: 'The number of the Tower: what was built on ego is brought down.',
  19: 'Power was misused: this release must stand alone, and its dependencies will not help.',
};

// The sums a number passes through on its way down, itself first.
function chain(n) {
  const steps = [n];
  while (n > 9 && !(n in NUMBERS)) {
    n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
    steps.push(n);
  }
  return steps;
}

function reduce(n) {
  return chain(n).pop();
}

// Reads a release tag such as v2.4.1. Returns null when it holds no digits.
function read(version) {
  const digits = String(version || '').match(/\d/g);
  if (!digits) return null;
  const sum = digits.reduce((total, d) => total + Number(d), 0);
  if (sum === 0) return null;
  const number = reduce(sum);
  const [delta, reading] = NUMBERS[number];
  const thirteen = String(version).match(/\d+/g).includes('13');
  const debt = chain(sum).find((step) => step in KARMIC);
  return { version: String(version), sum, number, delta, reading, thirteen, karmic: debt ? { number: debt, reading: KARMIC[debt] } : null };
}

module.exports = { NUMBERS, KARMIC, reduce, read };
