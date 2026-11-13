'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const tarot = require('../src/tarot');
const { divine, BASE_SCORE } = require('../src/omens');
const report = require('../src/report');

const at = (iso) => Date.parse(iso);
const codes = (reading) => reading.omens.map((o) => o.code);

test('the same seed always draws the same three distinct cards', () => {
  for (const seed of ['a', 'b', 'deadbeef', '']) {
    const cards = tarot.draw(seed);
    assert.deepEqual(cards, tarot.draw(seed));
    assert.equal(new Set(cards.map((c) => c.name)).size, 3);
  }
});

test('different seeds reach the whole deck in both orientations', () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    for (const card of tarot.draw(`seed-${i}`)) seen.add(`${card.name}/${card.reversed}`);
  }
  assert.equal(seen.size, tarot.DECK.length * 2);
});

test('divination is deterministic and the score is the clamped sum of omens', () => {
  const question = { time: at('2026-08-20T10:00:00Z'), seed: 'abc123' };
  const reading = divine(question);
  assert.deepEqual(reading, divine(question));
  const sum = reading.omens.reduce((total, o) => total + o.delta, BASE_SCORE);
  assert.equal(reading.score, Math.max(0, Math.min(100, sum)));
});

test('Mercury retrograde is reported as an error', () => {
  const reading = divine({ time: at('2026-07-10T12:00:00Z'), seed: 'x' });
  const omen = reading.omens.find((o) => o.code === 'OMEN001');
  assert.equal(omen.severity, 'error');
  assert.equal(omen.delta, -25);
});

test('Friday the 13th is its own error, and only on a Friday the 13th', () => {
  assert.ok(codes(divine({ time: at('2026-11-13T12:00:00Z'), seed: 'x' })).includes('OMEN013'));
  assert.ok(!codes(divine({ time: at('2026-11-12T12:00:00Z'), seed: 'x' })).includes('OMEN013'));
  assert.ok(!codes(divine({ time: at('2026-11-20T12:00:00Z'), seed: 'x' })).includes('OMEN013'));
});

test('the weekday follows the configured timezone', () => {
  const time = at('2026-11-13T23:30:00Z');
  const title = (timezone) => divine({ time, seed: 'x', timezone }).omens.find((o) => o.code === 'OMEN030').title;
  assert.match(title('UTC'), /^Friday/);
  assert.match(title('Asia/Tokyo'), /^Saturday/);
});

test('the verdict follows the threshold', () => {
  const question = { time: at('2026-08-20T10:00:00Z'), seed: 'abc123' };
  const { score } = divine(question);
  assert.equal(divine({ ...question, failBelow: score + 1 }).verdict, 'ill-omened');
  assert.notEqual(divine({ ...question, failBelow: score }).verdict, 'ill-omened');
  assert.notEqual(divine({ ...question, failBelow: 0 }).verdict, 'ill-omened');
});

test('workflow commands are escaped', () => {
  assert.equal(report.annotation('error', 'a:b,c', '100%\nbad'), '::error title=a%3Ab%2Cc::100%25%0Abad');
});

function runAction(env) {
  return spawnSync(process.execPath, [path.join(__dirname, '..', 'src', 'main.js')], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });
}

// Find a seed whose fate on a fixed date is known, so the exit code can be checked end to end.
function seedWith(time, predicate) {
  for (let i = 0; i < 1000; i++) {
    if (predicate(divine({ time, seed: `seed-${i}` }))) return `seed-${i}`;
  }
  throw new Error('no such seed');
}

test('the action exits 1 on an ill-omened deployment, 0 when fate is defied', () => {
  const iso = '2026-11-13T12:00:00Z';
  const seed = seedWith(at(iso), (r) => r.verdict === 'ill-omened');
  const failed = runAction({ INPUT_TIME: iso, INPUT_SEED: seed });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /::error title=OMEN500 Verdict::/);
  const defied = runAction({ INPUT_TIME: iso, INPUT_SEED: seed, 'INPUT_DEFY-FATE': 'true' });
  assert.equal(defied.status, 0);
  assert.match(defied.stdout, /::warning title=OMEN299 Fate defied::/);
});

test('the action exits 0 on a favourable day', () => {
  const iso = '2026-08-20T10:00:00Z';
  const seed = seedWith(at(iso), (r) => r.verdict !== 'ill-omened');
  const result = runAction({ INPUT_TIME: iso, INPUT_SEED: seed });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /::notice title=OMEN200 Verdict::/);
});

test('bad inputs are a configuration error, not a prophecy', () => {
  for (const env of [{ INPUT_TIME: 'next tuesday' }, { 'INPUT_FAIL-BELOW': 'high' }, { INPUT_TIMEZONE: 'Mars/Olympus_Mons' }]) {
    const result = runAction(env);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /::error title=OMEN400/);
  }
});
