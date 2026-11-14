'use strict';

const { BODIES, SIGNS, angleDiff, sky, speed, moonElongation, moonVoidOfCourse } = require('./ephemeris');
const tarot = require('./tarot');
const iching = require('./iching');
const numerology = require('./numerology');
const { chart } = require('./natal');

const BASE_SCORE = 80;
const AUSPICIOUS_FROM = 90;

// What each body governs in a delivery pipeline.
const DOMAINS = {
  Sun: 'the main branch',
  Moon: 'the on-call mood',
  Mercury: 'networking, DNS and message queues',
  Venus: 'the UI and user affection',
  Mars: 'hotfixes and force pushes',
  Jupiter: 'scaling and capacity',
  Saturn: 'tech debt and compliance',
  Uranus: 'sudden outages and shiny rewrites',
  Neptune: 'caches, mocks and other illusions',
  Pluto: 'deletions and migrations that cannot be undone',
};

const BENEFICS = ['Venus', 'Jupiter'];
const MALEFICS = ['Mars', 'Saturn', 'Uranus', 'Pluto'];
// Aspects between two of these last for months and are nobody's deploy's fault.
const SLOW = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// The stronger the aspect, the wider the orb within which it is felt.
const ASPECTS = [
  { name: 'conjunct', angle: 0, orb: 6 },
  { name: 'sextile', angle: 60, orb: 3, harmony: 1 },
  { name: 'square', angle: 90, orb: 5, harmony: -1 },
  { name: 'trine', angle: 120, orb: 5, harmony: 1 },
  { name: 'opposite', angle: 180, orb: 6, harmony: -1 },
];

// A planet this close to the Sun is combust: burnt up and out of sight. One
// within 17 minutes of arc is cazimi, in the heart of the Sun, and strongest of all.
const COMBUSTIBLE = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const COMBUST_ORB = 8;
const CAZIMI_ORB = 17 / 60;

// Essential dignities of the seven classical planets: the signs each rules, is
// exalted in, is in detriment in (opposite its own) and falls in (opposite its exaltation).
const DIGNITIES = {
  Sun: { domicile: ['Leo'], exaltation: ['Aries'], detriment: ['Aquarius'], fall: ['Libra'] },
  Moon: { domicile: ['Cancer'], exaltation: ['Taurus'], detriment: ['Capricorn'], fall: ['Scorpio'] },
  Mercury: { domicile: ['Gemini', 'Virgo'], exaltation: ['Virgo'], detriment: ['Sagittarius', 'Pisces'], fall: ['Pisces'] },
  Venus: { domicile: ['Taurus', 'Libra'], exaltation: ['Pisces'], detriment: ['Aries', 'Scorpio'], fall: ['Virgo'] },
  Mars: { domicile: ['Aries', 'Scorpio'], exaltation: ['Capricorn'], detriment: ['Taurus', 'Libra'], fall: ['Cancer'] },
  Jupiter: { domicile: ['Sagittarius', 'Pisces'], exaltation: ['Cancer'], detriment: ['Gemini', 'Virgo'], fall: ['Capricorn'] },
  Saturn: { domicile: ['Capricorn', 'Aquarius'], exaltation: ['Libra'], detriment: ['Cancer', 'Leo'], fall: ['Aries'] },
};
// [score delta, how it is said, what it does], strongest first.
const DIGNITY = {
  domicile: [4, 'its own sign', 'at home and at full strength'],
  exaltation: [3, 'the sign of its exaltation', 'an honoured guest, and it shows'],
  detriment: [-4, 'the sign of its detriment', 'working against its own nature'],
  fall: [-3, 'the sign of its fall', 'weak and unheard'],
};

// Transits: the moving sky against the sensitive points of the repository's
// natal chart. The Moon is left out, it transits everything every month.
const TRANSITING = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const NATAL_POINTS = {
  Sun: "the repository's core purpose",
  Moon: "its users' habits",
  Mercury: 'its APIs and integrations',
  Ascendant: 'its public face, the README',
};
// A slow planet lingers for weeks, so it is only counted when nearly exact.
const TRANSIT_ORB = 3;
const SLOW_TRANSIT_ORB = 1.5;

