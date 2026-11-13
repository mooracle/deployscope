'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const iching = require('../src/iching');
const numerology = require('../src/numerology');
const { divine, nextWindow } = require('../src/omens');
const { longitude, angleDiff } = require('../src/ephemeris');

const at = (iso) => Date.parse(iso);
const codes = (reading) => reading.omens.map((o) => o.code);

test('the King Wen table holds every hexagram exactly once', () => {
  const numbers = iching.KING_WEN.flat().sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 64 }, (_, i) => i + 1));
  assert.equal(iching.HEXAGRAMS.length, 64);
});

test('well-known hexagrams are found from their lines', () => {
  // Lines are listed bottom first.
  assert.equal(iching.hexagram([1, 1, 1, 1, 1, 1]).name, 'The Creative');
  assert.equal(iching.hexagram([0, 0, 0, 0, 0, 0]).name, 'The Receptive');
  assert.equal(iching.hexagram([1, 1, 1, 0, 0, 0]).number, 11); // earth over heaven
  assert.equal(iching.hexagram([0, 0, 0, 1, 1, 1]).number, 12); // heaven over earth
  assert.equal(iching.hexagram([1, 0, 1, 0, 1, 0]).number, 63); // water over fire
  assert.equal(iching.hexagram([0, 1, 0, 1, 0, 1]).number, 64); // fire over water
  assert.equal(iching.hexagram([1, 0, 0, 0, 1, 0]).number, 3); // water over thunder
  assert.equal(iching.hexagram([0, 1, 1, 0, 0, 1]).number, 18); // mountain over wind
  assert.equal(iching.hexagram([1, 1, 0, 1, 1, 0]).number, 58); // lake doubled
});

test('a casting is deterministic and its changing lines give the relating hexagram', () => {
  let changed = 0;
  for (let i = 0; i < 300; i++) {
    const casting = iching.cast(`seed-${i}`);
    assert.deepEqual(casting, iching.cast(`seed-${i}`));
    assert.ok(casting.values.every((v) => v >= 6 && v <= 9));
    if (!casting.changing.includes(true)) {
      assert.equal(casting.relating, null);
      continue;
    }
    changed++;
    const flipped = casting.lines.map((l, j) => (casting.changing[j] ? 1 - l : l));
    assert.equal(casting.relating.number, iching.hexagram(flipped).number);
    assert.notEqual(casting.relating.number, casting.primary.number);
  }
  // Each line changes with probability 1/4, so about 82% of castings change.
  assert.ok(changed > 210 && changed < 280, `changed ${changed}`);
});

test('release numbers reduce to a single digit, keeping master numbers', () => {
  assert.equal(numerology.read('v2.4.1').number, 7);
  assert.equal(numerology.read('v9.9.9').number, 9); // 27 -> 9
  assert.equal(numerology.read('v9.2.0').number, 11);
  assert.equal(numerology.read('v9.9.4').number, 22);
  assert.equal(numerology.read('1.0.0-rc.1').number, 2);
  assert.equal(numerology.read('v1.13.0').thirteen, true);
  assert.equal(numerology.read('v1.1.3').thirteen, false);
  assert.equal(numerology.read('latest'), null);
  assert.equal(numerology.read(undefined), null);
});

test('numerology applies only when a version is given', () => {
  const question = { time: at('2026-08-20T10:00:00Z'), seed: 'x' };
  assert.ok(!codes(divine(question)).some((c) => c.startsWith('OMEN6')));
  const tagged = divine({ ...question, version: 'v1.13.0' });
  assert.ok(codes(tagged).includes('OMEN605'));
  assert.ok(codes(tagged).includes('OMEN613'));
  assert.equal(tagged.score - divine(question).score, -6 - 8);
});

test('the natal chart is read only when a birth moment is given', () => {
  const question = { time: at('2026-11-13T12:00:00Z'), seed: 'x' };
  assert.equal(divine(question).natal, null);
  assert.ok(!codes(divine(question)).some((c) => c.startsWith('OMEN04')));
  const reading = divine({ ...question, born: at('2020-11-13T09:00:00Z') });
  assert.equal(reading.natal.sunSign, 'Scorpio');
  assert.ok(codes(reading).includes('OMEN041'), 'solar return on the birthday');
  assert.ok(!codes(divine({ ...question, born: at('2020-05-13T09:00:00Z') })).includes('OMEN041'));
});

