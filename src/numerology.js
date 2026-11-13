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

function reduce(n) {
  while (n > 9 && !(n in NUMBERS)) {
    n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
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
  return { version: String(version), sum, number, delta, reading, thirteen };
}

module.exports = { NUMBERS, reduce, read };
