'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { longitude, speed, sky, moonElongation, moonVoidOfCourse, angleDiff, signOf } = require('../src/ephemeris');

const at = (iso) => Date.parse(iso);

test('the Sun is at 0° Aries at the March equinox', () => {
  const lon = longitude('Sun', at('2026-03-20T14:46:00Z'));
  assert.ok(Math.abs(angleDiff(lon, 0)) < 0.1, `got ${lon}`);
});

test('the Sun is at 90° at the June solstice', () => {
  const lon = longitude('Sun', at('2026-06-21T08:24:00Z'));
  assert.ok(Math.abs(angleDiff(lon, 90)) < 0.1, `got ${lon}`);
});

test('Mercury is retrograde during the published 2026 retrograde periods', () => {
  for (const day of ['2026-03-08', '2026-07-10', '2026-11-02']) {
    assert.ok(speed('Mercury', at(`${day}T12:00:00Z`)) < 0, `expected retrograde on ${day}`);
  }
});

test('Mercury is direct between them', () => {
  for (const day of ['2026-01-15', '2026-05-01', '2026-09-01', '2026-12-10']) {
    assert.ok(speed('Mercury', at(`${day}T12:00:00Z`)) > 0, `expected direct on ${day}`);
  }
});

test('Mars was retrograde in January 2025 and is direct in mid 2026', () => {
  assert.ok(speed('Mars', at('2025-01-15T12:00:00Z')) < 0);
  assert.ok(speed('Mars', at('2026-06-15T12:00:00Z')) > 0);
});

test('the Moon is opposite the Sun at a full moon and with it at a new moon', () => {
  const full = moonElongation(at('2026-11-24T14:53:00Z'));
  assert.ok(Math.abs(angleDiff(full, 180)) < 2, `full moon elongation ${full}`);
  const fresh = moonElongation(at('2026-11-09T07:02:00Z'));
  assert.ok(Math.abs(angleDiff(fresh, 0)) < 2, `new moon elongation ${fresh}`);
});

test('the Sun and Moon never go retrograde', () => {
  for (let day = 0; day < 400; day += 7) {
    const positions = sky(at('2026-01-01T00:00:00Z') + day * 86400000);
    assert.equal(positions.Sun.retrograde, false);
    assert.equal(positions.Moon.retrograde, false);
  }
});

test('signOf maps longitudes to signs', () => {
  assert.equal(signOf(0), 'Aries');
  assert.equal(signOf(29.99), 'Aries');
  assert.equal(signOf(230), 'Scorpio');
  assert.equal(signOf(359.9), 'Pisces');
});

test('a void-of-course Moon stays void until it changes sign', () => {
  const start = at('2026-01-01T00:00:00Z');
  let voids = 0;
  const hours = 24 * 120;
  for (let hour = 0; hour < hours; hour++) {
    const time = start + hour * 3600000;
    const voidOfCourse = moonVoidOfCourse(time);
    if (!voidOfCourse) continue;
    voids++;
    assert.ok(voidOfCourse.until > time);
    assert.equal(signOf(longitude('Moon', voidOfCourse.until)), voidOfCourse.enters);
    assert.notEqual(signOf(longitude('Moon', time)), voidOfCourse.enters);
    const midway = time + (voidOfCourse.until - time) / 2;
    if (midway - time > 3600000) assert.ok(moonVoidOfCourse(midway), 'still void halfway to the sign change');
  }
  // With eight bodies to aspect the Moon is void roughly a sixth of the time.
  assert.ok(voids / hours > 0.05 && voids / hours < 0.35, `void fraction ${voids / hours}`);
});