test('a repository does not get a return on the day it is born', () => {
  const time = at('2026-11-13T12:00:00Z');
  const reading = divine({ time, seed: 'x', born: time - 3600000 });
  assert.ok(!codes(reading).includes('OMEN041'));
  assert.ok(!codes(reading).includes('OMEN042'));
  assert.ok(!codes(reading).includes('OMEN043'));
});

test('Saturn returns after about 29.5 years', () => {
  const time = at('2026-06-01T12:00:00Z');
  const now = longitude('Saturn', time);
  const day = 86400000;
  // The birth, 28 to 31 years back, on which Saturn stood where it stands now.
  let born;
  for (let t = time - 28 * 365 * day; born === undefined && t > time - 31 * 365 * day; t -= day) {
    if (Math.abs(angleDiff(longitude('Saturn', t), now)) < 0.5) born = t;
  }
  assert.ok(born, 'Saturn was at the same longitude 28 to 31 years earlier');
  const returning = divine({ time, seed: 'x', born });
  assert.ok(returning.omens.some((o) => o.code === 'OMEN043' && o.title === 'Saturn return' && o.delta === -15));
  const halfway = divine({ time, seed: 'x', born: born + 15 * 365 * day });
  assert.ok(!halfway.omens.some((o) => o.title === 'Saturn return'));
});

test('the next window is the first later hour that is not ill-omened', () => {
  const time = at('2026-11-13T12:00:00Z');
  let found = 0;
  for (let i = 0; i < 200 && found < 5; i++) {
    const question = { time, seed: `seed-${i}` };
    if (divine(question).verdict !== 'ill-omened') continue;
    const window = nextWindow(question);
    if (!window) continue;
    found++;
    assert.ok(window.time > time);
    assert.notEqual(divine({ ...question, time: window.time }).verdict, 'ill-omened');
    assert.equal(divine({ ...question, time: window.time - 3600000 }).verdict, 'ill-omened');
  }
  assert.equal(found, 5);
  assert.equal(nextWindow({ time, seed: 'x', failBelow: 100 }, 48), null);
});

function runAction(env) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'main.js')], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });
}

test('the action accepts a birth moment as ISO 8601 or Unix seconds', () => {
  const base = { INPUT_TIME: '2026-11-13T12:00:00Z', INPUT_SEED: 'x', 'INPUT_DEFY-FATE': 'true' };
  const iso = runAction({ ...base, INPUT_BORN: '2020-11-13T09:00:00Z' });
  const unix = runAction({ ...base, INPUT_BORN: String(at('2020-11-13T09:00:00Z') / 1000) });
  assert.equal(iso.status, 0);
  assert.match(iso.stdout, /Sun in Scorpio/);
  assert.equal(unix.stdout, iso.stdout);
  for (const born of ['yesterday', '2030-01-01T00:00:00Z']) {
    const bad = runAction({ ...base, INPUT_BORN: born });
    assert.equal(bad.status, 2);
    assert.match(bad.stdout, /::error title=OMEN400/);
  }
});

test('a refused deployment is told when to come back', () => {
  const iso = '2026-11-13T12:00:00Z';
  let seed;
  for (let i = 0; seed === undefined; i++) {
    const question = { time: at(iso), seed: `seed-${i}` };
    if (divine(question).verdict === 'ill-omened' && nextWindow(question)) seed = `seed-${i}`;
  }
  const result = runAction({ INPUT_TIME: iso, INPUT_SEED: seed });
  assert.equal(result.status, 1);
  const expected = new Date(nextWindow({ time: at(iso), seed }).time).toISOString().slice(0, 16).replace('T', ' ');
  assert.ok(result.stdout.includes(`The next favourable window opens around ${expected} UTC`), result.stdout.split('\n').pop());
});
