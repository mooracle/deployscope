'use strict';

// The rules a practitioner would look for: dignities, combustion, graded orbs,
// applying and separating aspects, the ascendant and houses, the full deck.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const tarot = require('../src/tarot');
const numerology = require('../src/numerology');
const { divine } = require('../src/omens');
const { BODIES, sky, ascendant, angleDiff, signOf } = require('../src/ephemeris');

const at = (iso) => Date.parse(iso);
const DAY = 86400000;
const titles = (reading) => reading.omens.map((o) => o.title);

// The first reading, day by day from `from`, that satisfies `wanted`.
function firstDay(from, wanted, question = {}, days = 800) {
  for (let i = 0; i < days; i++) {
    const reading = divine({ time: at(from) + i * DAY, seed: 'x', ...question });
    if (wanted(reading)) return reading;
  }
  throw new Error('no such day');
}

test('Pluto is in the sky, in Aquarius through the 2020s', () => {
  assert.ok(BODIES.includes('Pluto'));
  assert.equal(sky(at('2026-11-13T12:00:00Z')).Pluto.sign, 'Aquarius');
  assert.equal(signOf(sky(at('2000-01-01T12:00:00Z')).Pluto.lon), 'Sagittarius');
});

test('a planet in its own sign is dignified, opposite its exaltation it is in fall', () => {
  const leo = divine({ time: at('2026-08-10T12:00:00Z'), seed: 'x' });
  assert.equal(leo.omens.find((o) => o.title === 'Sun in domicile').delta, 4);
  const libra = divine({ time: at('2026-10-10T12:00:00Z'), seed: 'x' });
  assert.equal(libra.omens.find((o) => o.title === 'Sun in fall').delta, -3);
  const gemini = divine({ time: at('2026-06-10T12:00:00Z'), seed: 'x' });
  assert.ok(!titles(gemini).some((t) => t.startsWith('Sun in ')));
});

test('Mercury in Virgo is counted once, as domicile', () => {
  const virgo = firstDay('2026-01-01T12:00:00Z', (r) => r.positions.Mercury.sign === 'Virgo');
  assert.deepEqual(titles(virgo).filter((t) => t.startsWith('Mercury in ')), ['Mercury in domicile']);
});

test('a planet near the Sun is combust, not conjunct', () => {
  const near = (r) => Math.abs(angleDiff(r.positions.Venus.lon, r.positions.Sun.lon));
  const combust = firstDay('2026-01-01T12:00:00Z', (r) => near(r) < 5 && near(r) > 1);
  assert.ok(combust.omens.find((o) => o.code === 'OMEN021' && o.title === 'Venus is combust').delta < 0);
  assert.ok(!titles(combust).includes('Sun conjunct Venus'));
});

test('an aspect counts in full while applying and half once separating', () => {
  let seen = { true: 0, false: 0 };
  for (let i = 0; i < 60; i++) {
    const time = at('2026-03-01T00:00:00Z') + i * 5 * DAY;
    const later = sky(time + 3600000);
    for (const aspect of divine({ time, seed: 'x' }).aspects) {
      const angle = { conjunct: 0, sextile: 60, square: 90, trine: 120, opposite: 180 }[aspect.name];
      const orbLater = Math.abs(Math.abs(angleDiff(later[aspect.a].lon, later[aspect.b].lon)) - angle);
      // Leave out aspects so near a turning point that an hour does not tell.
      if (Math.abs(orbLater - aspect.orb) < 1e-4) continue;
      assert.equal(aspect.applying, orbLater < aspect.orb, `${aspect.a} ${aspect.name} ${aspect.b}`);
      seen[aspect.applying]++;
    }
  }
  assert.ok(seen.true > 20 && seen.false > 20);
});

