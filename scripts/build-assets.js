'use strict';

// Writes the static images that pull request comments link to:
// assets/icon.svg, assets/cards/<n>.svg, assets/cards/<n>r.svg (reversed) and assets/hexagrams/<n>.svg.
// Run with `npm run assets` after changing src/svg.js; a test checks they are current.

const fs = require('node:fs');
const path = require('node:path');
const { cardSvg, deckSvg, hexagramSvg, iconSvg } = require('../src/svg');
const { DECK } = require('../src/tarot');

function assets() {
  const files = { 'icon.svg': iconSvg() };
  DECK.forEach((_, number) => {
    files[`cards/${number}.svg`] = cardSvg(number, false);
    files[`cards/${number}r.svg`] = cardSvg(number, true);
  });
  for (let number = 1; number <= 64; number++) files[`hexagrams/${number}.svg`] = hexagramSvg(number);
  return files;
}

if (require.main === module) {
  const root = path.join(__dirname, '..', 'assets');
  for (const [name, content] of Object.entries(assets())) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  // The deck on one sheet, shown in the README.
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'deck.svg'), deckSvg());
}

module.exports = { assets };
