'use strict';

// The pictures on the cards. Each major arcanum is a small scene after the
// Rider-Waite-Smith deck, put together from a handful of shared pieces (figure,
// sun, crescent, star, pillar, tower, wing, horse) and drawn inside the card's
// arched window: x from -62 to 62, y from -102 to 78, the ground near y = 50.

const GOLD = '#d9b45a';
const CREAM = '#f3ead7';
const TEAL = '#5fc9b8';
const RED = '#e2605b';
const MUTED = '#9a93b8';
const NIGHT = '#14122b';
const STONE = '#8d88ad';
const DUSK = '#3a3478';
const EARTH = '#2b2757';
const SEA = '#2f6f8a';
const LEAF = '#3f8f7a';
const BLUE = '#4d6fc0';
const VIOLET = '#7a4fb0';
const AMBER = '#c98f3a';
const WOOD = '#8a5a35';

const DEG = Math.PI / 180;
const n = (x) => Number(x.toFixed(1));

const circle = (x, y, r, fill, extra = '') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"${extra}/>`;
const ellipse = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
const poly = (points, fill, extra = '') => `<polygon points="${points}" fill="${fill}"${extra}/>`;
const shape = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const line = (d, stroke, width = 3, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const at = (x, y, body, extra = '') => `<g transform="translate(${x} ${y})${extra}">${body}</g>`;
const outline = (color, width = 1.5) => ` stroke="${color}" stroke-width="${width}"`;

function star(x, y, r, points = 8, fill = GOLD, inner = 0.42) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? r * inner : r;
    const a = (-90 + (i * 180) / points) * DEG;
    out.push(`${n(x + radius * Math.cos(a))},${n(y + radius * Math.sin(a))}`);
  }
  return poly(out.join(' '), fill);
}

function sun(x, y, r, rays = 12, fill = GOLD) {
  return star(x, y, r * 1.75, rays, fill, 0.62) + circle(x, y, r, fill, outline(NIGHT, 1.2));
}

function crescent(x, y, r, fill = CREAM, rotate = 0) {
  const d = `M${n(0.35 * r)} ${n(-0.94 * r)}A${r} ${r} 0 1 0 ${n(0.35 * r)} ${n(0.94 * r)}A${n(0.78 * r)} ${n(0.78 * r)} 0 1 1 ${n(0.35 * r)} ${n(-0.94 * r)}Z`;
  return at(x, y, shape(d, fill), ` rotate(${rotate})`);
}

// A robed figure about 70 tall, standing with its feet at (x, y).
function figure(x, y, { robe = CREAM, head = CREAM, scale = 1, extra = '' } = {}) {
  return at(x, y, shape('M-8 -53Q0 -58 8 -53L16 0H-16Z', robe) + circle(0, -62, 7, head) + extra, ` scale(${scale})`);
}

function pillar(x, top, bottom, fill, cap = fill) {
  return rect(x - 6, top, 12, bottom - top, fill) + rect(x - 9, top - 5, 18, 5, cap) + rect(x - 9, bottom - 4, 18, 4, cap);
}

function tower(x, base, w, h, fill) {
  const left = x - w / 2;
  const tooth = w / 5;
  return rect(left, base - h, w, h, fill)
    + [0, 2, 4].map((i) => rect(n(left + i * tooth), base - h - 5, n(tooth), 5, fill)).join('')
    + rect(x - 2, base - h + 8, 4, 7, NIGHT);
}

function wing(direction, fill) {
  const d = direction;
  return shape(`M0 0Q${d * 20} -30 ${d * 38} -14Q${d * 30} -10 ${d * 30} -2Q${d * 22} -2 ${d * 22} 6Q${d * 12} 4 0 12Z`, fill);
}

function horse(x, y, fill = CREAM) {
  return at(x, y, ellipse(0, -18, 22, 9, fill)
    + shape('M14 -22L24 -44L32 -40L36 -30L30 -30L24 -16Z', fill)
    + line('M-16 -12V0M-8 -11V0M10 -11V0M18 -12V0', fill, 3.5)
    + line('M-21 -20Q-30 -14 -27 -4', fill, 2.5));
}

function cup(x, y, fill = GOLD) {
  return at(x, y, shape('M-6 -10H6L4 -2H-4ZM-1.5 -2H1.5V3H-1.5ZM-5 3H5V5H-5Z', fill));
}

