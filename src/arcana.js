'use strict';

// The pictures on the cards: 22 neon line drawings, one per major arcanum,
// each composed on its own after the Rider-Waite-Smith deck and moved to a
// city of towers, drones and server racks. A scene is drawn in a box from
// (-70, -92) to (70, 92) and is given its glow by the card (see svg.js).
// `CARDS[n].colors` are that card's two tube colours; the first also lights its frame.

const CYAN = '#22e6ff';
const PINK = '#ff3df2';
const YELLOW = '#ffe45c';
const GREEN = '#5dff9b';
const RED = '#ff4d6d';
const VIOLET = '#a97bff';
const ORANGE = '#ff9a3d';
const WHITE = '#f4f7ff';
const BACK = '#0b0a1a';

const DEG = Math.PI / 180;
const n = (x) => Number(x.toFixed(1));

// A lit tube.
const tube = (d, color, width = 2, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
// A tube around something solid, which hides what is behind it.
const solid = (d, color, width = 2, extra = '') =>
  `<path d="${d}" fill="${BACK}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const ring = (x, y, r, color, width = 2, fill = 'none') =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}" stroke="${color}" stroke-width="${width}"/>`;
const dot = (x, y, r, color) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}"/>`;
const dim = (body, opacity = 0.4) => `<g opacity="${opacity}">${body}</g>`;
const turn = (x, y, angle, body, scale = 1) => `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${body}</g>`;

function starPath(x, y, r, points, inner = 0.4) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? r * inner : r;
    const a = (-90 + (i * 180) / points) * DEG;
    d += `${i ? 'L' : 'M'}${n(x + radius * Math.cos(a))} ${n(y + radius * Math.sin(a))}`;
  }
  return `${d}Z`;
}

function rays(x, y, from, to, count, start = 0) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = (start + (i * 360) / count) * DEG;
    d += `M${n(x + from * Math.cos(a))} ${n(y + from * Math.sin(a))}L${n(x + to * Math.cos(a))} ${n(y + to * Math.sin(a))}`;
  }
  return d;
}

// A floor of light running to a horizon at `y`.
function grid(y, color, bottom = 92) {
  let d = '';
  for (let i = 0, step = 3, at = y; at < bottom; i++, step *= 1.5, at += step) d += `M-70 ${n(at)}H70`;
  for (let x = -210; x <= 210; x += 35) d += `M0 ${y}L${x} ${bottom}`;
  return dim(tube(d, color, 1), 0.45);
}

// A far skyline standing on `y`: [x, width, height] per tower.
function skyline(y, color, towers) {
  return dim(towers.map(([x, w, h]) => solid(`M${x} ${y}V${y - h}H${x + w}V${y}`, color, 1.2)
    + dot(x + w / 2, y - h + 5, 0.9, color)).join(''), 0.5);
}

function rain(color, seed, count = 16) {
  let state = seed;
  const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
  let d = '';
  for (let i = 0; i < count; i++) {
    const x = n(-68 + next() * 136);
    const y = n(-90 + next() * 150);
    d += `M${x} ${y}l-2 9`;
  }
  return dim(tube(d, color, 1), 0.5);
}

const head = (x, y, color, r = 6) => ring(x, y, r, color, 2, BACK);
const lemniscate = (x, y, color) => tube(`M${x} ${y}c5 -8 16 -8 16 0c0 8 -11 8 -16 0c-5 -8 -16 -8 -16 0c0 8 11 8 16 0`, color);

