'use strict';

const { sky } = require('./ephemeris');

const YEAR_MS = 365.25 * 86400000;

// Character of a repository by the sign its Sun was in when it was created.
const TRAITS = {
  Aries: 'ships first, reads the issue later',
  Taurus: 'stable, stubborn, still on the previous major version',
  Gemini: 'two config formats, both load-bearing',
  Cancer: 'protective of its state, reluctant to delete old data',
  Leo: 'a generous README and a large logo',
  Virgo: 'strict linting and an exhaustive changelog',
  Libra: 'every decision is an open RFC',
  Scorpio: 'intense, secretive, hoards environment variables',
  Sagittarius: 'optimistic roadmaps and adventurous dependencies',
  Capricorn: 'disciplined, born with a compliance checklist',
  Aquarius: 'unconventional architecture, ahead of its time',
  Pisces: 'dreamy and eventually consistent',
};

// The sky at the moment the repository was created, and its age at `time`.
function chart(born, time) {
  const positions = sky(born);
  return { born, positions, age: (time - born) / YEAR_MS, sunSign: positions.Sun.sign, trait: TRAITS[positions.Sun.sign] };
}

module.exports = { TRAITS, chart };
