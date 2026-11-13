'use strict';

// Drawings: tarot cards, hexagrams, the chart wheel and the full reading.
// Everything is plain SVG with system fonts, so the files render anywhere an
// <img> does.

const { BODIES, SIGNS } = require('./ephemeris');
const { DECK } = require('./tarot');
const { hexagram: lookupHexagram } = require('./iching');

const COLOR = {
  night: '#14122b', panel: '#1d1a3d', gold: '#d9b45a', cream: '#f3ead7', muted: '#9a93b8', good: '#5fc9b8', bad: '#e2605b',
};
const ELEMENTS = ['#e2605b', '#8fbf6a', '#e9d27a', '#6aa8e0']; // fire, earth, air, water, repeating from Aries
const SERIF = "Georgia, 'Times New Roman', serif";
// U+FE0E asks for the text glyph where a platform would otherwise show an emoji.
const TEXT_STYLE = '︎';
const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆',
};
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV',
  'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const CARD_W = 180;
const CARD_H = 300;
const HEX_W = 84;
const HEX_H = 84;

const DEG = Math.PI / 180;
const n = (x) => Number(x.toFixed(1));

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function text(x, y, content, { size = 14, fill = COLOR.cream, anchor = 'middle', weight = 'normal', spacing = 0, opacity = 1 } = {}) {
  return `<text x="${n(x)}" y="${n(y)}" font-family="${SERIF}" font-size="${size}" font-weight="${weight}" fill="${fill}" `
    + `text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}">${esc(content)}</text>`;
}

function points(count, radius, { start = -90, inner } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = inner !== undefined && i % 2 ? inner : radius;
    const a = (start + (i * 360) / count) * DEG;
    out.push(`${n(r * Math.cos(a))},${n(r * Math.sin(a))}`);
  }
  return out;
}

function rays(count, from, to) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = ((i * 360) / count) * DEG;
    d += `M${n(from * Math.cos(a))} ${n(from * Math.sin(a))}L${n(to * Math.cos(a))} ${n(to * Math.sin(a))}`;
  }
  return `<path d="${d}"/>`;
}

const LEMNISCATE = 'M0 0C12 -16 34 -16 34 0C34 16 12 16 0 0C-12 -16 -34 -16 -34 0C-34 16 -12 16 0 0';
const CRESCENT = '<path d="M10 -30A32 32 0 1 0 10 30A25 25 0 1 1 10 -30Z"/>';
const pentagram = [0, 2, 4, 1, 3].map((i) => points(5, 42, { start: 90 })[i]).join(' ');