test('orbs are graded: wide for a conjunction, narrow for a sextile', () => {
  const widest = {};
  for (let i = 0; i < 400; i++) {
    for (const aspect of divine({ time: at('2026-01-01T00:00:00Z') + i * DAY, seed: 'x' }).aspects) {
      widest[aspect.name] = Math.max(widest[aspect.name] || 0, aspect.orb);
    }
  }
  assert.ok(widest.sextile <= 3 && widest.square <= 5 && widest.trine <= 5);
  assert.ok(widest.conjunct > 5 && widest.conjunct <= 6);
  assert.ok(widest.opposite > 5 && widest.opposite <= 6);
});

test('the ascendant is where the ecliptic meets the eastern horizon', () => {
  // On the equator, with 0° Aries on the meridian, 0° Cancer is rising.
  assert.ok(Math.abs(ascendant(at('2000-01-01T12:00:00Z'), 0, -280.46061837) - 90) < 0.01);
  // Greenwich at J2000: about 24° Aries.
  assert.ok(Math.abs(ascendant(at('2000-01-01T12:00:00Z'), 51.48, 0) - 24) < 1);
});

test('houses are read only when the birthplace is known', () => {
  const question = { born: at('2019-05-05T08:00:00Z') };
  const housed = (r) => r.omens.some((o) => o.code === 'OMEN045');
  const placed = firstDay('2026-01-01T12:00:00Z', housed, { ...question, birthplace: { latitude: 59.33, longitude: 18.07 } });
  assert.equal(typeof placed.natal.ascendant.sign, 'string');
  const unplaced = divine({ time: placed.time, seed: 'x', ...question });
  assert.equal(unplaced.natal.ascendant, null);
  assert.ok(!housed(unplaced));
});

test('Jupiter returns after about twelve years', () => {
  const born = at('2014-03-01T00:00:00Z');
  const returned = firstDay('2025-06-01T00:00:00Z', (r) => r.omens.some((o) => o.code === 'OMEN044'), { born });
  assert.ok(Math.abs(returned.natal.age - 11.86) < 0.6);
  assert.ok(!divine({ time: born + 30 * DAY, seed: 'x', born }).omens.some((o) => o.code === 'OMEN044'));
});

test('a version whose digits pass through 13, 14, 16 or 19 carries a karmic debt', () => {
  assert.equal(numerology.read('v9.4').karmic.number, 13);
  assert.equal(numerology.read('v8.8.3').karmic.number, 19);
  assert.equal(numerology.read('v1.2.0').karmic, null);
  const reading = divine({ time: at('2026-08-20T10:00:00Z'), seed: 'x', version: 'v9.4' });
  assert.equal(reading.omens.find((o) => o.code === 'OMEN640').title, 'Karmic debt 13');
});

test('the deck is the full 78: 22 major arcana and four suits of fourteen', () => {
  assert.equal(tarot.DECK.length, 78);
  assert.equal(new Set(tarot.DECK.map((card) => card.name)).size, 78);
  assert.equal(tarot.DECK[tarot.MAJORS].name, 'Ace of Wands');
  assert.equal(tarot.DECK[77].name, 'King of Pentacles');
  for (const suit of Object.keys(tarot.SUITS)) assert.equal(tarot.DECK.filter((card) => card.suit === suit).length, 14);
});

test('the outcome card weighs three times the card of the past', () => {
  for (const seed of ['a', 'b', 'c', 'd']) {
    tarot.draw(seed).forEach((card, i) => {
      const [base] = tarot.DECK[card.number][card.reversed ? 'reversed' : 'upright'];
      assert.equal(card.delta, Math.round(base * [0.5, 1, 1.5][i]));
    });
  }
});

test('a birthplace that is not a place is a configuration error', () => {
  const run = (birthplace) => spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'main.js')], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, INPUT_TIME: '2026-08-20T10:00:00Z', INPUT_SEED: 'x', INPUT_BORN: '2020-01-01T00:00:00Z', INPUT_BIRTHPLACE: birthplace, 'INPUT_DEFY-FATE': 'true' },
  });
  for (const bad of ['Stockholm', '59.33', '95, 18']) {
    const result = run(bad);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /::error title=OMEN400/);
  }
  const good = run('59.33, 18.07');
  assert.equal(good.status, 0);
  assert.match(good.stdout, /rising\./);
});