const ground = (y, fill = EARTH) => rect(-62, y, 124, 80 - y, fill);
const hills = (fill = DUSK) => shape('M-62 50L-40 22L-22 40L-4 14L16 42L34 26L62 50V80H-62Z', fill);
const lemniscate = (x, y) => at(x, y, line('M0 0C5 -7 15 -7 15 0C15 7 5 7 0 0C-5 -7 -15 -7 -15 0C-15 7 -5 7 0 0', GOLD, 2.2));
const dark = rect(-62, -102, 124, 182, NIGHT);

const SCENES = [
  /* 0 The Fool */ () => sun(-36, -62, 11)
    + shape('M10 80L34 10L46 34L56 20L62 30V80Z', DUSK)
    + shape('M-62 80V40H14L24 52L30 80Z', EARTH) + line('M-62 40H14L24 52', MUTED, 1.5)
    + figure(-10, 40, { robe: GOLD, extra: line('M4 -44L-22 -66', WOOD, 2.5) + circle(-25, -69, 7, RED) + line('M6 -40L18 -52', CREAM) + star(20, -55, 4, 5, CREAM) })
    + shape('M2 40L5 31L9 34L15 32L13 40Z', CREAM),
  /* 1 The Magician */ () => lemniscate(0, -72)
    + figure(0, 50, { robe: RED, extra: shape('M-3 -53H3L5 0H-5Z', CREAM) + line('M7 -46L20 -70', CREAM) + line('M20 -78V-62', GOLD) + line('M-7 -46L-20 -26', CREAM) })
    + rect(-46, 22, 92, 6, WOOD) + line('M-40 28V50M40 28V50', WOOD, 4)
    + cup(-34, 17) + circle(-13, 15, 6, GOLD) + star(-13, 15, 4, 5, NIGHT)
    + line('M12 20V2M7 7H17', CREAM, 2.5) + line('M32 20V0', GOLD, 3.5)
    + [-52, -30, 28, 50].map((x) => circle(x, 60, 3.5, RED)).join('') + [-41, 39].map((x) => circle(x, 66, 3.5, CREAM)).join(''),
  /* 2 The High Priestess */ () => rect(-38, -58, 76, 108, VIOLET)
    + [[-22, -40], [0, -44], [22, -40], [-12, -22], [12, -22], [-26, -6], [26, -6]].map(([x, y]) => circle(x, y, 3.5, RED)).join('')
    + pillar(-46, -62, 52, NIGHT, STONE) + pillar(46, -62, 52, CREAM, STONE)
    + ground(50)
    + figure(0, 52, { robe: BLUE, extra: shape('M-5 -53H5L8 0H-8Z', CREAM) + circle(0, -74, 5, CREAM) + line('M-9 -74Q-9 -82 -3 -80M9 -74Q9 -82 3 -80', CREAM, 2) + rect(-7, -36, 14, 7, CREAM) })
    + crescent(8, 60, 9, GOLD, -100),
  /* 3 The Empress */ () => [[-44, -6, 16], [-18, -16, 18], [14, -14, 18], [42, -4, 16]].map(([x, y, r]) => circle(x, y, r, LEAF)).join('')
    + ground(44, '#2f5f5a')
    + rect(-18, 6, 36, 40, RED, ' rx="4"')
    + figure(0, 52, { robe: CREAM, extra: [[-6, -34], [5, -24], [-3, -12], [8, -40], [-8, -20]].map(([x, y]) => circle(x, y, 2, RED)).join('')
      + [-12, -6, 0, 6, 12].map((x) => star(x, -73 - (36 - x * x / 4) / 9, 2.6, 5, GOLD)).join('')
      + line('M9 -44L20 -64', CREAM) + circle(21, -67, 4, GOLD) })
    + shape('M-40 44C-52 30 -34 24 -40 34C-46 24 -28 30 -40 44Z', MUTED)
    + [-54, -46, 30, 38, 46, 54].map((x) => line(`M${x} 78V56`, GOLD, 1.5) + ellipse(x, 53, 2, 5, GOLD)).join(''),
  /* 4 The Emperor */ () => shape('M-62 50L-44 4L-28 30L-8 -8L12 28L32 -2L62 46V80H-62Z', '#a8483f')
    + ground(52, '#7d3a36')
    + rect(-24, -42, 48, 98, STONE) + circle(-24, -42, 7, GOLD) + circle(24, -42, 7, GOLD)
    + figure(0, 56, { robe: RED, extra: shape('M-6 -56L0 -40L6 -56Z', CREAM) + poly('-8,-68 -8,-78 -4,-72 0,-80 4,-72 8,-78 8,-68', GOLD)
      + line('M-9 -44L-20 -30', CREAM) + line('M-20 -52V-14', GOLD, 2.5) + circle(-20, -57, 4, 'none', outline(GOLD, 2.5))
      + line('M9 -44L18 -32', CREAM) + circle(20, -28, 5, GOLD) }),
  /* 5 The Hierophant */ () => pillar(-46, -62, 46, STONE) + pillar(46, -62, 46, STONE)
    + ground(46)
    + figure(0, 44, { robe: RED, extra: shape('M-3 -53H3L4 0H-4Z', CREAM) + rect(-7, -74, 14, 5, GOLD) + rect(-5.5, -80, 11, 5, GOLD) + rect(-4, -86, 8, 5, GOLD)
      + line('M9 -46L18 -62', CREAM) + line('M-9 -46L-22 -38', CREAM)
      + line('M-24 -84V-4M-30 -74H-18M-32 -66H-16M-34 -58H-14', GOLD, 2.5) })
    + shape('M-36 78A14 18 0 0 1 -8 78Z', TEAL) + circle(-22, 54, 7, CREAM)
    + shape('M8 78A14 18 0 0 1 36 78Z', BLUE) + circle(22, 54, 7, CREAM)
    + line('M-5 76L5 64M5 76L-5 64', GOLD, 2.5),
  /* 6 The Lovers */ () => sun(0, -64, 15)
    + at(0, -40, wing(-1, VIOLET) + wing(1, VIOLET)) + circle(0, -40, 7, CREAM) + shape('M-9 -32Q0 -38 9 -32L12 -20H-12Z', RED)
    + ellipse(0, -18, 40, 7, CREAM, ' opacity="0.9"')
    + shape('M-14 50L0 14L14 50Z', DUSK)
    + line('M-46 50V14', WOOD, 4) + circle(-46, 8, 13, LEAF) + [[-52, 4], [-42, 2], [-46, 13]].map(([x, y]) => circle(x, y, 2.5, RED)).join('')
    + line('M46 50V14', WOOD, 4) + [[40, 8], [46, 2], [52, 8]].map(([x, y]) => shape(`M${x} ${y + 8}Q${x - 6} ${y} ${x} ${y - 9}Q${x + 6} ${y} ${x} ${y + 8}Z`, RED)).join('')
    + ground(50, '#2f5f5a')
    + figure(-24, 58, { robe: CREAM, scale: 0.85 }) + figure(24, 58, { robe: GOLD, scale: 0.85 }),
  /* 7 The Chariot */ () => tower(-46, 30, 12, 26, DUSK) + tower(-30, 30, 10, 18, DUSK) + tower(44, 30, 12, 22, DUSK)
    + ground(30)
    + line('M-28 -52V6M28 -52V6', STONE, 3)
    + figure(0, 20, { robe: TEAL, extra: star(0, -74, 6, 8, GOLD) + crescent(-12, -50, 5, CREAM, 180) + crescent(12, -50, 5, CREAM) })
    + rect(-32, -66, 64, 14, BLUE, ' rx="3"') + [-22, -8, 6, 20].map((x) => star(x, -59, 3.5, 6, CREAM)).join('')
    + rect(-32, -6, 64, 38, STONE, ' rx="3"') + ellipse(0, 10, 7, 7, GOLD) + shape('M-7 10Q-18 2 -26 10Q-18 12 -7 14ZM7 10Q18 2 26 10Q18 12 7 14Z', GOLD)
    + circle(-40, 30, 13, 'none', outline(GOLD, 3.5)) + circle(40, 30, 13, 'none', outline(GOLD, 3.5))
    + shape('M-30 70L-22 38L-12 44L-8 70Z', NIGHT, outline(CREAM, 1.5)) + circle(-20, 36, 6, NIGHT, outline(CREAM, 1.5))
    + shape('M8 70L12 44L22 38L30 70Z', CREAM) + circle(20, 36, 6, CREAM),
  /* 8 Strength */ () => hills() + ground(50, '#2f5f5a') + lemniscate(-20, -44)
    + figure(-20, 54, { robe: CREAM, extra: [-7, 0, 7].map((x) => circle(x, -30, 2.5, RED)).join('') + line('M8 -46L30 -36M6 -40L28 -24', CREAM) })
    + ellipse(22, 40, 24, 13, AMBER) + line('M44 38Q56 30 52 18', AMBER, 3) + line('M6 46V56M16 50V58M30 50V58M40 46V56', AMBER, 4)
    + star(16, 18, 21, 14, AMBER, 0.72) + circle(16, 18, 10, GOLD) + circle(12, 16, 1.5, NIGHT) + circle(20, 16, 1.5, NIGHT) + shape('M13 22H19L16 26Z', NIGHT),
  /* 9 The Hermit */ () => shape('M-62 80V52L-30 34L-8 46L20 28L62 56V80Z', '#cfcbe6')
    + circle(24, -34, 22, GOLD, ' opacity="0.18"')
    + shape('M-12 -30Q-2 -52 10 -30L18 44H-20Z', STONE) + shape('M-6 -28Q0 -40 7 -28Q4 -18 0 -18Q-4 -18 -6 -28Z', CREAM) + shape('M-4 -22Q0 -6 5 -22Z', CREAM)
    + line('M8 -14L22 -22', STONE, 4) + line('M24 -46V-42', GOLD, 2) + shape('M17 -42H31L28 -22H20Z', NIGHT, outline(GOLD, 2)) + star(24, -32, 7, 6, GOLD, 0.5)
    + line('M-22 -44V46', GOLD, 3),
  /* 10 Wheel of Fortune */ () => [[-44, -60], [44, -60], [-44, 58], [44, 58]].map(([x, y]) => ellipse(x, y, 16, 10, MUTED, ' opacity="0.55"') + star(x, y, 5, 4, CREAM)).join('')
    + circle(0, -8, 44, AMBER) + circle(0, -8, 33, DUSK) + circle(0, -8, 20, NIGHT)
    + line([0, 45, 90, 135].map((a) => `M${n(33 * Math.cos(a * DEG))} ${n(-8 + 33 * Math.sin(a * DEG))}L${n(-33 * Math.cos(a * DEG))} ${n(-8 - 33 * Math.sin(a * DEG))}`).join(''), GOLD, 2)
    + circle(0, -8, 6, GOLD) + [[0, -46], [38, -8], [0, 30], [-38, -8]].map(([x, y]) => star(x, y, 4, 4, NIGHT)).join('')
    + shape('M-12 -52L0 -76L12 -52Z', BLUE) + circle(0, -74, 6, CREAM) + line('M8 -58L18 -72', CREAM, 2.5)
    + line('M-52 -34Q-42 -24 -52 -14Q-62 -4 -52 6Q-44 14 -50 24', GOLD, 3.5)
    + shape('M44 18Q58 6 52 -14Q50 -22 44 -22Q50 -10 40 6Z', RED),
  /* 11 Justice */ () => rect(-38, -52, 76, 100, VIOLET) + pillar(-46, -62, 50, STONE) + pillar(46, -62, 50, STONE)
    + ground(50)
    + figure(0, 54, { robe: RED, extra: rect(-6, -76, 12, 7, GOLD) + rect(-2, -73, 4, 4, BLUE)
      + line('M9 -46L20 -40', CREAM) + line('M20 -92V-30', CREAM, 3) + line('M14 -44H26', GOLD, 3)
      + line('M-9 -46L-22 -50', CREAM) + line('M-22 -50V-58M-36 -58H-8', GOLD, 2)
      + line('M-36 -58L-41 -44H-31ZM-8 -58L-13 -44H-3Z', GOLD, 1.5) }),
  /* 12 The Hanged Man */ () => ground(56, '#2f5f5a')
    + line('M0 -76V60', WOOD, 7) + line('M-44 -76H44', WOOD, 7)
    + [[-36, -84], [-20, -68], [22, -84], [38, -68], [-44, -66]].map(([x, y]) => ellipse(x, y, 6, 3, LEAF)).join('')
    + circle(0, 34, 14, GOLD, ' opacity="0.9"')
    + line('M-2 -70V-34', CREAM, 3.5) + line('M4 -34L-10 -44L2 -52', RED, 4)
    + shape('M-8 -34H8L11 10Q0 16 -11 10Z', BLUE) + line('M-9 -8L-18 -20H-2M9 -8L18 -20H2', BLUE, 3.5)
    + circle(0, 22, 7, CREAM) + line('M-4 -34H6', RED, 4),
  /* 13 Death */ () => tower(24, 38, 12, 30, DUSK) + tower(50, 38, 12, 30, DUSK) + sun(37, 36, 9)
    + ground(38) + line('M-62 46Q-30 40 0 48Q30 56 62 46', SEA, 4)
    + line('M-14 -78V-6', CREAM, 2) + rect(-14, -78, 30, 26, NIGHT, outline(CREAM, 1.5)) + star(1, -65, 8, 5, CREAM, 0.5)
    + horse(-4, 62)
    + shape('M-14 16Q-6 -14 4 16L8 40H-18Z', NIGHT, outline(MUTED, 1.5)) + circle(-5, -14, 8, CREAM) + circle(-8, -15, 1.8, NIGHT) + circle(-2, -15, 1.8, NIGHT) + line('M-8 -9H-2', NIGHT, 1.2)
    + shape('M36 80A12 16 0 0 1 60 80Z', GOLD) + circle(48, 58, 6, CREAM),
  /* 14 Temperance */ () => sun(-36, 6, 9) + shape('M-62 50L-48 22L-36 34L-22 16L-10 50Z', DUSK)
    + ground(50, '#2f5f5a') + shape('M-62 80V56Q-36 48 -12 60L-4 80Z', SEA)
    + at(0, -18, at(-9, 0, wing(-1, RED), ' scale(1.25)') + at(9, 0, wing(1, RED), ' scale(1.25)'))
    + circle(0, -16, 12, GOLD, ' opacity="0.85"')
    + figure(0, 56, { robe: CREAM, extra: shape('M-5 -44H5L0 -36Z', GOLD) + line('M-9 -46L-20 -34M9 -46L20 -24', CREAM) })
    + cup(-22, 26) + at(22, 40, cup(0, 0), ' rotate(180)') + line('M-18 22Q2 20 20 32', TEAL, 2.2, ' stroke-dasharray="3 3"')
    + [44, 52].map((x) => line(`M${x} 78V56`, LEAF, 2) + shape(`M${x} 56Q${x - 6} 48 ${x} 42Q${x + 6} 48 ${x} 56Z`, VIOLET)).join(''),
  /* 15 The Devil */ () => dark
    + line(`M${[0, 2, 4, 1, 3, 0].map((i) => `${n(13 * Math.cos((90 + i * 72) * DEG))} ${n(-82 + 13 * Math.sin((90 + i * 72) * DEG))}`).join('L')}`, CREAM, 1.5)
    + shape('M-10 -38L-56 -58L-46 -40L-52 -24L-38 -30L-30 -16L-10 -24Z', STONE) + shape('M10 -38L56 -58L46 -40L52 -24L38 -30L30 -16L10 -24Z', STONE)
    + shape('M-14 -36Q0 -44 14 -36L18 20H-18Z', WOOD) + circle(0, -48, 10, AMBER)
    + line('M-7 -55Q-16 -62 -12 -72M7 -55Q16 -62 12 -72', GOLD, 3) + circle(-4, -49, 1.8, NIGHT) + circle(4, -49, 1.8, NIGHT) + shape('M-4 -42H4L0 -34Z', NIGHT)
    + line('M14 -30L26 -44', WOOD, 4) + line('M-14 -30L-28 -8', WOOD, 4) + line('M-30 -8V8', GOLD, 2.5) + shape('M-30 22Q-38 14 -30 6Q-22 14 -30 22Z', RED)
    + rect(-22, 20, 44, 22, NIGHT, outline(MUTED, 1.5)) + circle(0, 31, 4, 'none', outline(MUTED, 2))
    + line('M-4 31Q-20 50 -32 28M4 31Q20 50 32 28', MUTED, 1.5, ' stroke-dasharray="2 2.5"')
    + figure(-36, 70, { robe: CREAM, scale: 0.62 }) + figure(36, 70, { robe: CREAM, scale: 0.62 }),
  /* 16 The Tower */ () => dark
    + [[-44, -60], [-36, -20], [-48, 10], [40, -8], [48, 26], [-28, -84], [34, 40]].map(([x, y]) => shape(`M${x} ${y}q4 5 0 9q-4 -4 0 -9Z`, GOLD)).join('')
    + shape('M-40 80L-20 40H20L44 80Z', DUSK)
    + shape('M-13 -44H13L17 44H-17Z', STONE) + rect(-17, -52, 34, 10, STONE)
    + [[-6, -26], [5, -6], [-5, 14]].map(([x, y]) => rect(x - 3, y, 6, 10, NIGHT) + shape(`M${x - 4} ${y + 2}Q${x - 9} ${y - 8} ${x} ${y - 16}Q${x + 9} ${y - 8} ${x + 4} ${y + 2}Z`, RED)).join('')
    + shape('M-12 -52Q-16 -66 -4 -74Q-6 -64 2 -70Q0 -60 10 -64Q8 -56 12 -52Z', RED)
    + at(26, -70, poly('-12,6 -12,-6 -6,0 0,-8 6,0 12,-6 12,6', GOLD), ' rotate(28)')
    + poly('62,-102 30,-74 42,-70 14,-48 22,-62 10,-64 46,-102', GOLD)
    + at(-38, 22, figure(0, 0, { robe: BLUE, scale: 0.55 }), ' rotate(150)') + at(40, 14, figure(0, 0, { robe: RED, scale: 0.55 }), ' rotate(-160)'),
  /* 17 The Star */ () => star(0, -62, 22, 8, GOLD)
    + [[-36, -72], [-46, -40], [-28, -20], [36, -72], [46, -40], [28, -20], [0, -22]].map(([x, y]) => star(x, y, 7, 8, CREAM)).join('')
    + shape('M-10 80L8 36H62V80Z', '#2f5f5a') + shape('M-62 80V46H-2L-14 80Z', SEA)
    + line('M-54 56H-40M-34 64H-18M-52 70H-36', TEAL, 1.5)
    + line('M40 36V14', WOOD, 3) + circle(40, 8, 10, LEAF) + circle(44, -4, 3, RED)
    + shape('M-6 6Q4 -2 12 6L22 40H-2L-10 28Z', CREAM) + circle(4, -8, 7, CREAM) + line('M-2 -6Q-8 4 -4 12', GOLD, 3)
    + line('M-2 14L-20 22', CREAM, 3.5) + shape('M-28 18L-18 18L-20 28L-26 28Z', RED) + line('M-24 30V46', TEAL, 2, ' stroke-dasharray="3 2.5"')
    + line('M12 14L28 24', CREAM, 3.5) + shape('M24 22L34 22L32 32L26 32Z', RED) + line('M30 34V42', TEAL, 2, ' stroke-dasharray="3 2.5"'),
  /* 18 The Moon */ () => star(0, -58, 34, 16, GOLD, 0.7) + circle(0, -58, 21, CREAM) + crescent(-2, -58, 21, GOLD, 180)
    + [[-30, -22], [-14, -14], [16, -16], [32, -24], [0, -8]].map(([x, y]) => shape(`M${x} ${y}q4 5 0 9q-4 -4 0 -9Z`, GOLD)).join('')
    + shape('M-62 44L-30 30L0 40L30 30L62 44V80H-62Z', EARTH)
    + tower(-46, 36, 14, 40, STONE) + tower(46, 36, 14, 40, STONE)
    + shape('M-8 62Q-14 50 0 44Q10 38 2 30H8Q18 38 8 46Q-2 52 8 62Z', GOLD, ' opacity="0.7"')
    + shape('M-34 56V46L-30 32L-27 38L-22 34L-20 46V56Z', CREAM) + shape('M20 56V46L22 34L27 38L30 32L34 46V56Z', AMBER)
    + rect(-62, 62, 124, 18, SEA) + ellipse(0, 70, 7, 5, RED) + line('M-6 67L-12 62M6 67L12 62', RED, 2.5),
  /* 19 The Sun */ () => sun(0, -52, 24, 16) + circle(-8, -55, 2, NIGHT) + circle(8, -55, 2, NIGHT) + line('M-8 -44Q0 -38 8 -44', NIGHT, 1.8)
    + [-48, -30, 30, 48].map((x) => line(`M${x} 14V-6`, LEAF, 2.5) + star(x, -10, 9, 10, GOLD, 0.6) + circle(x, -10, 4, WOOD)).join('')
    + rect(-62, 12, 124, 16, STONE) + line('M-62 20H62M-46 12V20M-22 12V20M2 12V20M26 12V20M50 12V20M-34 20V28M-10 20V28M14 20V28M38 20V28', NIGHT, 1.2)
    + ground(28, '#2f5f5a')
    + line('M-22 28V-30', WOOD, 2.5) + shape('M-22 -30Q-40 -38 -50 -28Q-40 -18 -52 -6Q-36 -2 -22 -8Z', RED)
    + horse(6, 70)
    + figure(4, 50, { robe: CREAM, scale: 0.6, extra: line('M-9 -46L-26 -56M9 -46L26 -56', CREAM, 4) + star(0, -72, 5, 6, RED) }),
  /* 20 Judgement */ () => ellipse(-30, -40, 30, 12, MUTED) + ellipse(28, -42, 32, 13, MUTED) + ellipse(0, -34, 34, 10, CREAM)
    + at(0, -62, at(-8, 0, wing(-1, RED), ' scale(1.3)') + at(8, 0, wing(1, RED), ' scale(1.3)'))
    + shape('M-10 -64Q0 -70 10 -64L14 -38H-14Z', BLUE) + circle(0, -74, 8, CREAM) + shape('M-8 -76Q0 -90 8 -76Q0 -82 -8 -76Z', GOLD)
    + shape('M-4 -70L-40 -18L-28 -12L-2 -66Z', GOLD) + rect(-26, -40, 22, 20, CREAM) + line('M-15 -38V-22M-23 -30H-7', RED, 3)
    + shape('M-62 30L-44 14L-28 28L-8 12L10 28L30 12L62 30V46H-62Z', '#cfcbe6') + rect(-62, 44, 124, 36, SEA)
    + [[-36, STONE], [0, STONE], [36, STONE]].map(([x, fill]) => rect(x - 13, 58, 26, 22, fill) + figure(x, 70, { robe: CREAM, scale: 0.55, extra: line('M-9 -46L-20 -66M9 -46L20 -66', CREAM, 4) })).join(''),
  /* 21 The World */ () => ellipse(0, -4, 30, 46, 'none', outline(LEAF, 9))
    + ellipse(0, -4, 30, 46, 'none', ` stroke="${TEAL}" stroke-width="2" stroke-dasharray="4 5"`)
    + line('M-6 -54L6 -46M6 -54L-6 -46M-6 38L6 46M6 38L-6 46', RED, 3)
    + figure(0, 26, { robe: CREAM, scale: 0.85, extra: line('M-12 -50Q0 -30 10 -8', VIOLET, 5) + line('M-9 -46L-22 -30M9 -46L22 -58', CREAM) + line('M-22 -38V-22M22 -66V-50', GOLD, 2.5) })
    + circle(-47, -58, 7, CREAM) + shape('M-55 -48Q-47 -53 -39 -48L-41 -42H-53Z', BLUE)
    + shape('M38 -50L47 -64L56 -50L50 -52L47 -42L44 -52Z', GOLD)
    + circle(-46, 62, 9, AMBER) + line('M-53 56Q-57 49 -51 47M-39 56Q-35 49 -41 47', CREAM, 2.5)
    + star(46, 62, 12, 12, AMBER, 0.7) + circle(46, 62, 6.5, GOLD),
];

// Faint stars behind a scene, placed by a small generator seeded with the card number.
function sky(number) {
  let state = number * 7919 + 17;
  const next = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
  let out = '';
  for (let i = 0; i < 14; i++) out += circle(n(-58 + next() * 116), n(-98 + next() * 120), n(0.6 + next() * 0.9), CREAM, ` opacity="${n(0.25 + next() * 0.45)}"`);
  return out;
}

function scene(number) {
  return sky(number) + SCENES[number]();
}

module.exports = { scene };