// One emblem per major arcanum, drawn inside a 100 by 100 box centred on the origin.
const EMBLEMS = [
  /* Fool */ '<circle cx="-6" cy="-4" r="24"/><circle cx="32" cy="-36" r="5" fill="currentColor"/><path d="M-48 40H14V54"/>',
  /* Magician */ `<path d="${LEMNISCATE}" transform="translate(0 -30)"/><path d="M0 -8V44M-30 44H30"/>`,
  /* High Priestess */ `<path d="M-42 -44V44M42 -44V44M-48 -44H-36M36 -44H48M-48 44H-36M36 44H48"/><g transform="scale(0.72)">${CRESCENT}</g>`,
  /* Empress */ '<circle cy="-14" r="22"/><path d="M0 8V46M-16 28H16"/>',
  /* Emperor */ '<path d="M-34 22V-16L-17 6L0 -26L17 6L34 -16V22Z"/><path d="M-34 34H34"/>',
  /* Hierophant */ '<path d="M0 -46V46M-12 -30H12M-22 -12H22M-32 6H32"/>',
  /* Lovers */ '<circle cx="-13" r="25"/><circle cx="13" r="25"/>',
  /* Chariot */ `<path d="M-34 -42H34V-2H-34Z"/><polygon points="${points(8, 13, { inner: 5 }).join(' ')}" transform="translate(0 -22)"/><circle cx="-22" cy="24" r="16"/><circle cx="22" cy="24" r="16"/>`,
  /* Strength */ `<path d="${LEMNISCATE}" transform="translate(0 -32)"/><g transform="translate(0 20)"><circle r="14"/>${rays(12, 19, 27)}</g>`,
  /* Hermit */ '<path d="M0 -48V-36M-16 -36H16L24 34H-24Z"/><path d="M0 -20L13 3H-13ZM0 16L13 -7H-13Z"/>',
  /* Wheel of Fortune */ `<circle r="42"/><circle r="9"/>${rays(8, 9, 42)}`,
  /* Justice */ '<path d="M0 -46V46M-10 34H10M-36 -28H36M-36 -28L-47 2H-25ZM36 -28L25 2H47Z"/>',
  /* Hanged Man */ '<path d="M-36 -44H36M0 -44V-22M-14 -22H14L0 12Z"/><circle cy="24" r="10"/>',
  /* Death */ '<path d="M-22 46L12 -40"/><path d="M12 -40C40 -46 52 -14 38 8C40 -12 30 -28 12 -40Z"/><path d="M-44 46H30"/>',
  /* Temperance */ '<path d="M-44 -40H-12L-28 -12ZM12 14H44L28 42Z"/><path d="M-28 -12C-28 12 28 -10 28 14" stroke-dasharray="4 4"/>',
  /* Devil */ `<polygon points="${pentagram}"/>`,
  /* Tower */ '<path d="M-18 46V-20H18V46M-24 -20V-32H-12V-26H12V-32H24V-20Z"/><rect x="-5" y="4" width="10" height="14"/><path d="M48 -50L32 -38L40 -34L26 -22"/>',
  /* Star */ `<polygon points="${points(16, 30, { inner: 11 }).join(' ')}"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${n(44 * Math.cos((i * 360 / 7 - 90) * DEG))}" cy="${n(44 * Math.sin((i * 360 / 7 - 90) * DEG))}" r="2.5" fill="currentColor"/>`).join('')}`,
  /* Moon */ `<g transform="translate(0 -8)">${CRESCENT}</g><path d="M-16 34V44M-2 38V48M12 34V44"/>`,
  /* Sun */ `<circle r="20"/>${rays(12, 28, 46)}`,
  /* Judgement */ '<path d="M-46 -24H6L36 -44V2L6 -18H-46Z"/><path d="M-24 4V46M-24 8H12V34H-24M-6 12V30M-16 21H4"/>',
  /* World */ '<ellipse rx="28" ry="42"/><circle r="6"/><circle cx="-42" cy="-42" r="3" fill="currentColor"/><circle cx="42" cy="-42" r="3" fill="currentColor"/><circle cx="-42" cy="42" r="3" fill="currentColor"/><circle cx="42" cy="42" r="3" fill="currentColor"/>',
];

// A card as a group at the origin, CARD_W by CARD_H. A reversed card is drawn upside down.
function cardGroup(number, reversed) {
  const body = [
    `<rect width="${CARD_W}" height="${CARD_H}" rx="12" fill="${COLOR.panel}" stroke="${COLOR.gold}" stroke-width="2"/>`,
    `<rect x="9" y="9" width="${CARD_W - 18}" height="${CARD_H - 18}" rx="7" fill="none" stroke="${COLOR.gold}" stroke-width="0.75" opacity="0.6"/>`,
    text(CARD_W / 2, 44, ROMAN[number], { size: 22, fill: COLOR.gold, spacing: 2 }),
    `<g transform="translate(${CARD_W / 2} 146) scale(1.15)" fill="none" stroke="${COLOR.gold}" color="${COLOR.gold}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${EMBLEMS[number]}</g>`,
    text(CARD_W / 2, 264, DECK[number].name.toUpperCase(), { size: 13, spacing: 1 }),
  ].join('');
  return reversed ? `<g transform="rotate(180 ${CARD_W / 2} ${CARD_H / 2})">${body}</g>` : `<g>${body}</g>`;
}

// Six lines, bottom line last. `changing` marks old lines: ○ for yang, × for yin.
function hexagramGroup(lines, changing = []) {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const y = (5 - i) * 14 + 2;
    parts.push(lines[i]
      ? `<rect x="0" y="${y}" width="64" height="8" rx="1.5"/>`
      : `<rect x="0" y="${y}" width="27" height="8" rx="1.5"/><rect x="37" y="${y}" width="27" height="8" rx="1.5"/>`);
    if (!changing[i]) continue;
    parts.push(lines[i]
      ? `<circle cx="76" cy="${y + 4}" r="4" fill="none" stroke="${COLOR.bad}" stroke-width="1.5"/>`
      : `<path d="M72 ${y}L80 ${y + 8}M80 ${y}L72 ${y + 8}" stroke="${COLOR.bad}" stroke-width="1.5"/>`);
  }
  return `<g fill="${COLOR.gold}">${parts.join('')}</g>`;
}