// The two houses of a natal chart that a deployment touches, counted in whole
// signs from the ascendant.
const HOUSES = {
  6: 'the sixth house, of daily toil: the pipeline',
  10: 'the tenth house, of public standing: production',
};

// [score delta, title, message] for retrograde motion. Mercury is handled separately.
const RETROGRADES = {
  Venus: [-5, 'Users will not love this release the way you do.'],
  Mars: [-10, 'Forceful action backfires: no force pushes, no hotfixes on top of hotfixes.'],
  Jupiter: [-3, 'Growth turns inward. Capacity plans are optimistic.'],
  Saturn: [-5, 'Old tech debt comes due.'],
  Uranus: [-2, 'Disruption is postponed, not cancelled.'],
  Neptune: [-2, 'Cache invalidation is even harder than usual.'],
  Pluto: [-2, 'What was deleted is not as gone as you think.'],
};

// Planetary rulers of the weekdays, the classical way: [ruler, delta, message].
const DAYS = {
  Monday: ['Moon', -2, 'Moods are changeable and so are requirements.'],
  Tuesday: ['Mars', 3, 'A day for decisive action.'],
  Wednesday: ['Mercury', 5, 'Messages arrive and packets route.'],
  Thursday: ['Jupiter', 6, 'The most fortunate day of the week to ship.'],
  Friday: ['Venus', 3, 'Venus favours what pleases: a good day for the UI.'],
  Saturday: ['Saturn', 2, 'Saturn favours what must last: migrations and hardening.'],
  Sunday: ['Sun', 3, 'The Sun favours what should be seen: launches.'],
};

// The planets have nothing against these days; the elders of operations do.
// Custom, not astrology: [code, delta, title, message].
const CUSTOMS = {
  Friday: ['OMEN031', -15, 'Read-only Friday', 'No planet forbids a Friday deploy; the elders of operations do. Whoever ships today owns the weekend.'],
  Saturday: ['OMEN032', -10, 'Weekend deploy', 'It is the weekend. Nobody is around to roll it back.'],
  Sunday: ['OMEN032', -10, 'Weekend deploy', 'It is the weekend. Nobody is around to roll it back.'],
};

function severityOf(delta, errorAt = -12) {
  if (delta <= errorAt) return 'error';
  return delta < 0 ? 'warning' : 'notice';
}

// A station is the turning point of a retrograde and its most intense moment.
// Which way Mercury is turning shows in whether its speed is rising or falling.
function mercuryStation(time) {
  const day = 86400000;
  return speed('Mercury', time + day / 2) > speed('Mercury', time - day / 2) ? 'direct' : 'retrograde';
}

function retrogradeOmens(positions, time) {
  const omens = [];
  const mercury = positions.Mercury;
  if (mercury.stationary && mercuryStation(time) === 'retrograde') {
    omens.push({ code: 'OMEN003', severity: 'error', delta: -30, title: 'Mercury is stationing retrograde',
      message: `Mercury (${DOMAINS.Mercury}) stands still in ${mercury.sign}, turning retrograde: the most intense moment of the cycle. `
        + 'Expect hangs, timeouts and jobs stuck in "queued".' });
  } else if (mercury.stationary) {
    omens.push({ code: 'OMEN003', severity: 'error', delta: -15, title: 'Mercury is stationing direct',
      message: `Mercury (${DOMAINS.Mercury}) stands still in ${mercury.sign}, turning direct. The retrograde is ending, `
        + 'but nothing moves yet: let the queues drain before you add to them.' });
  } else if (mercury.retrograde) {
    omens.push({ code: 'OMEN001', severity: 'error', delta: -25, title: 'Mercury is retrograde',
      message: `Mercury rules ${DOMAINS.Mercury}, and it is moving backwards through ${mercury.sign}. `
        + 'Messages will be lost, duplicated, or delivered to the wrong environment.' });
  }
  for (const [body, [delta, message]] of Object.entries(RETROGRADES)) {
    if (!positions[body].retrograde) continue;
    omens.push({ code: 'OMEN002', severity: severityOf(delta), delta, title: `${body} is retrograde`,
      message: `${body} (${DOMAINS[body]}) is retrograde in ${positions[body].sign}. ${message}` });
  }
  return omens;
}

