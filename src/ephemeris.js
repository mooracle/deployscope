'use strict';

// Low-precision ephemeris. The astronomy here is real, only the conclusions
// drawn from it are not.
//
// Planets: Keplerian elements and rates from JPL's "Approximate Positions of
// the Planets" (Standish), valid 1800-2050, good to a few arcminutes.
// Moon: truncated series from the Astronomical Almanac, good to ~0.3 degrees.

const DEG = Math.PI / 180;
const DAY_MS = 86400000;
const J2000 = Date.UTC(2000, 0, 1, 12);
// General precession in longitude, degrees per Julian century. The elements are
// referred to the J2000 equinox, the tropical zodiac to the equinox of date.
const PRECESSION = 1.39697;

// [a (AU), e, I (deg), L (deg), longitude of perihelion (deg), longitude of ascending node (deg)]
// followed by the same six as rates per Julian century.
const ELEMENTS = {
  Mercury: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593,
    0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  Venus: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255,
    0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  Earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0,
    0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  Mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
    0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  Jupiter: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
    -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  Saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448,
    -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  Uranus: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503,
    -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  Neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574,
    0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
};

const BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// Below this many degrees per day Mercury is considered to be standing still.
const MERCURY_STATION_SPEED = 0.2;

function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

// Signed difference a - b folded into [-180, 180).
function angleDiff(a, b) {
  return norm360(a - b + 180) - 180;
}

function centuries(time) {
  return (time - J2000) / DAY_MS / 36525;
}

// Heliocentric ecliptic rectangular coordinates (J2000), in AU.
function heliocentric(name, T) {
  const el = ELEMENTS[name];
  const [a, e, I, L, peri, node] = [0, 1, 2, 3, 4, 5].map((i) => el[i] + el[i + 6] * T);
  const M = angleDiff(L - peri, 0) * DEG;
  let E = M;
  for (let i = 0; i < 10; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * DEG;
  const O = node * DEG;
  const i = I * DEG;
  const [cw, sw, cO, sO, ci, si] = [Math.cos(w), Math.sin(w), Math.cos(O), Math.sin(O), Math.cos(i), Math.sin(i)];
  return [
    (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
}

function moonLongitude(T) {
  const s = (deg) => Math.sin(deg * DEG);
  return norm360(
    218.32 + 481267.881 * T
    + 6.29 * s(135.0 + 477198.87 * T)
    - 1.27 * s(259.3 - 413335.36 * T)
    + 0.66 * s(235.7 + 890534.22 * T)
    + 0.21 * s(269.9 + 954397.74 * T)
    - 0.19 * s(357.5 + 35999.05 * T)
    - 0.11 * s(186.5 + 966404.03 * T),
  );
}

// Geocentric ecliptic longitude in degrees, [0, 360).
function longitude(body, time) {
  const T = centuries(time);
  if (body === 'Moon') return moonLongitude(T);
  const earth = heliocentric('Earth', T);
  const p = body === 'Sun' ? [0, 0, 0] : heliocentric(body, T);
  return norm360(Math.atan2(p[1] - earth[1], p[0] - earth[0]) / DEG + PRECESSION * T);
}

// Apparent motion in degrees per day; negative means retrograde.
function speed(body, time) {
  return angleDiff(longitude(body, time + DAY_MS / 2), longitude(body, time - DAY_MS / 2));
}

function signOf(lon) {
  return SIGNS[Math.floor(norm360(lon) / 30)];
}

function sky(time) {
  const result = {};
  for (const body of BODIES) {
    const lon = longitude(body, time);
    const v = speed(body, time);
    result[body] = {
      lon,
      speed: v,
      sign: signOf(lon),
      retrograde: v < 0,
      stationary: body === 'Mercury' && Math.abs(v) < MERCURY_STATION_SPEED,
    };
  }
  return result;
}

// Sun-Moon elongation in degrees: 0 new, 90 first quarter, 180 full, 270 last quarter.
function moonElongation(time) {
  return norm360(longitude('Moon', time) - longitude('Sun', time));
}

const VOID_STEP_MS = 30 * 60000;

// The Moon is void of course when it will perfect no major aspect (0, 60, 90,
// 120, 180 degrees) to any other body before it leaves its current sign.
// Returns null, or when the void ends (to the half hour) and the sign entered.
function moonVoidOfCourse(time) {
  const others = BODIES.filter((body) => body !== 'Moon');
  const separations = (t) => {
    const moon = longitude('Moon', t);
    return others.map((body) => angleDiff(moon, longitude(body, t)));
  };
  const sign = signOf(longitude('Moon', time));
  let prev = separations(time);
  for (let t = time + VOID_STEP_MS; ; t += VOID_STEP_MS) {
    const entered = signOf(longitude('Moon', t));
    if (entered !== sign) return { until: t, enters: entered };
    const cur = separations(t);
    const perfects = cur.some((s, i) => {
      const p = prev[i];
      // Conjunction and opposition are where the signed separation flips.
      if (p * s < 0 && (Math.abs(p) < 5 || Math.abs(p) > 175)) return true;
      return [60, 90, 120].some((angle) => (Math.abs(p) - angle) * (Math.abs(s) - angle) < 0);
    });
    if (perfects) return null;
    prev = cur;
  }
}

module.exports = {
  BODIES, SIGNS, norm360, angleDiff, longitude, speed, signOf, sky, moonElongation, moonVoidOfCourse,
};
