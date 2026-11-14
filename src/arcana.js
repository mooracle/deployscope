'use strict';

// The pictures on the cards: 22 neon line drawings, one per major arcanum,
// and the pip cards of the minor arcana (at the end of the file).
// Each shows what the card means in software delivery, not the medieval scene:
// the Fool jumps the gap where staging should be, Justice weighs code against
// tests, the Moon is a build that is green in CI and red in its reflection.
// One emblem of the original is kept where it helps (the lemniscate, the
// scales, the skull, the lightning). A scene is drawn in a box from (-70, -92)
// to (70, 92) and is given its glow by the card (see svg.js). `colors` are the
// card's two tube colours, the first also lights its frame.
// `scene(true)` draws the reversed card: the same scene after its meaning has
// turned, so the Star's checks become question marks and the Devil's lock opens.

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

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const label = (x, y, content, color, size = 8, anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="bold" fill="${color}" text-anchor="${anchor}">${content}</text>`;
const box = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const head = (x, y, color, r = 6) => ring(x, y, r, color, 2, BACK);
const lemniscate = (x, y, color) => tube(`M${x} ${y}c5 -8 16 -8 16 0c0 8 -11 8 -16 0c-5 -8 -16 -8 -16 0c0 8 11 8 16 0`, color);
const check = (x, y, r, color = GREEN) => ring(x, y, r, color, 1.5, BACK)
  + tube(`M${n(x - r * 0.45)} ${n(y)}l${n(r * 0.3)} ${n(r * 0.35)}l${n(r * 0.55)} ${n(-r * 0.7)}`, color, 1.5);
const cross = (x, y, r, color = RED) => ring(x, y, r, color, 1.5, BACK)
  + tube(`M${n(x - r * 0.4)} ${n(y - r * 0.4)}l${n(r * 0.8)} ${n(r * 0.8)}m0 ${n(-r * 0.8)}l${n(-r * 0.8)} ${n(r * 0.8)}`, color, 1.5);
// A terminal or browser window with its title bar.
const win = (x, y, w, h, color) => solid(box(x, y, w, h), color) + tube(`M${x} ${y + 9}h${w}`, color, 1)
  + dot(x + 5, y + 4.5, 1.3, color) + dot(x + 10, y + 4.5, 1.3, color) + dot(x + 15, y + 4.5, 1.3, color);

const CARDS = [
  { /* 0 The Fool: a leap over the place where staging should have been */
    colors: [CYAN, PINK],
    scene: (r) => win(-62, -86, 124, 28, CYAN) + label(-56, -65, '$ git push --force', GREEN, 8, 'start') + solid(box(40, -72, 5, 9), GREEN, 1)
      + solid('M-70 92V40H-30V92', CYAN) + label(-50, 58, 'BUILD', CYAN, 7) + check(-50, 72, 6)
      + solid('M30 92V40H70V92', PINK) + label(50, 58, 'PROD', PINK, 7) + (r ? cross(50, 74, 6) : '')
      + dim(tube(box(-20, 62, 40, 18), WHITE, 1.2, ' stroke-dasharray="3 3"') + label(0, 74, 'STAGING', WHITE, 6) + tube('M-22 82L22 60', RED, 1.5), 0.75)
      + tube(r ? 'M-34 36Q-6 -40 0 -14' : 'M-34 36Q0 -44 34 36', r ? RED : YELLOW, 1.5, ' stroke-dasharray="2 5"')
      + turn(r ? 0 : -2, r ? 14 : -4, r ? 180 : 24, solid('M-7 -14H7L9 12H-9Z', CYAN) + head(0, -22, CYAN, 5.5) + tube('M-6 12L-18 26M6 12L16 20L22 30M7 -8L22 -14M-7 -8L-18 0', CYAN))
      + (r ? turn(-30, -20, 25, solid(box(-5, -5, 11, 11), PINK, 1.5)) : tube('M-14 -14L-34 -30', PINK, 1.5) + solid(box(-44, -40, 11, 11), PINK, 1.5))
      + tube('M34 2H54M38 2V-2M50 2V-2M32 -2H42M46 -2H56', PINK, 1.5) + dot(44, 4, 1.8, PINK),
  },
  { /* 1 The Magician: every tool at hand, every stage obeying */
    colors: [PINK, CYAN],
    scene: (r) => lemniscate(0, -80, YELLOW)
      + win(-38, -66, 76, 46, PINK) + tube('M-28 -46L-20 -40L-28 -34', GREEN, 2.5) + tube('M-14 -34H2', GREEN, 2.5)
      + (r ? label(-28, -25, 'localhost', YELLOW, 8, 'start') : dim(tube('M-28 -27H18', PINK, 1.5), 0.7))
      + tube('M0 -20V-4M-48 10V-4H48V10M-16 -4V10M16 -4V10', CYAN, 1.5)
      + [-48, -16, 16, 48].map((x, i) => (r && i ? cross(x, 16, 8) : check(x, 16, 8))).join('')
      + tube('M-40 16H-24M-8 16H8M24 16H40', CYAN, 1.5)
      + tube('M-52 70V46M-52 60Q-52 54 -42 54V46', YELLOW) + ring(-52, 72, 3, YELLOW, 1.5, BACK) + ring(-52, 44, 3, YELLOW, 1.5, BACK) + ring(-42, 44, 3, YELLOW, 1.5, BACK)
      + tube('M-28 50L-16 44L-4 50V64L-16 70L-28 64ZM-28 50L-16 56L-4 50M-16 56V70', CYAN, 1.5)
      + ring(16, 58, 7, WHITE, 1.5) + tube(rays(16, 58, 9, 13, 8), WHITE, 2.5) + dot(16, 58, 2, WHITE)
      + ring(42, 52, 6, ORANGE, 1.5) + tube('M46 56L58 68M54 64L50 68M58 68L54 72', ORANGE, 1.5)
      + dim(tube('M-62 82H62', PINK, 1), 0.6),
  },
  { /* 2 The High Priestess: the answer is already in the logs */
    colors: [VIOLET, CYAN],
    scene: (r) => solid(box(-68, -84, 14, 150), VIOLET, 1.5) + solid(box(54, -84, 14, 150), VIOLET, 1.5)
      + [-72, -56, -40, -24, -8, 8, 24, 40, 56].map((y, i) => dot(-61, y, 1.5, i % 3 ? VIOLET : GREEN) + dot(61, y, 1.5, i % 2 ? VIOLET : CYAN)).join('')
      + solid(box(-44, -84, 88, 150), CYAN)
      + dim([[-76, 60], [-68, 44], [-60, 66], [-52, 36], [-44, 58], [-36, 50], [-28, 70], [4, 46], [12, 62], [20, 38], [28, 56], [36, 66], [44, 42], [52, 54]]
        .map(([y, w]) => tube(`M-38 ${y}h${w}`, CYAN, 1.5)).join(''), 0.55)
      + (r ? solid(box(-40, -20, 80, 14), RED, 1.5) + label(-37, -10, 'API_KEY=sk-4f', RED, 8, 'start') : tube('M-38 -12H-20', RED, 2.5) + tube('M-14 -12H30', YELLOW, 2.5))
      + (r ? ring(18, 22, 15, WHITE, 2.5) + tube('M29 33L42 48', WHITE, 4) + tube('M10 8L4 -3', WHITE, 1.2) : ring(10, -12, 17, WHITE, 2.5) + tube('M22 0L40 20', WHITE, 4))
      + tube('M-16 86A16 16 0 0 0 16 86A20 20 0 0 1 -16 86Z', YELLOW)
      + tube('M-70 66H70', VIOLET, 1.5),
  },
  { /* 3 The Empress: one pod becomes eight */
    colors: [GREEN, PINK],
    scene: (r) => tube('M0 44V30M0 30H-32V18M0 30H32V18M-32 2V-8M-32 -8H-48V-18M-32 -8H-16V-18M32 2V-8M32 -8H16V-18M32 -8H48V-18', GREEN)
      + [-48, -16, 16, 48].map((x) => tube(`M${x} -32V-40M${x} -40H${x - 8}V-48M${x} -40H${x + 8}V-48`, GREEN, 1.5)).join('')
      + solid(box(-13, 44, 26, 22), GREEN, 2.5) + tube('M0 52C-5 47 -8 54 0 60C8 54 5 47 0 52Z', PINK, 1.5)
      + [-32, 32].map((x) => solid(box(x - 10, 2, 20, 16), GREEN)).join('')
      + [-48, -16, 16, 48].map((x) => solid(box(x - 8, -32, 16, 14), GREEN, 1.5)).join('')
      + [-56, -40, -24, -8, 8, 24, 40, 56].map((x) => (r ? solid(box(x - 5, -58, 10, 10), RED, 1.5) + label(x, -63, '$', RED, 8) : solid(box(x - 5, -58, 10, 10), PINK, 1.5) + tube(`M${x} -64V-70M${x - 3} -67H${x + 3}`, YELLOW, 1.2))).join('')
      + (r ? label(0, -78, 'bill: $$$$', RED, 9) : [-14, -7, 0, 7, 14].map((x) => dot(x, -84 + (x * x) / 40, 1.8, YELLOW)).join(''))
      + tube('M-70 72H70', GREEN) + tube('M-60 72V82M-52 72V86M52 72V86M60 72V82M-56 78H-46M46 78H56', GREEN, 1)
      + dim(tube('M-66 60L-50 50L-40 56L-24 40', PINK, 1.5) + tube('M24 40L40 30L50 36L66 16', PINK, 1.5), 0.7),
  },
  { /* 4 The Emperor: the protected branch */
    colors: [RED, YELLOW],
    scene: (r) => skyline(64, RED, [[-68, 14, 70], [-50, 10, 96], [40, 10, 104], [54, 14, 76]])
      + tube('M-16 -66V-80L-8 -72L0 -84L8 -72L16 -80V-66Z', YELLOW)
      + solid('M0 -60L42 -46V-6Q42 36 0 58Q-42 36 -42 -6V-46Z', RED, 2.5)
      + dim(tube('M0 -50L33 -39V-6Q33 28 0 47Q-33 28 -33 -6V-39Z', RED, 1), 0.7)
      + tube('M-16 30V-28M-16 6Q-16 -6 0 -6', YELLOW) + ring(-16, -32, 4, YELLOW, 2, BACK) + ring(-16, 34, 4, YELLOW, 2, BACK)
      + solid(box(-2, -8, 24, 20), YELLOW) + tube('M4 -8V-16Q10 -26 16 -16V-8', YELLOW) + dot(10, 1, 2.5, YELLOW) + tube('M10 2V7', YELLOW, 1.5)
      + label(-16, -40, 'main', YELLOW, 7)
      + check(-50, 74, 8) + head(-50, 56, GREEN, 4) + (r ? tube('M58 74A8 8 0 1 1 42 74A8 8 0 1 1 58 74', WHITE, 1.5, ' stroke-dasharray="3 3"') + label(50, 60, 'OOO', WHITE, 8) : check(50, 74, 8) + head(50, 56, GREEN, 4))
      + tube('M-70 64H-60M-40 64H40M60 64H70', RED) + grid(64, RED),
  },
  { /* 5 The Hierophant: the runbook, followed to the letter */
    colors: [ORANGE, CYAN],
    scene: (r) => tube('M0 -62V-88M-7 -82H7M-10 -75H10M-13 -68H13', YELLOW)
      + solid('M-2 -48Q-30 -58 -62 -48V52Q-30 42 -2 52Z', ORANGE, 2.5) + solid('M2 -48Q30 -58 62 -48V52Q30 42 2 52Z', ORANGE, 2.5)
      + tube('M0 -46V54', ORANGE, 1.5)
      + tube('M-52 -38H-24', ORANGE, 2.5)
      + [-22, -4, 14, 32].map((y) => solid(box(-54, y - 5, 9, 9), CYAN, 1.5) + (r ? '' : tube(`M-52 ${y}l2 3l4 -6`, GREEN, 1.5)) + dim(tube(`M-40 ${y}H-12`, ORANGE, 1.5), 0.7)).join('')
      + [-34, -16].map((y) => solid(box(10, y - 5, 9, 9), CYAN, 1.5) + (r ? '' : tube(`M12 ${y}l2 3l4 -6`, GREEN, 1.5)) + dim(tube(`M24 ${y}H52`, ORANGE, 1.5), 0.7)).join('')
      + solid(box(10, -3, 9, 9), YELLOW, 2) + tube('M24 2H52', YELLOW, 2.5) + tube('M68 2H58M62 -2L58 2L62 6', YELLOW, 1.5)
      + [20, 38].map((y) => solid(box(10, y - 5, 9, 9), CYAN, 1.5) + dim(tube(`M24 ${y}H52`, ORANGE, 1.5), 0.5)).join('')
      + tube('M40 -52V-30L45 -36L50 -30V-52', RED, 1.5)
      + (r ? tube('M-36 -44Q34 -30 44 36', RED, 2.5) + tube('M44 36l-9 -4M44 36l3 -9', RED, 2.5) + label(22, -24, 'skip', RED, 8) : '')
      + ring(-6, 84, 4, YELLOW) + ring(6, 84, 4, YELLOW) + tube('M-3 81L10 64M3 81L-10 64M10 64l-4 -1M-10 64l4 -1', YELLOW, 1.5),
  },
  { /* 6 The Lovers: the model and the GPU it was made for */
    colors: [PINK, CYAN],
    scene: (r) => solid(box(-44, -86, 88, 26), YELLOW, 1.5) + label(-38, -70, 'util', YELLOW, 7, 'start') + label(38, -70, r ? 'OOM' : '100%', r ? RED : GREEN, 7, 'end')
      + `<rect x="-12" y="-77" width="24" height="8" fill="${r ? RED : GREEN}" opacity="0.8"/>` + tube(box(-14, -79, 28, 12), YELLOW, 1)
      + solid(box(-68, -44, 54, 42), PINK, 2.5) + tube('M-68 -50V4M-72 -50H-64', PINK, 1.5)
      + [-54, -30].map((x) => ring(x, -23, 11, PINK, 1.5) + tube(rays(x, -23, 3, 10, 6, 15), PINK, 1.5) + dot(x, -23, 2, PINK)).join('')
      + tube('M-62 -2V5H-34V-2M-30 -2V5H-20V-2', YELLOW, 1.5) + label(-41, 22, 'GPU', PINK, 11)
      + tube('M22 -40L42 -32M22 -40L42 -14M22 -23L42 -32M22 -23L42 -14M22 -6L42 -32M22 -6L42 -14M42 -32L62 -23M42 -14L62 -23', CYAN, 1.2)
      + [[22, -40], [22, -23], [22, -6], [42, -32], [42, -14]].map(([x, y]) => ring(x, y, 4.5, CYAN, 2, BACK)).join('') + ring(62, -23, 5.5, YELLOW, 2, BACK)
      + label(42, 22, 'AI', CYAN, 11)
      + (r ? tube('M-3 -28C-11 -37 -16 -24 -3 -14L-5 -19L-1 -22L-5 -25ZM3 -28C11 -37 16 -24 3 -14L5 -19L1 -22L5 -25Z', RED) : tube('M0 -28C-8 -37 -13 -24 0 -14C13 -24 8 -37 0 -28Z', WHITE)) + tube(starPath(-6, -46, 3.5, 4, 0.35), WHITE, 1) + tube(starPath(8, -4, 3, 4, 0.35), WHITE, 1)
      + tube('M-44 40H38M32 35L38 40L32 45', PINK, 1.5) + label(-58, 43, 'in', PINK, 7)
      + tube('M44 56H-38M-32 51L-38 56L-32 61', CYAN, 1.5) + label(57, 59, r ? 'err' : 'tok', r ? RED : GREEN, 7)
      + tube('M-70 72H70', PINK) + grid(72, PINK),
  },
  { /* 7 The Chariot: ship it */
    colors: [CYAN, YELLOW],
    scene: (r) => [[-52, -70], [-36, -30], [48, -76], [56, -20], [-58, 10]].map(([x, y]) => tube(starPath(x, y, 4, 4, 0.35), YELLOW, 1)).join('')
      + dim(tube('M-30 -40V20M-44 -10V44M30 -40V20M44 -10V44M-58 30V60M58 30V60', CYAN, 1.2), 0.6)
      + `<g transform="rotate(${r ? 40 : 0} 0 -20)">` + solid('M-14 6L-30 30H-14ZM14 6L30 30H14Z', CYAN)
      + solid('M0 -84Q20 -54 15 14H-15Q-20 -54 0 -84Z', CYAN, 2.5) + tube('M-13 -44H13M-15 2H15', CYAN, 1.2)
      + ring(0, -30, 7, YELLOW, 2, BACK) + tube(starPath(0, -30, 4, 8, 0.4), YELLOW, 1)
      + label(0, -8, 'v2', CYAN, 8)
      + solid('M-9 14H9L5 22H-5Z', WHITE, 1.5)
      + tube('M-8 24Q0 66 8 24', YELLOW, 2.5) + tube('M-4 24Q0 46 4 24', ORANGE)
      + dim(tube('M-14 34V54M14 34V54M-6 62V78M6 62V78M0 70V88', ORANGE, 1.5), 0.85) + '</g>'
      + (r ? cross(-34, -62, 7) + cross(-50, -40, 7) + cross(-58, -14, 7) + label(-40, -78, 'health', RED, 7) : '')
      + solid('M-50 62L-42 44L-34 62Z', WHITE, 1.5) + solid('M34 62L42 44L50 62Z', VIOLET, 1.5)
      + tube('M-70 62H-18M18 62H70', CYAN) + grid(62, CYAN),
  },
  { /* 8 Strength: the breaker holds and the retries land */
    colors: [ORANGE, PINK],
    scene: (r) => lemniscate(0, -80, YELLOW)
      + tube('M-64 -70L-52 -52L-60 -50L-46 -32', RED) + tube('M-40 -76L-32 -60L-39 -58L-28 -42', RED, 1.5) + tube('M-66 -40L-58 -28', RED, 1.5)
      + solid('M30 -70L58 -62V-44Q58 -26 30 -16Q2 -26 2 -44V-62Z', ORANGE, 2.5) + (r ? tube('M20 -54L40 -30M40 -54L20 -30', RED, 2.5) : tube('M19 -44l8 9l15 -18', GREEN, 2.5))
      + tube('M-66 -2H-24M24 -2H66', ORANGE, 2.5) + tube(r ? 'M-24 -2L14 -28' : 'M-24 -2L22 -8', r ? RED : ORANGE, 3)
      + ring(-24, -2, 4.5, ORANGE, 2, BACK) + ring(24, -2, 4.5, ORANGE, 2, BACK) + dim(tube('M-12 -16Q0 -22 12 -16', ORANGE, 1.2), 0.8)
      + tube('M19.8 39A20 20 0 1 1 10 21.7', PINK, 2.5) + tube('M4 14L11 22L1 26', PINK, 2.5) + label(0, 43, r ? 'x0' : 'x3', PINK, 11)
      + (r ? tube('M-70 78H70', RED) : tube('M-70 78H-36L-28 64L-18 90L-10 78H18L24 70L30 78H70', GREEN)),
  },
  { /* 9 The Hermit: one lit window, nobody watching */
    colors: [YELLOW, VIOLET],
    scene: (r) => rain(VIOLET, 9, 12) + skyline(92, VIOLET, [[-70, 16, 60], [-50, 12, 86], [46, 12, 74], [60, 10, 50]])
      + tube('M40 -84A12 12 0 1 0 54 -64A10 10 0 1 1 40 -84Z', WHITE, 1.5)
      + label(-66, -72, r ? 'bus: 1' : '03:00', r ? RED : YELLOW, 11, 'start')
      + solid('M-26 92V-50H26V92', VIOLET, 2.5) + tube('M0 -50V-66M-6 -60H6', VIOLET, 1.5) + dot(0, -69, 2, RED)
      + dim([-38, -22, 14, 28, 42, 56, 70].map((y) => [-20, -9, 2, 13].map((x) => tube(box(x, y, 7, 8), VIOLET, 1)).join('')).join(''), 0.55)
      + (r ? '' : dim(ring(-2, -1, 16, YELLOW, 1) + ring(-2, -1, 25, YELLOW, 1), 0.45))
      + (r ? solid(box(-14, -10, 24, 18), VIOLET, 1.5) + label(-2, 3, 'zzz', VIOLET, 8) : solid(box(-14, -10, 24, 18), YELLOW, 2.5) + tube('M-9 -5L-4 -1L-9 3M-1 3H5', YELLOW, 1.5))
      + [-56, -44, 44, 56].map((x) => dim(head(x, 70, VIOLET, 4) + tube(`M${x - 6} 84Q${x} 74 ${x + 6} 84`, VIOLET, 1.5), 0.6)).join(''),
  },
  { /* 10 Wheel of Fortune: the flaky test, spun again */
    colors: [PINK, YELLOW],
    scene: (r) => solid('M-7 -78H7L0 -64Z', WHITE)
      + ring(0, -10, 50, PINK, 3) + ring(0, -10, 40, YELLOW, 1.2) + tube(rays(0, -10, 10, 40, 8, 22.5), YELLOW, 1.2)
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const x = 27 * Math.cos((i * 45 - 90) * DEG);
        const y = -10 + 27 * Math.sin((i * 45 - 90) * DEG);
        return (i % 2 === 1) !== Boolean(r) ? cross(x, y, 6.5) : check(x, y, 6.5);
      }).join('')
      + ring(0, -10, 10, YELLOW, 2, BACK) + dot(0, -10, 3, YELLOW)
      + tube(`M${n(50 * Math.cos(-150 * DEG))} ${n(-10 + 50 * Math.sin(-150 * DEG))}A50 50 0 0 1 ${n(50 * Math.cos(-100 * DEG))} ${n(-10 + 50 * Math.sin(-100 * DEG))}`, WHITE, 5)
      + dim(tube('M-62 -62A70 70 0 0 0 -66 20M62 -62A70 70 0 0 1 66 20', PINK, 1.2, ' stroke-dasharray="2 5"'), 0.8)
      + solid(box(-34, 56, 68, 24), YELLOW) + tube('M-16 73A6 6 0 1 1 -18.5 63.6', YELLOW, 1.5) + tube('M-22 61L-18 64L-21 68', YELLOW, 1.5)
      + label(8, 71, r ? 'FAILED' : 'RE-RUN', r ? RED : YELLOW, 8),
  },
  { /* 11 Justice: code on one pan, tests on the other */
    colors: [CYAN, RED],
    scene: (r) => dim(tube('M-66 -84V50M-58 -84V50M58 -84V50M66 -84V50', CYAN, 1.2), 0.6)
      + tube('M0 -84V44', WHITE, 2.5) + tube('M0 -84L-4 -74M0 -84L4 -74M-10 34H10', WHITE) + tube('M-12 44H12', CYAN, 3)
      + `<g transform="rotate(${r ? -15 : 0} 0 -58)">` + tube('M-44 -58H44', YELLOW, 2.5) + ring(0, -58, 4, YELLOW, 2, BACK)
      + tube('M-44 -58L-60 -14M-44 -58L-28 -14M44 -58L28 -14M44 -58L60 -14', YELLOW, 1.2)
      + solid('M-62 -14H-26Q-30 0 -44 0Q-58 0 -62 -14Z', YELLOW) + solid('M26 -14H62Q58 0 44 0Q30 0 26 -14Z', YELLOW)
      + solid(box(-58, -40, 28, 22), RED, 1.5) + tube('M-50 -34L-54 -29L-50 -24M-38 -34L-34 -29L-38 -24M-42 -36L-46 -22', RED, 1.5)
      + [[36, -36], [52, -36], [44, -24]].map(([x, y]) => (r ? `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${WHITE}" stroke-width="1.5" stroke-dasharray="2 3"/>` : check(x, y, 6))).join('') + '</g>'
      + solid(box(-54, 58, 108, 12), CYAN) + `<rect x="-52" y="60" width="${r ? 13 : 90}" height="8" fill="${r ? RED : GREEN}" opacity="0.85"/>`
      + label(0, 86, r ? '12%' : '87%', r ? RED : GREEN, 10),
  },
  { /* 12 The Hanged Man: the job that waits for a runner */
    colors: [CYAN, YELLOW],
    scene: (r) => tube('M-64 -82H40M40 -82L64 -66M-64 -82V-72M-40 -82V-72M-16 -82V-72M8 -82V-72M32 -82V-72M-64 -72H40M-64 -82L-40 -72L-16 -82L8 -72L32 -82', YELLOW, 1.5)
      + tube('M0 -72V-40', WHITE, 1.5) + tube('M-4 -40Q-4 -32 2 -32Q6 -32 6 -37', WHITE, 2)
      + ring(0, -8, 30, YELLOW, 1.5) + tube('M0 -38A30 30 0 0 1 26 -23', YELLOW, 4)
      + `<g transform="${r ? 'translate(10 66) rotate(18)' : ''}">` + solid(box(-18, -26, 36, 36), r ? RED : CYAN, 2.5) + tube('M-9 -18H9L-9 2H9Z', r ? RED : CYAN) + tube('M-4 -2H4', YELLOW, 2.5) + '</g>'
      + label(0, r ? -4 : 32, r ? 'timeout' : 'queued', r ? RED : CYAN, 9) + (r ? '' : [-8, 0, 8].map((x) => dot(x, 40, 1.8, YELLOW)).join(''))
      + dim([52, 66, 80].map((y, i) => solid(box(-30 + i * 4, y, 60 - i * 8, 10), CYAN, 1.5)).join(''), 0.7)
      + rain(CYAN, 12, 8),
  },
  { /* 13 Death: the legacy system, finally switched off */
    colors: [WHITE, RED],
    scene: (r) => ring(0, 58, 20, ORANGE) + tube('M-18 50H18M-20 58H20', ORANGE, 1.2)
      + solid('M-70 92V58H70V92', RED, 1.5) + grid(58, RED)
      + solid('M-66 58V30Q-56 16 -46 30V58', RED, 1.5) + tube('M-56 30V46M-61 36H-51', RED, 1.2)
      + solid('M46 58V30Q56 16 66 30V58', RED, 1.5) + label(56, 44, 'v1', r ? GREEN : RED, 7) + (r ? dot(56, 50, 2, GREEN) : '')
      + tube('M38 -84V40', WHITE, 2.5) + (r ? tube('M38 -80Q26 -82 16 -77M38 -66Q30 -68 22 -68', RED, 2.5) + turn(-30, 62, 70, tube('M0 0Q-14 -10 -30 -4Q-14 -4 -4 8', RED, 2.5)) : tube('M38 -80Q4 -84 -18 -58Q12 -70 38 -66', RED, 2.5))
      + solid('M-28 -22Q-28 -58 0 -58Q28 -58 28 -22Q28 -8 18 -2V14H-18V-2Q-28 -8 -28 -22Z', WHITE, 2.5)
      + solid('M-19 -30H-5V-16H-19Z', WHITE) + ring(12, -23, 7, r ? GREEN : RED, 2.5) + dot(12, -23, 2.5, r ? GREEN : RED)
      + tube('M-3 -8L0 -14L3 -8Z', WHITE, 1.5) + tube('M-12 2V14M-4 2V14M4 2V14M12 2V14M-18 2H18', WHITE, 1.5)
      + tube('M19 -23H40', RED, 1) + solid('M-27 22H27V36H-27Z', RED, 1.5)
      + label(0, 32.5, r ? 'RUNNING' : 'KILL -9', r ? GREEN : RED, 9),
  },
  { /* 14 Temperance: nine parts old to one part new */
    colors: [CYAN, ORANGE],
    scene: (r) => tube('M0 -88V-72M-4 -76L0 -70L4 -76', WHITE, 1.5)
      + solid('M-10 -60L-40 -76L-36 -62L-42 -54L-32 -52L-34 -42L-10 -48Z', ORANGE, 1.5) + solid('M10 -60L40 -76L36 -62L42 -54L32 -52L34 -42L10 -48Z', ORANGE, 1.5)
      + ring(0, -56, 12, CYAN, 2.5, BACK) + tube('M0 -62V-50M-5 -55L0 -50L5 -55', CYAN, 1.5)
      + (r ? tube('M-6 -45Q-36 -30 -36 4', CYAN, 2, ' stroke-dasharray="2 5"') + tube('M6 -45Q36 -30 36 4', ORANGE, 7) : tube('M-6 -45Q-36 -30 -36 4', CYAN, 7) + tube('M6 -45Q36 -30 36 4', ORANGE, 2, ' stroke-dasharray="2 5"'))
      + solid(box(-60, 6, 48, 34), CYAN, 2.5) + label(-36, 22, 'v1', CYAN, 10) + label(-36, 34, r ? '0%' : '90%', CYAN, 7)
      + solid(box(12, 6, 48, 34), ORANGE, 2.5) + label(36, 22, 'v2', ORANGE, 10) + label(36, 34, r ? '100%' : '10%', r ? RED : ORANGE, 7)
      + solid('M40 -6Q40 -16 50 -16Q58 -16 58 -8L64 -6L58 -4Q56 6 46 6H36L42 0Z', YELLOW, 1.5) + dot(53, -11, 1.2, YELLOW) + tube('M46 6V10M50 6V10', YELLOW, 1.2)
      + tube('M-56 62H56', WHITE, 1.5) + ring(r ? 56 : -44, 62, 6, r ? RED : ORANGE, 2.5, BACK) + dim(tube('M-56 70V74M-28 70V74M0 70V74M28 70V74M56 70V74', WHITE, 1), 0.7)
      + label(-56, 86, '0', WHITE, 6) + label(56, 86, '100', WHITE, 6),
  },
  { /* 15 The Devil: the cloud that will not let you leave */
    colors: [RED, VIOLET],
    scene: (r) => tube('M-22 -62Q-36 -74 -28 -88M22 -62Q36 -74 28 -88', RED, 2.5)
      + solid('M-36 -22Q-56 -22 -54 -40Q-54 -56 -36 -56Q-28 -72 -8 -66Q8 -78 24 -64Q46 -66 48 -46Q60 -38 50 -26Q46 -20 38 -22Z', VIOLET, 2.5)
      + tube('M-22 -50L-8 -44L-20 -40ZM22 -50L8 -44L20 -40Z', YELLOW, 1.5) + tube('M-10 -32Q0 -26 10 -32', RED, 1.5)
      + label(40, -6, r ? 'free' : '$$$', r ? GREEN : RED, 9)
      + tube(r ? 'M-9 4V-14Q0 -28 9 -14V-10' : 'M-9 4V-6Q0 -20 9 -6V4', YELLOW, 3) + solid(box(-15, 4, 30, 24), YELLOW, 2.5) + dot(0, 14, 3, YELLOW) + tube('M0 15V22', YELLOW, 2)
      + tube(r ? 'M-15 22Q-22 23 -26 27M-41 40L-44 46M15 22Q22 23 26 27M41 40L44 46' : 'M-15 22Q-40 26 -44 46M15 22Q40 26 44 46', YELLOW, 1.5, ' stroke-dasharray="3 3"')
      + solid(box(-62, 46, 36, 28), WHITE, 1.5) + label(-44, 64, 'app', WHITE, 8)
      + solid(box(26, 46, 36, 28), WHITE, 1.5) + label(44, 64, 'db', WHITE, 8) + (r ? check(-26, 46, 6) + check(62, 46, 6) : '')
      + tube('M-70 82H70', RED) + dim(tube('M-20 82V92M0 82V92M20 82V92', RED, 1), 0.7),
  },
  { /* 16 The Tower: production is down */
    colors: [YELLOW, RED],
    scene: (r) => skyline(92, VIOLET, [[-70, 14, 30], [-54, 12, 46], [48, 12, 40], [62, 8, 24]])
      + solid('M-20 92V-12H20V92', RED, 2.5) + (r ? solid('M-20 -12V-40H20V-12', RED, 2.5) : solid('M-12 -18L-18 -46H14L20 -22Z', RED, 2.5, ' transform="rotate(-9 0 -30) translate(-5 -4)"'))
      + tube('M-14 34H14M-14 46H14M-14 58H14M-14 70H14M-14 82H14', RED, 1)
      + [[-8, 40], [6, 52], [-6, 64], [7, 76]].map(([x, y]) => dot(x, y, 1.8, YELLOW)).join('')
      + solid(box(-15, 2, 30, 20), YELLOW, 1.5) + label(0, 16, r ? '200' : '503', r ? GREEN : YELLOW, 11)
      + (r ? '' : tube('M-20 -12L-6 -18L4 -10L20 -14', ORANGE) + tube('M-10 -14Q-16 -28 -8 -36Q-8 -28 -2 -32Q-2 -22 4 -26Q4 -18 8 -14', ORANGE))
      + (r ? tube('M42 -40V92M36 -40H48', WHITE, 2) + solid('M70 -92L52 -68L60 -66L42 -42L50 -60L42 -62L58 -92Z', YELLOW, 2) : solid('M66 -92L26 -52L40 -48L8 -16L22 -44L8 -46L48 -92Z', YELLOW, 2.5))
      + (r ? '' : turn(-46, 10, -24, cross(0, 0, 8, CYAN)) + turn(46, 2, 18, cross(0, 0, 8, PINK)))
      + dim(tube('M-46 -8V-22M-40 -6V-16M46 -16V-30M52 -12V-22', WHITE, 1.2), 0.7)
      + [[-52, -50], [-34, -30], [38, 34], [54, 22], [-58, 40]].map(([x, y]) => tube(`M${x} ${y}l3 6l-3 3l-3 -3Z`, YELLOW, 1)).join(''),
  },
  { /* 17 The Star: green as far as the eye can see */
    colors: [CYAN, WHITE],
    scene: (r) => dim(tube(starPath(0, -64, 22, 8, 0.36), YELLOW, 2.5) + ring(0, -64, 4.5, YELLOW, 1.5), r ? 0.3 : 1)
      + [[-46, -78], [-56, -52], [46, -78], [56, -52], [-30, -44], [30, -44]].map(([x, y]) => tube(starPath(x, y, 6, 8, 0.38), WHITE, 1.2)).join('')
      + solid(box(-52, -30, 104, 92), CYAN, 2.5)
      + [-16, 0, 16, 32, 48].map((y, i) => (r ? dim(ring(-40, y, 6, WHITE, 1.5) + label(-40, y + 3, '?', WHITE, 8) + tube(`M-28 ${y}h${[52, 40, 58, 34, 46][i]}`, WHITE, 2), 0.4) : check(-40, y, 6) + tube(`M-28 ${y}h${[52, 40, 58, 34, 46][i]}`, WHITE, 2)) + dim(tube(`M36 ${y}h10`, CYAN, 1.5), 0.7)).join('')
      + (r ? dim(solid(box(-28, 70, 56, 18), WHITE, 1.5) + label(0, 83, 'NO DATA', WHITE, 8), 0.55) : solid(box(-28, 70, 56, 18), GREEN, 2) + label(0, 83, 'MERGE', GREEN, 9)),
  },
  { /* 18 The Moon: green in CI, red in the water */
    colors: [VIOLET, CYAN],
    scene: (r) => ring(0, -70, 16, WHITE, 2) + tube('M-12 -78H12M-15 -70H15M-12 -62H12', WHITE, 1) + tube('M4 -85A16 16 0 0 0 4 -55A12 16 0 0 1 4 -85Z', YELLOW, 1.5)
      + solid('M-66 0V-34H-56V0', VIOLET, 1.5) + tube('M-61 -34V-50M-66 -44H-56', VIOLET, 1.2) + dot(-61, -53, 2, RED)
      + solid('M56 0V-34H66V0', VIOLET, 1.5) + tube('M61 -34V-50M56 -44H66', VIOLET, 1.2) + dot(61, -53, 2, RED)
      + win(-42, -44, 84, 38, CYAN) + (r ? cross(-26, -20, 9) : check(-26, -20, 9)) + label(-10, -22, 'CI', CYAN, 9, 'start') + label(-10, -11, r ? 'failed' : 'passed', r ? RED : GREEN, 8, 'start')
      + tube('M-70 0H70', CYAN, 2.5)
      + dim(tube(box(-42, 8, 84, 36), VIOLET, 2, ' stroke-dasharray="7 4"'), 0.9)
      + turn(-26, 26, 0, cross(0, 0, 9)) + label(-10, 22, 'PROD', VIOLET, 9, 'start') + label(-10, 34, 'failed', RED, 8, 'start')
      + dim(tube('M-64 12H-48M48 18H66M-66 30H-50M50 34H64M-60 52H-20M16 54H60M-40 62H40', CYAN, 1.5), 0.75)
      + (r ? ring(0, 78, 19, YELLOW, 2) + tube('M14 64L30 50', YELLOW, 3) + label(34, 46, 'found', YELLOW, 8, 'start') : '')
      + solid('M-8 76Q-8 68 0 68Q8 68 8 76V82Q8 88 0 88Q-8 88 -8 82Z', RED, 1.5) + tube('M-8 74L-16 68M-8 80H-18M-8 84L-16 90M8 74L16 68M8 80H18M8 84L16 90M-4 68L-8 62M4 68L8 62M-8 77H8', RED, 1.2),
  },
  { /* 19 The Sun: the dashboard on a good day */
    colors: [YELLOW, PINK],
    scene: (r) => `<clipPath id="ds-sun"><path d="M-70 -92H70V-66H-70ZM-70 -62H70V-54H-70ZM-70 -49H70V-42H-70ZM-70 -36H70V-31H-70ZM-70 -25H70V-22H-70Z"/></clipPath>`
      + `<g clip-path="url(#ds-sun)"${r ? ' transform="translate(0 24)"' : ''}>${ring(0, -50, 30, YELLOW, 2.5)}<circle cx="0" cy="-50" r="30" fill="${YELLOW}" opacity="0.35"/></g>`
      + (r ? '' : tube([180, 200, 220, 240, 260, 280, 300, 320, 340, 360].map((a) => rays(0, -50, 35, 44, 1, a)).join(''), YELLOW, 2))
      + solid(box(-60, -14, 120, 98), PINK, 2.5)
      + label(-52, 4, r ? '47 min' : '99.99%', r ? ORANGE : YELLOW, 12, 'start') + label(52, 3, r ? 'build' : 'uptime', PINK, 7, 'end')
      + `<path d="M-52 44L-34 34L-20 38L-2 22L14 26L32 12L52 14V48H-52Z" fill="${GREEN}" opacity="0.18"/>`
      + tube('M-52 44L-34 34L-20 38L-2 22L14 26L32 12L52 14', GREEN, 2.5) + dim(tube('M-52 48H52', PINK, 1), 0.7)
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${-52 + i * 13.4}" y="56" width="9.5" height="9.5" rx="2" fill="${r && i > 2 ? ORANGE : GREEN}" fill-opacity="${r && i > 2 ? 0 : 0.3}" stroke="${r && i > 2 ? ORANGE : GREEN}" stroke-width="1.5"${r && i > 2 ? ' stroke-dasharray="2 2"' : ''}/>`).join('')
      + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${-52 + i * 13.4}" y="69" width="9.5" height="9.5" rx="2" fill="${r ? ORANGE : GREEN}" fill-opacity="${r ? 0 : 0.3}" stroke="${r ? ORANGE : GREEN}" stroke-width="1.5"${r ? ' stroke-dasharray="2 2"' : ''}/>`).join(''),
  },
  { /* 20 Judgement: the postmortem, with every action item closed */
    colors: [PINK, CYAN],
    scene: (r) => solid('M-8 -70L-58 -90L-52 -72L-60 -60L-46 -58L-48 -46L-8 -54Z', PINK) + solid('M8 -70L58 -90L52 -72L60 -60L46 -58L48 -46L8 -54Z', PINK)
      + ring(0, -66, 9, WHITE, 2, BACK)
      + solid('M-4 -62L-22 -34L-8 -26L6 -56Z', YELLOW) + tube('M-22 -34L-8 -26', YELLOW, 3)
      + dim(tube('M-26 -22Q-16 -12 -4 -18M-32 -16Q-16 0 2 -10', YELLOW, 1.5), 0.85)
      + solid(box(-50, 0, 100, 90), WHITE, 2.5) + label(-42, 14, 'POSTMORTEM', PINK, 8, 'start')
      + tube('M-40 30H40', CYAN, 1.5) + ring(-40, 30, 4, RED, 2, BACK) + ring(-10, 30, 4, YELLOW, 2, BACK) + ring(40, 30, 4, r ? RED : GREEN, 2, BACK) + (r ? tube('M38 35Q0 48 -38 35M-38 35l7 0M-38 35l4 6', RED, 1.5) : '')
      + dim(tube('M-40 36V40M-10 36V40M40 36V40', CYAN, 1), 0.8)
      + [52, 66, 80].map((y, i) => (r ? cross(-38, y, 5.5) : check(-38, y, 5.5)) + tube(`M-26 ${y}h${[56, 44, 62][i]}`, WHITE, 2)).join(''),
  },
  { /* 21 The World: released, in every region */
    colors: [GREEN, CYAN],
    scene: (r) => (r ? tube('M0 -70A54 54 0 1 1 -46.8 -43', GREEN, 3.5) + tube('M-40 -52A54 54 0 0 1 -10 -69', RED, 2, ' stroke-dasharray="2 6"') : ring(0, -16, 54, GREEN, 3.5)) + dim(tube(rays(0, -16, 58, 63, 36), GREEN, 1.2), 0.8)
      + ring(0, -16, 40, CYAN, 1.5)
      + dim(`<ellipse cx="0" cy="-16" rx="18" ry="40" fill="none" stroke="${CYAN}" stroke-width="1.2"/>`
        + `<ellipse cx="0" cy="-16" rx="40" ry="14" fill="none" stroke="${CYAN}" stroke-width="1.2"/>` + tube('M0 -56V24M-40 -16H40M-34 -37H34M-34 5H34', CYAN, 1.2), 0.7)
      + [[-22, -34], [14, -40], [26, -12], [-8, -8], [-26, 6], [10, 14]].map(([x, y]) => ring(x, y, 5.5, r && x === 26 ? RED : GREEN, 1, 'none') + dot(x, y, 2.5, r && x === 26 ? RED : GREEN)).join('')
      + solid('M-40 50H34L46 62L34 74H-40Z', YELLOW, 2.5) + ring(-31, 62, 3, YELLOW, 1.5) + label(4, 66, r ? 'v1.0-rc' : 'v1.0.0', YELLOW, 10)
      + check(-58, -80, 6, CYAN) + check(58, -80, 6, CYAN) + check(-58, 80, 6, CYAN) + (r ? cross(58, 80, 6) : check(58, 80, 6, CYAN)),
  },
];