function document(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>\n`;
}

function cardSvg(number, reversed) {
  return document(CARD_W, CARD_H, cardGroup(number, reversed));
}

// Lines of a hexagram from its King Wen number, by searching the 64 line patterns.
function linesOf(number) {
  for (let bits = 0; bits < 64; bits++) {
    const lines = [0, 1, 2, 3, 4, 5].map((i) => (bits >> i) & 1);
    if (lookupHexagram(lines).number === number) return lines;
  }
  throw new Error(`no hexagram ${number}`);
}

function hexagramSvg(number) {
  return document(120, 120, `<rect width="120" height="120" rx="12" fill="${COLOR.panel}" stroke="${COLOR.gold}" stroke-width="2"/>`
    + `<g transform="translate(28 18)">${hexagramGroup(linesOf(number))}</g>`);
}

// Keep labels from overlapping: nudge neighbours apart until each pair is at least `gap` degrees apart.
function spread(longitudes, gap) {
  const items = longitudes.map((lon, index) => ({ index, at: lon })).sort((a, b) => a.at - b.at);
  for (let pass = 0; pass < 50; pass++) {
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      const b = items[(i + 1) % items.length];
      const between = (((b.at - a.at) % 360) + 360) % 360;
      if (items.length > 1 && between < gap) {
        a.at -= (gap - between) / 2;
        b.at += (gap - between) / 2;
      }
    }
  }
  const out = [];
  for (const item of items) out[item.index] = item.at;
  return out;
}

function moonDisc(elongation, r) {
  const waxing = elongation < 180;
  const e = waxing ? elongation : 360 - elongation;
  const k = Math.cos(e * DEG);
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${n(r * Math.abs(k))} ${r} 0 0 ${k > 0 ? 0 : 1} 0 ${-r}Z`;
  return `<circle r="${r}" fill="${COLOR.night}" stroke="${COLOR.muted}"/><path d="${lit}" fill="${COLOR.cream}"${waxing ? '' : ' transform="scale(-1 1)"'}/>`;
}