function aspectDelta(aspect, a, b) {
  const benefic = BENEFICS.includes(a) || BENEFICS.includes(b);
  const malefic = MALEFICS.includes(a) || MALEFICS.includes(b);
  if (aspect.harmony === 1) return benefic ? 6 : 4;
  if (aspect.harmony === -1) return malefic ? -7 : -4;
  return (benefic ? 5 : 0) + (malefic ? -5 : 0);
}

function aspectVerb(delta) {
  if (delta > 0) return 'in harmony with';
  return delta < 0 ? 'at odds with' : 'entangled with';
}

// An aspect still closing (applying) is something about to happen and counts
// in full; one already past exact (separating) is spent and counts half.
function findAspects(positions) {
  const found = [];
  const hour = 1 / 24;
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      const [a, b] = [BODIES[i], BODIES[j]];
      if (SLOW.includes(a) && SLOW.includes(b)) continue;
      // The Sun-Moon aspects are the lunar phase, which is judged on its own.
      if (a === 'Sun' && b === 'Moon') continue;
      const separation = Math.abs(angleDiff(positions[a].lon, positions[b].lon));
      const aspect = ASPECTS.find((x) => Math.abs(separation - x.angle) <= x.orb);
      if (!aspect) continue;
      // A conjunction with the Sun is combustion, which is judged on its own.
      if (a === 'Sun' && aspect.angle === 0 && COMBUSTIBLE.includes(b)) continue;
      const orb = Math.abs(separation - aspect.angle);
      const later = Math.abs(angleDiff(positions[a].lon + positions[a].speed * hour, positions[b].lon + positions[b].speed * hour));
      const applying = Math.abs(later - aspect.angle) < orb;
      const delta = aspectDelta(aspect, a, b);
      found.push({ a, b, name: aspect.name, delta: applying ? delta : Math.trunc(delta / 2), orb, applying });
    }
  }
  return found;
}

function aspectOmens(aspects) {
  return aspects.map(({ a, b, name, delta, orb, applying }) => ({ code: 'OMEN020', severity: severityOf(delta), delta,
    title: `${a} ${name} ${b}`,
    message: `${a} ${name} ${b} (orb ${orb.toFixed(1)}°, ${applying ? 'applying' : 'separating'}): ${DOMAINS[a]} ${aspectVerb(delta)} ${DOMAINS[b]}.` }));
}

function combustionOmens(positions) {
  const omens = [];
  for (const body of COMBUSTIBLE) {
    const apart = Math.abs(angleDiff(positions[body].lon, positions.Sun.lon));
    if (apart <= CAZIMI_ORB) {
      omens.push({ code: 'OMEN022', severity: 'notice', delta: 6, title: `${body} is cazimi`,
        message: `${body} (${DOMAINS[body]}) is in the heart of the Sun, within 17 minutes of arc: for these few hours it has the Sun's whole strength.` });
    } else if (apart <= COMBUST_ORB) {
      omens.push({ code: 'OMEN021', severity: 'warning', delta: -3, title: `${body} is combust`,
        message: `${body} is ${apart.toFixed(1)}° from the Sun and burnt up in its rays: ${DOMAINS[body]} cannot be seen, and what cannot be seen cannot be monitored.` });
    }
  }
  return omens;
}

function dignityOf(body, sign) {
  const table = DIGNITIES[body];
  return table ? Object.keys(DIGNITY).find((kind) => table[kind].includes(sign)) || null : null;
}

function dignityOmens(positions) {
  const omens = [];
  for (const body of Object.keys(DIGNITIES)) {
    const kind = dignityOf(body, positions[body].sign);
    if (!kind) continue;
    const [delta, place, effect] = DIGNITY[kind];
    const name = body === 'Sun' || body === 'Moon' ? `The ${body}` : body;
    omens.push({ code: 'OMEN050', severity: severityOf(delta), delta, title: `${body} in ${kind}`,
      message: `${name} (${DOMAINS[body]}) is in ${positions[body].sign}, ${place}: ${effect}.` });
  }
  return omens;
}