// The minor arcana are pip cards, as in the old decks: as many suit emblems as
// the card's number, and an insignia of rank over one large emblem for the
// courts. The emblems: a Wand is a branch with a commit on it, a Cup is a mug,
// a Sword is a sword, a Pentacle is a coin. Reversed, every emblem is turned
// over and goes red: the cup spills, the sword points down.
const EMBLEMS = [
  { colors: [ORANGE, YELLOW], draw: (c, c2) => tube('M0 12V-9', c, 2) + ring(0, -12, 3, c, 2, BACK) + tube('M0 5Q8 3 8 -3', c, 1.5) + ring(8, -6, 2.5, c2, 1.5, BACK) },
  { colors: [CYAN, PINK], draw: (c, c2) => solid('M-7 -6H7V3Q7 10 0 10Q-7 10 -7 3Z', c, 2) + tube('M7 -3Q13 -3 13 1.5Q13 6 6.5 5.5', c, 1.5) + tube('M-3 -9q2 -2 0 -4M2 -9q2 -2 0 -4', c2, 1.2) },
  { colors: [VIOLET, WHITE], draw: (c, c2) => solid('M0 -13L3 -9V4H-3V-9Z', c2, 1.5) + tube('M-7 4H7', c, 2) + tube('M0 4V10', c, 2) + dot(0, 12, 1.8, c) },
  { colors: [GREEN, YELLOW], draw: (c, c2) => ring(0, 0, 10, c, 2, BACK) + tube(starPath(0, 0, 7, 5, 0.4), c2, 1.2) },
];
// Where the emblems stand for Ace to Ten: [scale, ...[x, y]].
const SIX = [[-30, -54], [30, -54], [-30, 0], [30, 0], [-30, 54], [30, 54]];
const EIGHT = [[-30, -63], [30, -63], [-30, -21], [30, -21], [-30, 21], [30, 21], [-30, 63], [30, 63]];
const PIPS = [
  [3.6, [0, 0]],
  [2, [0, -44], [0, 44]],
  [1.7, [0, -58], [0, 0], [0, 58]],
  [1.7, [-30, -44], [30, -44], [-30, 44], [30, 44]],
  [1.6, [-30, -50], [30, -50], [0, 0], [-30, 50], [30, 50]],
  [1.5, ...SIX],
  [1.4, ...SIX, [0, -27]],
  [1.4, ...SIX, [0, -27], [0, 27]],
  [1.2, ...EIGHT, [0, 0]],
  [1.2, ...EIGHT, [0, -42], [0, 42]],
];
// Page, Knight, Queen, King: a pennant, a pair of chevrons, a crown, a crown with a cross.
const INSIGNIA = [
  (c) => tube('M-10 12V-12', c) + solid('M-10 -12L12 -6L-10 0Z', c),
  (c) => tube('M-13 10L0 -4L13 10M-13 -2L0 -16L13 -2', c, 2.5),
  (c) => solid('M-14 8V-6L-7 2L0 -10L7 2L14 -6V8Z', c) + dot(0, -14, 2, c),
  (c) => solid('M-18 8V-6L-10 2L-5 -8L0 2L5 -8L10 2L18 -6V8Z', c) + tube('M0 -20V-11M-4 -16H4', c),
];

EMBLEMS.forEach(({ colors, draw }) => {
  for (let rank = 0; rank < 14; rank++) {
    CARDS.push({ colors, scene: (r) => {
      const [c, c2] = r ? [RED, RED] : colors;
      const emblem = (x, y, scale) => turn(x, y, r ? 180 : 0, draw(c, c2), scale);
      if (rank < 10) {
        const [scale, ...places] = PIPS[rank];
        return places.map(([x, y]) => emblem(x, y, scale)).join('');
      }
      return turn(0, -62, r ? 150 : 0, INSIGNIA[rank - 10](r ? RED : colors[1]), 1.3) + emblem(0, 26, 3.2)
        + dim(tube('M-50 -30H50', colors[0], 1), 0.5);
    } });
  }
});

module.exports = { CARDS, BACK };