const CARDS = [
  { /* 0 The Fool: one step from the roof edge, a drone at the heel */
    colors: [CYAN, PINK],
    scene: () => ring(34, -52, 22, YELLOW) + tube('M14 -52H54M17 -44H51M22 -36H46', YELLOW, 1.5)
      + skyline(92, PINK, [[14, 12, 40], [30, 16, 62], [50, 14, 34]])
      + solid('M-70 92V38H6V92', CYAN) + tube('M-62 46H-2M-62 54H-20', CYAN, 1)
      + solid('M-22 -22L-10 -22L-6 8H-26Z', CYAN) + head(-16, -32, CYAN)
      + tube('M-22 8L-26 38M-10 8L6 30', CYAN) + tube('M-10 -16L8 -24', CYAN)
      + tube('M-20 -18L-44 -40', PINK) + solid('M-52 -50H-40V-38H-52Z', PINK)
      + tube('M16 14H40M20 14V10M36 14V10M14 10H26M30 10H42', PINK) + dot(28, 16, 2, PINK)
      + dim(tube('M12 44V84M12 84L8 78M12 84L16 78', YELLOW, 1.5), 0.8),
  },
  { /* 1 The Magician: one hand to the sky, the four tools afloat as holograms */
    colors: [PINK, CYAN],
    scene: () => lemniscate(0, -72, YELLOW)
      + tube('M-9 -40L-26 -70M-26 -80V-62', PINK) + dot(-26, -84, 2.5, YELLOW)
      + solid('M-10 -44H10L14 6H-14Z', PINK) + head(0, -54, PINK) + tube('M9 -38L24 -14', PINK)
      + tube('M-10 6L-12 34M10 6L12 34', PINK)
      + solid('M-58 34H58V42H-58Z', CYAN) + tube('M-50 42V92M50 42V92', CYAN)
      + dim(tube('M-50 60H50M-50 76H50', CYAN, 1), 0.5)
      + tube('M-52 14L-46 20L-52 26M-42 26H-34', GREEN) + ring(-18, 20, 7, YELLOW) + tube(starPath(-18, 20, 5, 5, 0.45), YELLOW, 1)
      + tube('M22 28V8M17 13H27', WHITE) + tube('M40 12H54V24H40ZM44 8V12M50 8V12M44 24V28M50 24V28', CYAN, 1.5)
      + dim(tube('M-48 30V34M-18 29V34M22 30V34M47 30V34', WHITE, 1), 0.6),
  },
  { /* 2 The High Priestess: between two racks, one dark and one lit */
    colors: [VIOLET, CYAN],
    scene: () => solid('M-66 -78H-40V70H-66Z', VIOLET) + tube('M-60 -66H-46M-60 -54H-46M-60 -42H-46M-60 -30H-46M-60 -18H-46M-60 -6H-46M-60 6H-46M-60 18H-46M-60 30H-46M-60 42H-46M-60 54H-46', VIOLET, 1)
      + solid('M40 -78H66V70H40Z', CYAN) + tube('M46 -66H60M46 -54H60M46 -42H60M46 -30H60M46 -18H60M46 -6H60M46 6H60M46 18H60M46 30H60M46 42H60M46 54H60', CYAN, 1)
      + [-66, -42, -18, 6, 30, 54].map((y) => dot(57, y, 1.6, GREEN)).join('')
      + dim(tube('M-34 -70V40M-22 -70V40M-10 -70V40M2 -70V40M14 -70V40M26 -70V40', VIOLET, 1, ' stroke-dasharray="2 5"'), 0.6)
      + solid('M-12 -30H12L20 70H-20Z', CYAN) + head(0, -42, CYAN, 7)
      + tube('M-12 -52Q-12 -64 -2 -60M12 -52Q12 -64 2 -60', YELLOW) + dot(0, -58, 3, YELLOW)
      + solid('M-9 -8H9V6H-9Z', WHITE, 1.5) + tube('M-5 -3H5M-5 1H2', WHITE, 1)
      + tube('M-16 84A16 16 0 0 0 16 84A20 20 0 0 1 -16 84Z', YELLOW)
      + tube('M-70 70H70', VIOLET, 1.5),
  },
  { /* 3 The Empress: a garden grown under lamps */
    colors: [GREEN, PINK],
    scene: () => dim(tube('M-60 -86V-70M-30 -86V-76M0 -86V-70M30 -86V-76M60 -86V-70M-66 -70H-54M-36 -76H-24M-6 -70H6M24 -76H36M54 -70H66', PINK, 1.5), 0.8)
      + tube('M-52 62C-58 30 -40 22 -50 -6C-56 -22 -40 -32 -46 -44', GREEN) + tube('M-50 26Q-64 20 -62 8M-48 4Q-34 2 -34 -10M-50 -20Q-62 -24 -60 -36', GREEN)
      + tube('M52 62C58 30 40 22 50 -6C56 -22 40 -32 46 -44', GREEN) + tube('M50 26Q64 20 62 8M48 4Q34 2 34 -10M50 -20Q62 -24 60 -36', GREEN)
      + [[-46, -48], [46, -48], [-62, 6], [62, 6]].map(([x, y]) => tube(starPath(x, y, 5, 6, 0.5), PINK, 1.5)).join('')
      + solid('M-26 -6H26V62H-26Z', PINK) + tube('M-26 -6Q0 -24 26 -6', PINK)
      + solid('M-10 -24H10L20 62H-20Z', WHITE) + head(0, -35, WHITE, 7)
      + [-14, -7, 0, 7, 14].map((x) => dot(x, -50 + (x * x) / 40, 1.8, YELLOW)).join('')
      + tube('M9 -18L24 -36', WHITE) + ring(26, -40, 4, YELLOW)
      + tube('M0 14C-10 4 -14 18 0 28C14 18 10 4 0 14Z', PINK)
      + tube('M-70 62H70', GREEN) + tube('M-40 62V76M-32 62V82M32 62V82M40 62V76M-36 70H-24M24 70H36', GREEN, 1),
  },
  { /* 4 The Emperor: enthroned on the mainframe */
    colors: [RED, YELLOW],
    scene: () => skyline(60, RED, [[-68, 16, 70], [-48, 12, 96], [38, 12, 104], [54, 14, 76]])
      + solid('M-30 -62H30V60H-30Z', RED, 2.5) + tube('M-30 -62L-40 -74H-24L-18 -62M30 -62L40 -74H24L18 -62', RED)
      + tube('M-24 -48H24M-24 -40H24', RED, 1) + [-18, -9, 0, 9, 18].map((x) => dot(x, -54, 1.3, YELLOW)).join('')
      + solid('M-12 -18H12L18 40H-18Z', YELLOW) + head(0, -29, YELLOW, 7)
      + tube('M-9 -37V-46L-4 -41L0 -48L4 -41L9 -46V-37', YELLOW) + tube('M-5 -22L0 -10L5 -22', YELLOW, 1.5)
      + tube('M-11 -12L-24 4M-26 -28V30', YELLOW) + ring(-26, -33, 4.5, YELLOW)
      + tube('M11 -12L24 6', YELLOW) + ring(26, 11, 5.5, RED) + tube('M20.5 11H31.5M26 5.5V16.5', RED, 1)
      + solid('M-42 40H42V60H-42Z', RED) + tube('M-18 40L-22 60M18 40L22 60', RED, 1)
      + tube('M-70 60H70', RED) + grid(60, RED),
  },
  { /* 5 The Hierophant: the keeper of the keys, two terminals at his feet */
    colors: [ORANGE, CYAN],
    scene: () => tube('M-56 -80V40M-44 -80V40M-62 -80H-38M-62 40H-38M44 -80V40M56 -80V40M38 -80H62M38 40H62', ORANGE, 1.5)
      + solid('M-13 -34H13L20 40H-20Z', ORANGE) + tube('M0 -34V40M-8 -10H8', ORANGE, 1)
      + head(0, -46, ORANGE, 7) + tube('M-9 -56H9M-7 -63H7M-5 -70H5M0 -56V-78', YELLOW)
      + tube('M12 -26L26 -46', ORANGE) + tube('M26 -46V-56M22 -52V-58M30 -50V-56', ORANGE, 1.5)
      + tube('M-12 -26L-28 -14', ORANGE) + tube('M-30 -70V30M-38 -58H-22M-40 -48H-20M-42 -38H-18', YELLOW)
      + solid('M-50 52H-14V78H-50Z', CYAN) + tube('M-44 60L-38 65L-44 70M-34 70H-24', CYAN, 1.5)
      + solid('M14 52H50V78H14Z', CYAN) + tube('M20 60H44M20 66H38M20 72H42', CYAN, 1)
      + ring(-6, 86, 4, YELLOW) + ring(6, 86, 4, YELLOW) + tube('M-3 83L10 66M3 83L-10 66M10 66l-4 -1M-10 66l4 -1', YELLOW, 1.5),
  },
  { /* 6 The Lovers: two under a satellite, joined by one cable */
    colors: [PINK, CYAN],
    scene: () => ring(0, -62, 9, YELLOW) + tube(rays(0, -62, 13, 19, 8, 22.5), YELLOW, 1.5)
      + solid('M-50 -70H-16V-54H-50Z', VIOLET, 1.5) + solid('M16 -70H50V-54H16Z', VIOLET, 1.5)
      + tube('M-42 -70V-54M-33 -70V-54M-24 -70V-54M24 -70V-54M33 -70V-54M42 -70V-54M-16 -62H-9M9 -62H16', VIOLET, 1)
      + dim(tube('M-14 -44Q0 -34 14 -44M-24 -36Q0 -20 24 -36M-34 -28Q0 -6 34 -28', YELLOW, 1.5), 0.7)
      + solid('M-42 4H-22L-18 46H-46Z', PINK) + head(-32, -7, PINK) + tube('M-40 46L-42 70M-24 46L-22 70', PINK)
      + solid('M22 4H42L46 46H18Z', CYAN) + head(32, -7, CYAN) + tube('M24 46L22 70M40 46L42 70', CYAN)
      + tube('M-22 12L-8 22', PINK) + tube('M22 12L8 22', CYAN)
      + tube('M0 30C-9 20 -14 34 0 44C14 34 9 20 0 30Z', WHITE)
      + tube('M-70 70H70', PINK) + grid(70, PINK)
      + tube('M-62 70V34M-62 40L-68 30M-62 46L-56 36', GREEN, 1.5) + dot(-67, 28, 2, RED) + dot(-55, 34, 2, RED)
      + tube('M62 70V34', ORANGE, 1.5) + tube('M62 34Q56 24 62 14Q68 24 62 34Z', ORANGE, 1.5),
  },
  { /* 7 The Chariot: a hover-bike at full throttle */
    colors: [CYAN, YELLOW],
    scene: () => dim(tube('M-70 -60H-30M-70 -44H-44M-70 -28H-20M-70 -12H-50M-70 4H-36M-70 20H-48', CYAN, 1.2), 0.6)
      + [[-10, -74], [14, -80], [38, -70], [56, -84]].map(([x, y]) => tube(starPath(x, y, 4, 4, 0.35), YELLOW, 1)).join('')
      + solid('M4 -36H22L26 -4H0Z', YELLOW) + head(13, -46, YELLOW) + tube('M6 -52L20 -54L22 -46', YELLOW, 1.5)
      + tube('M22 -28L42 -18', YELLOW)
      + solid('M-46 6L-30 -8H30L58 6L50 26H-40Z', CYAN, 2.5) + tube('M-30 -8L-22 6H40L30 -8M40 6L50 26', CYAN, 1.5)
      + tube('M36 -8L48 -22H54', CYAN) + tube(starPath(-4, 12, 7, 8, 0.4), YELLOW, 1.5)
      + ring(-26, 40, 13, PINK, 2.5) + ring(-26, 40, 5, PINK, 1.5) + ring(34, 40, 13, PINK, 2.5) + ring(34, 40, 5, PINK, 1.5)
      + dim(tube('M-64 34H-44M-68 44H-46M-60 54H-38', PINK, 1.5), 0.8)
      + tube('M-70 62H70', CYAN) + grid(62, CYAN)
      + solid('M-64 62L-56 44L-48 62Z', WHITE, 1.5) + solid('M52 62L60 44L68 62Z', VIOLET, 1.5),
  },
  { /* 8 Strength: a bare hand on the jaw of the machine */
    colors: [ORANGE, PINK],
    scene: () => lemniscate(-30, -64, YELLOW)
      + solid('M-40 -28H-20L-14 52H-46Z', PINK) + head(-30, -39, PINK, 7) + tube('M-38 52L-40 74M-22 52L-20 74', PINK)
      + tube('M-21 -18L2 -8M-21 -10L0 6', PINK)
      + solid('M0 -22L14 -40L24 -26L40 -44L46 -22L62 -18L52 -2L60 16L42 14L34 30L20 18L4 22L8 4Z', ORANGE, 2.5)
      + solid('M14 -12L34 -16L44 -2L36 12L18 10L10 0Z', ORANGE, 1.5)
      + tube('M20 -6L26 -4M36 -8L32 -3', YELLOW, 2.5) + tube('M22 5H34M24 5V9M28 5V9M32 5V9', ORANGE, 1.2)
      + solid('M22 30L60 26L64 56H26Z', ORANGE) + tube('M30 56V74M56 56V74M34 36H54M34 44H54', ORANGE, 1.5)
      + tube('M64 34Q72 20 62 12', ORANGE)
      + tube('M-70 74H70', ORANGE) + grid(74, ORANGE),
  },
  { /* 9 The Hermit: a lamp in the rain, at the top of the stack */
    colors: [YELLOW, VIOLET],
    scene: () => rain(VIOLET, 9) + skyline(92, VIOLET, [[-70, 14, 34], [-52, 10, 50], [44, 12, 44], [58, 12, 30]])
      + tube('M-22 -58V70', YELLOW)
      + solid('M-10 -40Q4 -66 16 -40L26 70H-18Z', VIOLET, 2.5) + solid('M-4 -38Q4 -52 11 -38Q9 -26 4 -26Q-2 -26 -4 -38Z', VIOLET, 1.5)
      + tube('M0 -24Q4 -6 8 -24', VIOLET, 1.5) + tube('M14 -22L34 -34', VIOLET, 2.5)
      + tube('M36 -52V-46', YELLOW, 1.5) + solid('M28 -46H44L41 -20H31Z', YELLOW)
      + tube(starPath(36, -33, 7, 6, 0.5), YELLOW, 1.5) + dim(ring(36, -33, 18, YELLOW, 1) + ring(36, -33, 28, YELLOW, 1), 0.45)
      + solid('M-70 92V78L-34 70H40L70 80V92', VIOLET) + tube('M-50 82H-20M10 80H44', VIOLET, 1),
  },
  { /* 10 Wheel of Fortune: the spinner that never resolves */
    colors: [PINK, YELLOW],
    scene: () => ring(0, -4, 50, PINK, 3) + ring(0, -4, 38, YELLOW, 1.5) + ring(0, -4, 22, PINK, 1.5)
      + tube(rays(0, -4, 8, 38, 8), YELLOW, 1.5) + ring(0, -4, 8, YELLOW, 2, BACK) + dot(0, -4, 2.5, YELLOW)
      + tube(`M${n(50 * Math.cos(-150 * DEG))} ${n(-4 + 50 * Math.sin(-150 * DEG))}A50 50 0 0 1 ${n(50 * Math.cos(-60 * DEG))} ${n(-4 + 50 * Math.sin(-60 * DEG))}`, WHITE, 5)
      + [[0, -34, 'T'], [30, -4, 'A'], [0, 26, 'R'], [-30, -4, 'O']].map(([x, y, letter]) =>
        `<text x="${x}" y="${y + 4}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="11" fill="${YELLOW}" text-anchor="middle">${letter}</text>`).join('')
      + solid('M-9 -58L0 -76L9 -58Z', CYAN) + head(0, -80, CYAN, 4.5)
      + tube('M-60 -34Q-52 -24 -60 -14Q-68 -4 -60 6Q-54 14 -60 24', GREEN) + dot(-60, -38, 2.5, GREEN)
      + tube('M56 26Q68 8 60 -14Q58 -22 52 -22', RED) + tube('M52 -22L50 -30M52 -22L60 -26', RED, 1.5)
      + [[-56, -78], [56, -78], [-56, 74], [56, 74]].map(([x, y]) => tube(`M${x - 8} ${y}H${x + 8}M${x} ${y - 8}V${y + 8}`, CYAN, 1.2) + ring(x, y, 4, CYAN, 1.2)).join('')
      + dim(tube('M-30 62H30M-20 70H20', PINK, 1.5), 0.7),
  },
  { /* 11 Justice: the blade and the balance */
    colors: [CYAN, RED],
    scene: () => tube('M-60 -84V70M-50 -84V70M-66 -84H-44M50 -84V70M60 -84V70M44 -84H66', CYAN, 1.2)
      + dim(tube('M-44 -70H44M-44 -62H44', RED, 1), 0.6)
      + solid('M-13 -22H13L22 70H-22Z', RED) + head(0, -34, RED, 7) + tube('M-8 -44H8V-50H-8Z', YELLOW, 1.5)
      + tube('M12 -14L28 -6', RED) + tube('M28 -78V16', WHITE, 2.5) + tube('M20 -10H36M28 -78L25 -70M28 -78L31 -70', WHITE)
      + tube('M-12 -14L-28 -22', RED) + tube('M-28 -22V-38M-46 -38H-10', YELLOW)
      + tube('M-46 -38L-53 -16H-39ZM-10 -38L-17 -16H-3Z', YELLOW, 1.5) + tube('M-55 -16Q-46 -8 -37 -16M-19 -16Q-10 -8 -1 -16', YELLOW, 1.5)
      + tube('M-70 70H70', CYAN) + grid(70, CYAN),
  },
  { /* 12 The Hanged Man: suspended from the crane, perfectly calm */
    colors: [CYAN, YELLOW],
    scene: () => tube('M-64 -80H40M40 -80L64 -64M-64 -80V-70M-40 -80V-70M-16 -80V-70M8 -80V-70M32 -80V-70M-64 -70H40M-64 -80L-40 -70L-16 -80L8 -70L32 -80', YELLOW, 1.5)
      + tube('M0 -70V-46', WHITE, 1.5) + tube('M-5 -46H5V-38H-5Z', WHITE, 1.5)
      + tube('M2 -38V-4', CYAN, 2.5) + tube('M-2 -38L-2 -22L-16 -12L-4 -2', CYAN, 2.5)
      + solid('M-11 -4H11L13 36H-13Z', CYAN) + tube('M-11 6L-22 20L-11 28M11 6L22 20L11 28', CYAN)
      + ring(0, 48, 16, YELLOW, 1.5) + dim(tube(rays(0, 48, 19, 25, 12), YELLOW, 1.2), 0.8) + head(0, 46, CYAN, 7)
      + skyline(92, CYAN, [[-70, 14, 20], [-52, 12, 30], [42, 12, 26], [58, 12, 16]])
      + rain(CYAN, 12, 10),
  },
  { /* 13 Death: process terminated, the sun still rises */
    colors: [WHITE, RED],
    scene: () => ring(0, 58, 20, ORANGE) + tube('M-18 50H18M-20 58H20', ORANGE, 1.2)
      + solid('M-70 92V58H70V92', RED, 1.5) + grid(58, RED)
      + solid('M-64 58V26H-58V32H-54V26H-48V58M48 58V26H54V32H58V26H64V58', RED, 1.5)
      + tube('M38 -84V40', WHITE, 2.5) + tube('M38 -80Q4 -84 -18 -58Q12 -70 38 -66', RED, 2.5)
      + solid('M-28 -22Q-28 -58 0 -58Q28 -58 28 -22Q28 -8 18 -2V14H-18V-2Q-28 -8 -28 -22Z', WHITE, 2.5)
      + solid('M-19 -30H-5V-16H-19Z', WHITE) + ring(12, -23, 7, RED, 2.5) + dot(12, -23, 2.5, RED)
      + tube('M-3 -8L0 -14L3 -8Z', WHITE, 1.5) + tube('M-12 2V14M-4 2V14M4 2V14M12 2V14M-18 2H18', WHITE, 1.5)
      + tube('M19 -23H40', RED, 1) + solid('M-27 22H27V36H-27Z', RED, 1.5)
      + `<text x="0" y="32.5" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="9" fill="${RED}" text-anchor="middle">KILL -9</text>`,
  },
  { /* 14 Temperance: pouring one stream into another without spilling a byte */
    colors: [CYAN, ORANGE],
    scene: () => solid('M-12 -40L-62 -70L-56 -48L-64 -36L-50 -32L-54 -18L-12 -24Z', ORANGE) + solid('M12 -40L62 -70L56 -48L64 -36L50 -32L54 -18L12 -24Z', ORANGE)
      + tube('M-48 -58L-22 -36M-50 -42L-22 -30M48 -58L22 -36M50 -42L22 -30', ORANGE, 1)
      + ring(0, -52, 14, YELLOW, 1.5)
      + solid('M-12 -40H12L20 60H-20Z', CYAN) + head(0, -52, CYAN, 7) + tube('M-6 -30H6L0 -20Z', YELLOW, 1.5)
      + tube('M-12 -30L-30 -14', CYAN) + tube('M12 -30L30 4', CYAN)
      + solid('M-42 -14H-22V2Q-32 8 -42 2Z', WHITE, 1.5) + tube('M-42 -14Q-32 -20 -22 -14Q-32 -8 -42 -14', WHITE, 1.5)
      + solid('M22 14H42V30Q32 36 22 30Z', WHITE, 1.5) + tube('M22 14Q32 8 42 14Q32 20 22 14', WHITE, 1.5)
      + tube('M-26 -2Q-4 -4 26 12', CYAN, 2, ' stroke-dasharray="1 5"') + tube('M-28 4Q-6 4 24 18', ORANGE, 2, ' stroke-dasharray="1 5"')
      + tube('M-70 60H70', CYAN) + grid(60, CYAN)
      + dim(tube('M-70 72Q-52 66 -36 72Q-20 78 -4 72', CYAN, 1.5), 0.8),
  },
  { /* 15 The Devil: the lock-in */
    colors: [RED, VIOLET],
    scene: () => tube(starPath(0, -70, 15, 5, 0.38), RED, 1.5, ' transform="rotate(180 0 -70)"')
      + solid('M-16 -34L-66 -52L-54 -34L-62 -18L-46 -22L-40 -6L-16 -16Z', VIOLET) + solid('M16 -34L66 -52L54 -34L62 -18L46 -22L40 -6L16 -16Z', VIOLET)
      + solid('M-20 -44L-28 -62L-12 -52H12L28 -62L20 -44L16 -22L0 -12L-16 -22Z', RED, 2.5)
      + tube('M-13 -40L-5 -36L-12 -33ZM13 -40L5 -36L12 -33Z', YELLOW, 1.5) + tube('M-6 -24H6M-3 -24V-20M3 -24V-20', RED, 1.5)
      + solid('M-14 -14H14L18 26H-18Z', RED) + tube('M-14 -6L-30 6M-30 -6V20', RED) + tube('M-30 -6Q-36 -14 -30 -22Q-24 -14 -30 -6Z', ORANGE, 1.5)
      + solid('M-26 26H26V48H-26Z', VIOLET) + solid('M-7 34H7V44H-7Z', YELLOW, 1.5) + tube('M-4 34V30Q0 24 4 30V34', YELLOW, 1.5)
      + tube('M-7 40Q-26 66 -40 40M7 40Q26 66 40 40', YELLOW, 1.5, ' stroke-dasharray="3 3"')
      + solid('M-48 44H-32L-28 80H-52Z', WHITE, 1.5) + head(-40, 35, WHITE, 5)
      + solid('M32 44H48L52 80H28Z', WHITE, 1.5) + head(40, 35, WHITE, 5)
      + tube('M-70 80H70', RED),
  },
  { /* 16 The Tower: the outage */
    colors: [YELLOW, RED],
    scene: () => skyline(92, VIOLET, [[-70, 14, 30], [-54, 12, 46], [48, 12, 40], [62, 8, 24]])
      + solid('M-18 92V-12H18V92', RED, 2.5) + solid('M-12 -18L-18 -46H14L20 -22Z', RED, 2.5, ' transform="rotate(-9 0 -30) translate(-5 -4)"')
      + tube('M-12 0H12M-12 12H12M-12 24H12M-12 36H12M-12 48H12M-12 60H12M-12 72H12', RED, 1)
      + [[-7, 6], [5, 18], [-6, 30], [6, 54], [-4, 66]].map(([x, y]) => dot(x, y, 1.8, YELLOW)).join('')
      + tube('M-18 -12L-6 -18L4 -10L18 -14', ORANGE)
      + tube('M-10 -14Q-16 -28 -8 -36Q-8 -28 -2 -32Q-2 -22 4 -26Q4 -18 8 -14', ORANGE)
      + solid('M66 -92L26 -52L40 -48L8 -16L22 -44L8 -46L48 -92Z', YELLOW, 2.5)
      + dim(tube('M-26 20H-40M-26 28H-34M26 40H44M26 48H36', RED, 1.5), 0.9)
      + turn(-44, 6, 150, solid('M-6 -14H6L8 14H-8Z', CYAN, 1.5) + head(0, -22, CYAN, 4.5) + tube('M-6 -10L-14 -22M6 -10L14 -22', CYAN, 1.5))
      + turn(46, -2, -155, solid('M-6 -14H6L8 14H-8Z', PINK, 1.5) + head(0, -22, PINK, 4.5) + tube('M-6 -10L-14 -22M6 -10L14 -22', PINK, 1.5))
      + [[-50, -50], [-34, -30], [38, 30], [54, 12], [-58, -16]].map(([x, y]) => tube(`M${x} ${y}l3 6l-3 3l-3 -3Z`, YELLOW, 1)).join(''),
  },
  { /* 17 The Star: the one light left on */
    colors: [CYAN, WHITE],
    scene: () => tube(starPath(0, -54, 26, 8, 0.36), YELLOW, 2.5) + ring(0, -54, 5, YELLOW, 1.5)
      + [[-48, -72], [-56, -34], [-32, -14], [48, -72], [56, -34], [32, -14], [0, -10]].map(([x, y]) => tube(starPath(x, y, 7, 8, 0.38), WHITE, 1.2)).join('')
      + tube('M-70 52H-6L6 40H70', CYAN) + dim(tube('M-64 62H-40M-30 62H-12M-58 72H-26M-50 82H-34', CYAN, 1.5), 0.8)
      + solid('M-4 2H14L24 40H-2L-12 28Z', WHITE) + head(6, -9, WHITE, 7) + tube('M0 -12Q-10 -2 -6 10', YELLOW)
      + tube('M0 12L-22 22', WHITE) + solid('M-34 18H-20L-23 32H-31Z', PINK, 1.5) + tube('M-27 34V50', CYAN, 2, ' stroke-dasharray="1 5"')
      + tube('M16 12L36 24', WHITE) + solid('M32 20H46L43 34H35Z', PINK, 1.5) + tube('M39 36V40', CYAN, 2, ' stroke-dasharray="1 5"')
      + dim(tube(starPath(-27, 66, 9, 8, 0.36), YELLOW, 1), 0.6)
      + tube('M54 40V18M54 18L48 8M54 18L60 8M54 26L46 20M54 26L62 20', GREEN, 1.5) + dot(54, 4, 2, RED),
  },
  { /* 18 The Moon: two hounds, two masts, and something coming up out of the cache */
    colors: [VIOLET, CYAN],
    scene: () => ring(0, -52, 26, WHITE, 2.5) + tube('M-22 -64H22M-26 -54H26M-24 -44H24M-16 -34H16', WHITE, 1) + tube('M6 -76A26 26 0 0 0 6 -28A20 26 0 0 1 6 -76Z', YELLOW, 1.5)
      + dim(tube(rays(0, -52, 31, 38, 16), WHITE, 1.2), 0.8)
      + [[-26, -10], [-10, -4], [10, -4], [26, -10], [0, 4]].map(([x, y]) => tube(`M${x} ${y}l3 6l-3 3l-3 -3Z`, YELLOW, 1)).join('')
      + solid('M-64 46V-6H-50V46', VIOLET) + tube('M-57 -6V-28M-63 -20H-51M-61 -26H-53M-64 12H-50M-64 28H-50', VIOLET, 1.2) + dot(-57, -31, 2, RED)
      + solid('M50 46V-6H64V46', VIOLET) + tube('M57 -6V-28M51 -20H63M53 -26H61M50 12H64M50 28H64', VIOLET, 1.2) + dot(57, -31, 2, RED)
      + tube('M-70 46H70', VIOLET) + tube('M-6 92Q-18 76 0 66Q14 58 2 46M10 92Q0 78 14 68Q28 58 12 46', YELLOW, 1.5)
      + solid('M-42 62V48L-38 30L-34 38L-28 34L-24 48V62Z', WHITE, 1.5) + dot(-33, 44, 1.5, CYAN)
      + solid('M24 62V48L28 34L34 38L38 30L42 48V62Z', ORANGE, 1.5) + dot(33, 44, 1.5, RED)
      + dim(tube('M-70 70H-14M18 70H70M-70 80H-18M22 80H70', CYAN, 1.5), 0.8)
      + ring(0, 82, 6, RED, 1.5, BACK) + tube('M-5 78L-12 72L-9 68M5 78L12 72L9 68', RED, 1.5),
  },
  { /* 19 The Sun: the dashboard is green */
    colors: [YELLOW, PINK],
    scene: () => `<clipPath id="ds-sun"><path d="M-70 -92H70V-70H-70ZM-70 -66H70V-56H-70ZM-70 -51H70V-42H-70ZM-70 -36H70V-28H-70ZM-70 -21H70V-15H-70ZM-70 -7H70V-3H-70Z"/></clipPath>`
      + `<g clip-path="url(#ds-sun)">${ring(0, -38, 36, YELLOW, 2.5)}<circle cx="0" cy="-38" r="36" fill="${YELLOW}" opacity="0.35"/></g>`
      + tube([190, 210, 230, 250, 270, 290, 310, 330, 350].map((a) => rays(0, -38, 42, 52, 1, a)).join(''), YELLOW, 2)
      + tube('M-70 4H70', PINK) + grid(4, PINK, 40)
      + solid('M-70 40V22H70V40', PINK, 1.5) + tube('M-52 22V40M-28 22V40M-4 22V40M20 22V40M44 22V40M-70 31H70', PINK, 1)
      + [-58, -38, 38, 58].map((x) => tube(`M${x} 22V8`, GREEN, 1.5) + tube(starPath(x, 2, 7, 8, 0.55), YELLOW, 1.2)).join('')
      + solid('M-22 62Q-24 48 -8 46H18L26 30L36 34L40 44L32 46L30 62Q4 70 -22 62Z', WHITE) + tube('M-16 64V84M-6 66V84M18 66V84M26 64V84M-22 56Q-32 60 -30 72', WHITE)
      + solid('M-4 22H10L14 46H-8Z', CYAN, 1.5) + head(3, 13, CYAN, 6) + tube('M-4 28L-20 16M10 28L26 16', CYAN)
      + tube('M-20 16V-18', PINK, 1.5) + solid('M-20 -18Q-36 -24 -46 -14Q-36 -6 -46 4Q-32 6 -20 0Z', PINK, 1.5),
  },
  { /* 20 Judgement: the broadcast that wakes every sleeping process */
    colors: [PINK, CYAN],
    scene: () => solid('M-8 -66L-58 -88L-52 -68L-60 -56L-46 -54L-48 -42L-8 -50Z', PINK) + solid('M8 -66L58 -88L52 -68L60 -56L46 -54L48 -42L8 -50Z', PINK)
      + solid('M-10 -66H10L14 -36H-14Z', WHITE) + head(0, -76, WHITE, 6.5)
      + solid('M-4 -58L-30 -24L-16 -14L4 -52Z', YELLOW) + tube('M-30 -24L-16 -14', YELLOW, 3)
      + dim(tube('M-36 -10Q-24 2 -8 -4M-44 -2Q-26 16 -2 6M-52 6Q-28 30 6 16', YELLOW, 1.5), 0.85)
      + dim(tube('M-66 -34H-36M36 -34H66M-70 -28H-44M44 -28H70', WHITE, 1), 0.6)
      + [[-44, CYAN], [0, GREEN], [44, CYAN]].map(([x, color]) => solid(`M${x - 15} 92V56H${x + 15}V92`, color) + tube(`M${x - 15} 64H${x + 15}`, color, 1)
        + solid(`M${x - 6} 34H${x + 6}L${x + 8} 62H${x - 8}Z`, WHITE, 1.5) + head(x, 26, WHITE, 5) + tube(`M${x - 6} 40L${x - 14} 22M${x + 6} 40L${x + 14} 22`, WHITE, 1.5)).join('')
      + dim(tube('M-70 56H-62M-26 56H-18M18 56H26M62 56H70', CYAN, 1.5), 0.8),
  },
  { /* 21 The World: every region green, the deploy complete */
    colors: [GREEN, CYAN],
    scene: () => `<ellipse cx="0" cy="-4" rx="42" ry="58" fill="none" stroke="${GREEN}" stroke-width="3"/>`
      + `<ellipse cx="0" cy="-4" rx="48" ry="64" fill="none" stroke="${GREEN}" stroke-width="1.2" stroke-dasharray="3 6"/>`
      + tube('M-8 -66L8 -58M8 -66L-8 -58M-8 50L8 58M8 50L-8 58', PINK)
      + dim(ring(0, -4, 30, CYAN, 1) + `<ellipse cx="0" cy="-4" rx="13" ry="30" fill="none" stroke="${CYAN}" stroke-width="1"/>` + tube('M-30 -4H30M-26 -19H26M-26 11H26', CYAN, 1), 0.55)
      + solid('M-8 -24H8L10 12H-10Z', WHITE) + head(0, -34, WHITE, 6) + tube('M-6 12L-12 36M6 12L2 24L12 32', WHITE)
      + tube('M-8 -18L-22 -6M8 -18L22 -30', WHITE) + tube('M-22 -14V4M22 -40V-22', YELLOW)
      + tube('M-10 -22Q4 -6 8 12', PINK, 2.5)
      + head(-56, -78, CYAN, 6) + tube('M-66 -66Q-56 -72 -46 -66', CYAN, 1.5)
      + tube('M46 -72L56 -86L66 -72L60 -74L56 -64L52 -74Z', YELLOW, 1.5)
      + ring(-56, 76, 7, ORANGE, 1.5) + tube('M-62 71Q-68 62 -60 60M-50 71Q-44 62 -52 60', ORANGE, 1.5)
      + tube(starPath(56, 76, 10, 10, 0.65), YELLOW, 1.5) + ring(56, 76, 4, YELLOW, 1.2),
  },
];

module.exports = { CARDS, BACK };