function moonOmen(elongation) {
  const phases = [
    ['New Moon', -6, 'The Moon is dark and hidden in the Sun\'s rays. Nothing is begun under a dark Moon; wait for the first crescent.'],
    ['Waxing Crescent', 7, 'The first light after the dark is the best time to begin something.'],
    ['First Quarter', 4, 'Growing light favours shipping features.'],
    ['Waxing Gibbous', 4, 'Growing light favours shipping features.'],
    ['Full Moon', -10, 'Incident rates are elevated and on-call engineers grow restless.'],
    ['Waning Gibbous', 0, 'Fading light favours deleting code, not adding it.'],
    ['Last Quarter', 0, 'Fading light favours deleting code, not adding it.'],
    ['Waning Crescent', 0, 'Fading light favours deleting code, not adding it.'],
  ];
  const [phase, delta, message] = phases[Math.floor(((elongation + 22.5) % 360) / 45)];
  return { phase, omen: { code: 'OMEN010', severity: severityOf(delta), delta, title: phase, message: `${phase}. ${message}` } };
}

function localDay(time, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', day: 'numeric' })
    .formatToParts(new Date(time));
  const get = (type) => parts.find((p) => p.type === type).value;
  return { weekday: get('weekday'), dayOfMonth: Number(get('day')) };
}

function dayOmens(time, timezone, positions) {
  const { weekday, dayOfMonth } = localDay(time, timezone);
  let [ruler, delta, message] = DAYS[weekday];
  if (positions[ruler].retrograde || positions[ruler].stationary) {
    delta = -5;
    message = `${ruler} rules today and ${ruler} is ${positions[ruler].stationary ? 'stationary' : 'retrograde'}: the day works against you.`;
  }
  const omens = [{ code: 'OMEN030', severity: severityOf(delta, -Infinity), delta,
    title: `${weekday}, day of ${ruler === 'Sun' || ruler === 'Moon' ? `the ${ruler}` : ruler}`,
    message: `${weekday} is ruled by ${ruler === 'Sun' || ruler === 'Moon' ? `the ${ruler}` : ruler}. ${message}` }];
  if (CUSTOMS[weekday]) {
    const [code, customDelta, title, customMessage] = CUSTOMS[weekday];
    omens.push({ code, severity: severityOf(customDelta), delta: customDelta, title, message: customMessage });
  }
  if (weekday === 'Friday' && dayOfMonth === 13) {
    omens.push({ code: 'OMEN013', severity: 'error', delta: -13, title: 'Friday the 13th',
      message: 'It is Friday the 13th. No further astronomical justification is required.' });
  }
  return omens;
}

function cardOmens(cards) {
  return cards.map((card) => {
    const label = `${card.name}${card.reversed ? ' (reversed)' : ''}`;
    return { code: `OMEN1${String(card.number).padStart(2, '0')}`, severity: severityOf(card.delta), delta: card.delta,
      title: `${card.position}: ${label}`, message: `${label} in the position of ${card.position}. ${card.reading}` };
  });
}

function voidOmens(voidOfCourse) {
  if (!voidOfCourse) return [];
  const until = new Date(voidOfCourse.until).toISOString().slice(0, 16).replace('T', ' ');
  return [{ code: 'OMEN011', severity: 'error', delta: -12, title: 'The Moon is void of course',
    message: `The Moon makes no further aspect before it enters ${voidOfCourse.enters} around ${until} UTC. `
      + 'Nothing begun under a void Moon comes to anything: the deploy will succeed and change nothing, or be rolled back.' }];
}

function transitOmens(positions, natal) {
  const omens = [];
  const points = { ...natal.positions, Ascendant: natal.ascendant };
  for (const transiting of TRANSITING) {
    const reach = SLOW.includes(transiting) ? SLOW_TRANSIT_ORB : TRANSIT_ORB;
    for (const point of Object.keys(NATAL_POINTS)) {
      if (transiting === point || !points[point]) continue;
      const separation = Math.abs(angleDiff(positions[transiting].lon, points[point].lon));
      const aspect = ASPECTS.find((x) => Math.abs(separation - x.angle) <= reach);
      if (!aspect) continue;
      const delta = aspectDelta(aspect, transiting, transiting);
      const orb = Math.abs(separation - aspect.angle).toFixed(1);
      const what = point === 'Ascendant' ? 'ascendant' : `natal ${point}`;
      omens.push({ code: 'OMEN040', severity: severityOf(delta), delta,
        title: `Transit: ${transiting} ${aspect.name} ${what}`,
        message: `Transiting ${transiting} ${aspect.name} the repository's ${what} in ${points[point].sign} `
          + `(orb ${orb}°): ${DOMAINS[transiting]} ${aspectVerb(delta)} ${NATAL_POINTS[point]}.` });
    }
  }
  return omens;
}