// The chart wheel: 0° Aries at nine o'clock, signs running counter-clockwise.
// Outer glyphs are the sky now, the inner ring is the natal chart, chords are aspects.
function wheelGroup(reading, cx, cy, R) {
  const at = (lon, r) => [n(cx - r * Math.cos(lon * DEG)), n(cy + r * Math.sin(lon * DEG))];
  const band = R - 34;
  const parts = [`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${COLOR.panel}" stroke="${COLOR.gold}" stroke-width="2"/>`];
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = at(i * 30, R);
    const [x2, y2] = at(i * 30 + 30, R);
    const [x3, y3] = at(i * 30 + 30, band);
    const [x4, y4] = at(i * 30, band);
    parts.push(`<path d="M${x1} ${y1}A${R} ${R} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${band} ${band} 0 0 1 ${x4} ${y4}Z" fill="${ELEMENTS[i % 4]}" opacity="0.16"/>`);
    parts.push(`<path d="M${x1} ${y1}L${x4} ${y4}" stroke="${COLOR.gold}" stroke-width="0.75" opacity="0.7"/>`);
    const [gx, gy] = at(i * 30 + 15, R - 17);
    // Abbreviations, not the Unicode sign glyphs: many renderers replace those with colour emoji.
    parts.push(text(gx, gy + 4, SIGNS[i].slice(0, 3).toUpperCase(), { size: 11, fill: ELEMENTS[i % 4], spacing: 1.5 }));
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${band}" fill="${COLOR.night}" stroke="${COLOR.gold}" stroke-width="1"/>`);

  const ring = (positions, radius, size, fill) => {
    const labels = spread(BODIES.map((body) => positions[body].lon), size * 0.45);
    BODIES.forEach((body, i) => {
      const p = positions[body];
      const [tx1, ty1] = at(p.lon, radius + size * 0.9 + 6);
      const [tx2, ty2] = at(p.lon, radius + size * 0.9);
      parts.push(`<path d="M${tx1} ${ty1}L${tx2} ${ty2}" stroke="${fill}" stroke-width="1.5"/>`);
      const [x, y] = at(labels[i], radius);
      parts.push(text(x, y + size * 0.35, PLANET_GLYPHS[body] + TEXT_STYLE, { size, fill: p.retrograde ? COLOR.bad : fill }));
    });
  };
  ring(reading.positions, band - 30, 24, COLOR.cream);
  let chords = band - 58;
  if (reading.natal) {
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${band - 56}" fill="none" stroke="${COLOR.muted}" stroke-width="0.75" stroke-dasharray="2 4"/>`);
    ring(reading.natal.positions, band - 80, 17, COLOR.gold);
    chords = band - 102;
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${chords}" fill="none" stroke="${COLOR.muted}" stroke-width="0.75"/>`);
  for (const aspect of reading.aspects) {
    if (aspect.name === 'conjunct') continue;
    const [x1, y1] = at(reading.positions[aspect.a].lon, chords);
    const [x2, y2] = at(reading.positions[aspect.b].lon, chords);
    let stroke = COLOR.muted;
    if (aspect.delta > 0) stroke = COLOR.good;
    else if (aspect.delta < 0) stroke = COLOR.bad;
    parts.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="1.5" opacity="${n(1 - aspect.orb / 8)}"/>`);
  }
  const elongation = (((reading.positions.Moon.lon - reading.positions.Sun.lon) % 360) + 360) % 360;
  parts.push(`<g transform="translate(${cx} ${cy})">${moonDisc(elongation, 20)}</g>`);
  return parts.join('');
}

const VERDICT_COLOR = { auspicious: COLOR.gold, tolerable: COLOR.cream, 'ill-omened': COLOR.bad };

// The whole reading as one picture, 1040 by 600.
function readingSvg(reading, window) {
  const W = 1040;
  const H = 600;
  const left = 572;
  const right = 1012;
  const parts = [`<rect width="${W}" height="${H}" fill="${COLOR.night}"/>`];
  parts.push(text(28, 38, 'DEPLOYSCOPE', { size: 15, fill: COLOR.gold, anchor: 'start', spacing: 4 }));
  parts.push(text(28, 58, `${new Date(reading.time).toISOString().slice(0, 16).replace('T', ' ')} UTC · ${String(reading.seed).slice(0, 12)}`,
    { size: 12, fill: COLOR.muted, anchor: 'start' }));
  parts.push(wheelGroup(reading, 286, 322, 250));

  // Verdict and score gauge, with the pass mark.
  const color = VERDICT_COLOR[reading.verdict];
  parts.push(text(left, 52, reading.verdict.toUpperCase(), { size: 30, fill: color, anchor: 'start', spacing: 3 }));
  parts.push(text(right, 52, `${reading.score}/100`, { size: 24, fill: color, anchor: 'end' }));
  const gauge = right - left;
  parts.push(`<rect x="${left}" y="68" width="${gauge}" height="8" rx="4" fill="${COLOR.panel}"/>`);
  parts.push(`<rect x="${left}" y="68" width="${n((gauge * reading.score) / 100)}" height="8" rx="4" fill="${color}"/>`);
  const mark = n(left + (gauge * reading.failBelow) / 100);
  parts.push(`<path d="M${mark} 62V82" stroke="${COLOR.cream}" stroke-width="1.5"/>`);
  parts.push(text(mark, 96, `required ${reading.failBelow}`, { size: 11, fill: COLOR.muted }));

  // The spread.
  const scale = 0.72;
  const step = (gauge - CARD_W * scale) / 2;
  reading.cards.forEach((card, i) => {
    const x = left + i * step;
    parts.push(`<g transform="translate(${n(x)} 116) scale(${scale})">${cardGroup(card.number, card.reversed)}</g>`);
    const centre = x + (CARD_W * scale) / 2;
    parts.push(text(centre, 352, card.position, { size: 12, fill: COLOR.muted }));
    parts.push(text(centre, 370, `${card.reversed ? 'reversed ' : ''}${card.delta > 0 ? '+' : ''}${card.delta}`,
      { size: 12, fill: card.delta < 0 ? COLOR.bad : COLOR.good }));
  });

  // The hexagram, and the one it changes to.
  const { primary, relating, lines, changing } = reading.hexagram;
  parts.push(`<g transform="translate(${left} 396)">${hexagramGroup(lines, changing)}</g>`);
  parts.push(text(left + 96, 428, `${primary.number} · ${primary.name}`, { size: 16, anchor: 'start' }));
  if (relating) {
    parts.push(text(left + 96, 452, `changing to ${relating.number} · ${relating.name}`, { size: 13, fill: COLOR.muted, anchor: 'start' }));
  } else {
    parts.push(text(left + 96, 452, 'no changing lines', { size: 13, fill: COLOR.muted, anchor: 'start' }));
  }

  // Footer lines: what the reading was personal to, and when to come back.
  const notes = [];
  if (reading.natal) notes.push(`Repository Sun in ${reading.natal.sunSign}, ${reading.natal.age.toFixed(1)} years old`);
  if (reading.release) notes.push(`Release ${reading.release.version} is a ${reading.release.number}`);
  notes.push(`Moon: ${reading.moonPhase}${reading.voidOfCourse ? ', void of course' : ''}`);
  if (reading.verdict === 'ill-omened') {
    notes.unshift(window ? `Next favourable window: ${new Date(window.time).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'No favourable window in the next 14 days');
  }
  notes.forEach((note, i) => {
    const urgent = i === 0 && reading.verdict === 'ill-omened';
    parts.push(text(left, 498 + i * 19, note, { size: urgent ? 14 : 12, fill: urgent ? COLOR.gold : COLOR.muted, anchor: 'start' }));
  });
  parts.push(text(left, 574, 'outer glyphs: the sky now · inner ring: natal chart · red glyph: retrograde', { size: 10, fill: COLOR.muted, anchor: 'start', opacity: 0.8 }));
  return document(W, H, parts.join(''));
}

module.exports = { cardSvg, hexagramSvg, readingSvg, linesOf, SIGNS };