// Houses need an ascendant, and so a birthplace. Benefics passing through the
// houses of work and of standing help; Mars and Saturn there do not.
function houseOmens(positions, natal) {
  if (!natal.ascendant) return [];
  const omens = [];
  const rising = SIGNS.indexOf(natal.ascendant.sign);
  for (const body of ['Venus', 'Jupiter', 'Mars', 'Saturn']) {
    const house = ((SIGNS.indexOf(positions[body].sign) - rising + 12) % 12) + 1;
    if (!HOUSES[house]) continue;
    const delta = BENEFICS.includes(body) ? 3 : -3;
    omens.push({ code: 'OMEN045', severity: severityOf(delta), delta, title: `${body} in the ${house === 6 ? 'sixth' : 'tenth'} house`,
      message: `${body} passes through ${HOUSES[house]} (${positions[body].sign}, counted from the ascendant in ${natal.ascendant.sign}). `
        + (delta > 0 ? 'It is well looked after.' : 'Expect it to be tested.') });
  }
  return omens;
}

function returnOmens(positions, natal) {
  const omens = [];
  const apart = (body) => Math.abs(angleDiff(positions[body].lon, natal.positions[body].lon));
  if (natal.age > 0.5 && apart('Sun') < 1) {
    omens.push({ code: 'OMEN041', severity: 'notice', delta: 10, title: 'Solar return',
      message: `The Sun returns to its natal place in ${natal.sunSign}: the repository turns ${Math.round(natal.age)}. `
        + 'A favourable day for a major version.' });
  }
  if (natal.age > 14 / 365 && apart('Moon') < 6) {
    omens.push({ code: 'OMEN042', severity: 'notice', delta: 4, title: 'Lunar return',
      message: `The Moon returns to its natal place in ${natal.positions.Moon.sign}. Monthly renewal: a good day to rotate secrets.` });
  }
  if (natal.age > 3 && apart('Jupiter') <= TRANSIT_ORB) {
    omens.push({ code: 'OMEN044', severity: 'notice', delta: 8, title: 'Jupiter return',
      message: `Jupiter returns to its natal place in ${natal.positions.Jupiter.sign}, as it does every twelve years. `
        + 'A year of growth begins: a good time to raise the limits.' });
  }
  const saturn = Math.abs(angleDiff(positions.Saturn.lon, natal.positions.Saturn.lon));
  const phase = [[0, 'returns to', -15], [90, 'squares', -8], [180, 'opposes', -8]]
    .find(([angle]) => Math.abs(saturn - angle) <= TRANSIT_ORB);
  if (natal.age > 3 && phase) {
    const [angle, verb, delta] = phase;
    omens.push({ code: 'OMEN043', severity: severityOf(delta), delta, title: angle === 0 ? 'Saturn return' : 'Saturn cycle',
      message: `Saturn ${verb} its natal place, ${Math.round(natal.age)} years in. `
        + (angle === 0 ? 'Everything built so far is called to account: it is time for the rewrite.'
          : 'The architecture is audited and found to have been a product of its time.') });
  }
  return omens;
}

// How much the present and the future hexagram weigh, by the number of
// changing lines, after Zhu Xi: few changes and the present governs, three and
// the two are read together, more and the future governs.
const CHANGING = {
  1: [1, 0.25, 'the present hexagram governs'],
  2: [1, 0.25, 'the present hexagram governs'],
  3: [0.75, 0.75, 'the two hexagrams are read together'],
  4: [0.25, 1, 'the future hexagram governs'],
  5: [0.25, 1, 'the future hexagram governs'],
  6: [0, 1, 'the present hexagram has turned over completely'],
};
const NUMERALS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

function hexagramOmens(casting) {
  const { primary, relating } = casting;
  const omens = [{ code: `OMEN3${String(primary.number).padStart(2, '0')}`, severity: severityOf(primary.delta), delta: primary.delta,
    title: `Hexagram ${primary.number}: ${primary.name}`,
    message: `Hexagram ${primary.number}, ${primary.name}. ${primary.reading}` }];
  if (relating) {
    const count = casting.changing.filter(Boolean).length;
    const [present, future, rule] = CHANGING[count];
    omens[0].delta = Math.trunc(primary.delta * present);
    omens[0].severity = severityOf(omens[0].delta);
    const delta = Math.trunc(relating.delta * future);
    omens.push({ code: `OMEN3${String(relating.number).padStart(2, '0')}`, severity: severityOf(delta), delta,
      title: `Changing to hexagram ${relating.number}: ${relating.name}`,
      message: `${count === 1 ? 'One line changes' : `${NUMERALS[count]} lines change`} towards hexagram ${relating.number}, ${relating.name}: ${rule}. ${relating.reading}` });
  }
  return omens;
}

function releaseOmens(release) {
  if (!release) return [];
  const omens = [{ code: `OMEN6${String(release.number).padStart(2, '0')}`, severity: severityOf(release.delta), delta: release.delta,
    title: `Release number ${release.number}`,
    message: `The digits of ${release.version} sum to ${release.sum}${release.sum === release.number ? '' : `, which reduces to ${release.number}`}. ${release.reading}` }];
  if (release.thirteen) {
    omens.push({ code: 'OMEN613', severity: 'warning', delta: -8, title: 'Version contains 13',
      message: `${release.version} carries a 13. Buildings skip the thirteenth floor; consider skipping this version.` });
  }
  if (release.karmic) {
    omens.push({ code: 'OMEN640', severity: 'warning', delta: -6, title: `Karmic debt ${release.karmic.number}`,
      message: `On their way to ${release.number} the digits of ${release.version} pass through ${release.karmic.number}, a karmic debt number. ${release.karmic.reading}` });
  }
  return omens;
}

function conclude(score, failBelow) {
  if (score >= Math.max(AUSPICIOUS_FROM, failBelow)) return 'auspicious';
  return score >= failBelow ? 'tolerable' : 'ill-omened';
}

// The whole divination. Pure: the same question always gets the same answer.
// `born` (repository creation time), `birthplace` ({ latitude, longitude }) and
// `version` (release tag) are optional.
function divine({ time, seed, timezone = 'UTC', failBelow = 25, born, birthplace, version }) {
  const positions = sky(time);
  const cards = tarot.draw(seed);
  const hexagram = iching.cast(seed);
  const moon = moonOmen(moonElongation(time));
  const voidOfCourse = moonVoidOfCourse(time);
  const natal = born === undefined ? null : chart(born, time, birthplace);
  const release = numerology.read(version);
  const aspects = findAspects(positions);
  const omens = [
    ...retrogradeOmens(positions, time),
    ...dayOmens(time, timezone, positions),
    moon.omen,
    ...voidOmens(voidOfCourse),
    ...dignityOmens(positions),
    ...combustionOmens(positions),
    ...aspectOmens(aspects),
    ...(natal ? [...returnOmens(positions, natal), ...transitOmens(positions, natal), ...houseOmens(positions, natal)] : []),
    ...cardOmens(cards),
    ...hexagramOmens(hexagram),
    ...releaseOmens(release),
  ];
  const raw = omens.reduce((sum, omen) => sum + omen.delta, BASE_SCORE);
  const score = Math.max(0, Math.min(100, raw));
  return { time, seed, timezone, failBelow, born, birthplace, version, positions, aspects, moonPhase: moon.phase, voidOfCourse,
    natal, cards, hexagram, release, omens, score, verdict: conclude(score, failBelow) };
}

// The first hour within the horizon at which the same question is no longer
// ill-omened, or null. The cards and hexagram stay fixed; only the sky moves.
function nextWindow(question, horizonHours = 14 * 24) {
  for (let hour = 1; hour <= horizonHours; hour++) {
    const reading = divine({ ...question, time: question.time + hour * 3600000 });
    if (reading.verdict !== 'ill-omened') return { time: reading.time, score: reading.score, verdict: reading.verdict };
  }
  return null;
}

module.exports = { divine, nextWindow, BASE_SCORE, AUSPICIOUS_FROM, DOMAINS };
