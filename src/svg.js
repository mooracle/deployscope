'use strict';

// Drawings: tarot cards, hexagrams, the chart wheel and the full reading.
// Everything is plain SVG with system fonts and one blur filter for the neon
// glow, so the files render anywhere an <img> does.

const { BODIES, SIGNS } = require('./ephemeris');
const { DECK } = require('./tarot');
const { hexagram: lookupHexagram } = require('./iching');
const { CARDS, BACK: ARCANA_BACK } = require('./arcana');

const COLOR = {
  night: '#0b0a1a', panel: '#17152f', gold: '#ffe45c', cream: '#f4f7ff', muted: '#948fc0', good: '#5dff9b', bad: '#ff4d6d', cyan: '#22e6ff', pink: '#ff3df2',
};
const ELEMENTS = ['#ff4d6d', '#5dff9b', '#ffe45c', '#22e6ff']; // fire, earth, air, water, repeating from Aries
const SERIF = "Georgia, 'Times New Roman', serif";
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

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
// The glow of a neon tube: the drawing over two blurred copies of itself.
const NEON = '<filter id="ds-neon" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">'
  + '<feGaussianBlur stdDeviation="3" result="wide"/><feGaussianBlur in="SourceGraphic" stdDeviation="1" result="near"/>'
  + '<feMerge><feMergeNode in="wide"/><feMergeNode in="wide"/><feMergeNode in="near"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
  + '<clipPath id="ds-window"><path d="M-70 -84L-62 -92H62L70 -84V84L62 92H-62L-70 84Z"/></clipPath>';

// A card as a group at the origin, CARD_W by CARD_H. A reversed card has its picture turned
// upside down, as it would lie on the table, but its frame and lettering stay readable and
// its caption gives the reversed meaning.
// Every card carries the same definitions, so several cards can share one document.
function cardGroup(number, reversed) {
  const [primary, secondary] = CARDS[number].colors;
  const name = DECK[number].name.toUpperCase();
  const mono = (x, y, content, size, fill, anchor, spacing) => `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" `
    + `font-weight="bold" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}">${esc(content)}</text>`;
  const body = [
    `<defs>${NEON}</defs>`,
    `<rect width="${CARD_W}" height="${CARD_H}" rx="10" fill="${ARCANA_BACK}"/>`,
    `<g filter="url(#ds-neon)">`,
    `<path d="M18 5H162L175 18V282L162 295H18L5 282V18Z" fill="none" stroke="${primary}" stroke-width="2"/>`,
    `<path d="M12 60V24L24 12H60M168 240V276L156 288H120" fill="none" stroke="${secondary}" stroke-width="1.5"/>`,
    mono(22, 37, ROMAN[number], 19, primary, 'start', 2),
    reversed ? mono(158, 36, 'REVERSED', 9, COLOR.cream, 'end', 1)
      : mono(158, 36, `0x${number.toString(16).toUpperCase().padStart(2, '0')}`, 10, secondary, 'end', 1),
    mono(CARD_W / 2, 263, name, name.length > 14 ? 11 : 13, '#f4f7ff', 'middle', name.length > 14 ? 1 : 2),
    `</g>`,
    mono(CARD_W / 2, 281, `// ${reversed ? CARDS[number].reversed : CARDS[number].caption}`, 9, secondary, 'middle', 0.5),
    `<g transform="translate(${CARD_W / 2} 144)"><g clip-path="url(#ds-window)"><g filter="url(#ds-neon)"${reversed ? ' transform="rotate(180)"' : ''}>${CARDS[number].scene()}</g></g>`
      + `<path d="M-70 -84L-62 -92H62L70 -84V84L62 92H-62L-70 84Z" fill="none" stroke="${secondary}" stroke-width="1" opacity="0.6"/></g>`,
  ].join('');
  return `<g>${body}</g>`;
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

// The mark shown in the heading of the pull request comment: a crescent and a star, in neon.
function iconSvg() {
  return document(64, 64, `<defs>${NEON}</defs><rect width="64" height="64" rx="14" fill="${COLOR.night}"/>`
    + `<g filter="url(#ds-neon)" fill="none" stroke-linejoin="round"><path d="M38 11A22 22 0 1 0 53 42A18 18 0 1 1 38 11Z" stroke="${COLOR.cyan}" stroke-width="3"/>`
    + `<polygon points="${points(8, 8, { inner: 3 }).join(' ')}" transform="translate(45 21)" stroke="${COLOR.pink}" stroke-width="2"/></g>`);
}

// The whole deck on one sheet, for the README.
function deckSvg(columns = 6) {
  const gap = 14;
  const rows = Math.ceil(DECK.length / columns);
  const width = columns * (CARD_W + gap) + gap;
  const height = rows * (CARD_H + gap) + gap;
  const cards = DECK.map((_, number) => {
    const inRow = Math.min(columns, DECK.length - Math.floor(number / columns) * columns);
    const x = (width - inRow * (CARD_W + gap) + gap) / 2 + (number % columns) * (CARD_W + gap);
    return `<g transform="translate(${x} ${gap + Math.floor(number / columns) * (CARD_H + gap)})">${cardGroup(number, false)}</g>`;
  });
  return document(width, height, `<rect width="${width}" height="${height}" fill="#05040c"/>${cards.join('')}`);
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
  return document(120, 120, `<defs>${NEON}</defs><rect width="120" height="120" rx="8" fill="${COLOR.night}"/>`
    + `<g filter="url(#ds-neon)"><path d="M14 5H106L115 14V106L106 115H14L5 106V14Z" fill="none" stroke="${COLOR.cyan}" stroke-width="2"/>`
    + `<g transform="translate(28 18)">${hexagramGroup(linesOf(number))}</g></g>`);
}

// Planet and sign glyphs as stroked paths in a 24 by 24 box centred on the
// origin. Font glyphs for these differ from one machine to the next, are
// missing from some fonts, and are swapped for colour emoji by others.
const dot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
const GLYPHS = {
  Sun: `<circle r="8.5"/>${dot(0, 0, 1.8)}`,
  Moon: '<path d="M-4 -9.5A9.5 9.5 0 1 1 -4 9.5A7.5 7.5 0 1 0 -4 -9.5Z"/>',
  Mercury: '<circle cy="-2" r="4.5"/><path d="M-4.5 -11A4.5 4.5 0 0 0 4.5 -11M0 2.5V11M-3.5 7H3.5"/>',
  Venus: '<circle cy="-4.5" r="5.5"/><path d="M0 1V11M-4 6.5H4"/>',
  Mars: '<circle cx="-2.5" cy="2.5" r="6"/><path d="M1.8 -1.8L9.5 -9.5M4 -9.5H9.5V-4"/>',
  Jupiter: '<path d="M-8 -6C-8 -11 -1 -11 -1 -5C-1 -1 -5 2 -9 3H9M4.5 -9V10.5"/>',
  Saturn: '<path d="M-4 -10.5V8M-8 -6H1M-4 -1C-1 -5 5 -4 5 1C5 5 2 6 3 9C3.5 10.5 5.5 10.5 7 9"/>',
  Uranus: '<path d="M-7.5 -10.5V0M7.5 -10.5V0M-7.5 -5H7.5M0 -10.5V3.5"/><circle cy="7.2" r="3.5"/>',
  Neptune: '<path d="M-7.5 -10C-7.5 1 7.5 1 7.5 -10M0 -10.5V11M-4.5 6H4.5"/>',
  Aries: '<path d="M0 10.5V-3C0 -12 -10 -10 -8.5 -3.5M0 -3C0 -12 10 -10 8.5 -3.5"/>',
  Taurus: '<circle cy="4" r="6"/><path d="M-8.5 -10.5C-6 -2 6 -2 8.5 -10.5"/>',
  Gemini: '<path d="M-8 -10C-3 -7.5 3 -7.5 8 -10M-8 10C-3 7.5 3 7.5 8 10M-3.5 -8V8M3.5 -8V8"/>',
  Cancer: '<circle cx="-5.5" cy="-3" r="3"/><circle cx="5.5" cy="3" r="3"/><path d="M-8.5 -3C-8.5 -10 5 -10.5 9.5 -6M8.5 3C8.5 10 -5 10.5 -9.5 6"/>',
  Leo: '<circle cx="-5.5" cy="3.5" r="3.5"/><path d="M-2 3.5C-2 -2 -6.5 -3.5 -6.5 -7C-6.5 -11.5 3.5 -11.5 3.5 -6C3.5 -1 0.5 4 3 8C4.5 10.5 8 10 8.5 7"/>',
  Virgo: '<path d="M-9.5 -8.5V8M-9.5 -5C-9.5 -9.5 -4.5 -9.5 -4.5 -5V8M-4.5 -5C-4.5 -9.5 0.5 -9.5 0.5 -5V8M0.5 -2C5 -8.5 10.5 -2 6 4C4 6.5 0.5 9 -2 11"/>',
  Libra: '<path d="M-9.5 9.5H9.5M-9.5 4H-4C-7.5 -1 -4.5 -8.5 0 -8.5C4.5 -8.5 7.5 -1 4 4H9.5"/>',
  Scorpio: '<path d="M-9.5 -8.5V8M-9.5 -5C-9.5 -9.5 -4.5 -9.5 -4.5 -5V8M-4.5 -5C-4.5 -9.5 0.5 -9.5 0.5 -5V5.5C0.5 9 4 10 8.5 7M5.5 4.5L9 7L6 10.5"/>',
  Sagittarius: '<path d="M-9 9L9 -9M2.5 -9H9V-2.5M-6.5 -0.5L0.5 6.5"/>',
  Capricorn: '<path d="M-9.5 -8.5L-5 4L-1 -8.5V2C-1 9.5 8 10.5 8 5C8 0.5 1.5 0.5 0.5 6C-0.5 9.5 -4 11 -6.5 10"/>',
  Aquarius: '<path d="M-10 -2.5L-6 -6.5L-2 -2.5L2 -6.5L6 -2.5L10 -6.5M-10 6.5L-6 2.5L-2 6.5L2 2.5L6 6.5L10 2.5"/>',
  Pisces: '<path d="M-8 -10.5C-3 -4 -3 4 -8 10.5M8 -10.5C3 -4 3 4 8 10.5M-6.5 0H6.5"/>',
};

function glyph(name, x, y, size, color, weight = 2) {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(size / 24)})" fill="none" stroke="${color}" color="${color}" `
    + `stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</g>`;
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
// Glyphs are the sky now, chords are its aspects, and the gold dots on the
// inner track are the natal chart. The table beside the wheel says the same in words.
function wheelGroup(reading, cx, cy, R) {
  const at = (lon, r) => [n(cx - r * Math.cos(lon * DEG)), n(cy + r * Math.sin(lon * DEG))];
  const band = R - 38;
  const parts = [`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${COLOR.panel}" stroke="${COLOR.cyan}" stroke-width="2"/>`];
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = at(i * 30, R);
    const [x2, y2] = at(i * 30 + 30, R);
    const [x3, y3] = at(i * 30 + 30, band);
    const [x4, y4] = at(i * 30, band);
    parts.push(`<path d="M${x1} ${y1}A${R} ${R} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${band} ${band} 0 0 1 ${x4} ${y4}Z" fill="${ELEMENTS[i % 4]}" opacity="0.16"/>`);
    parts.push(`<path d="M${x1} ${y1}L${x4} ${y4}" stroke="${COLOR.cyan}" stroke-width="1" opacity="0.7"/>`);
    const [gx, gy] = at(i * 30 + 15, R - 19);
    parts.push(glyph(SIGNS[i], gx, gy, 21, ELEMENTS[i % 4]));
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${band}" fill="${COLOR.night}" stroke="${COLOR.cyan}" stroke-width="1"/>`);

  const glyphs = band - 30;
  const labels = spread(BODIES.map((body) => reading.positions[body].lon), 13);
  BODIES.forEach((body, i) => {
    const p = reading.positions[body];
    const color = p.retrograde ? COLOR.bad : COLOR.cream;
    const [tx1, ty1] = at(p.lon, band);
    const [tx2, ty2] = at(p.lon, band - 8);
    parts.push(`<path d="M${tx1} ${ty1}L${tx2} ${ty2}" stroke="${color}" stroke-width="2"/>`);
    const [x, y] = at(labels[i], glyphs);
    parts.push(glyph(body, x, y, 25, color, 2.2));
  });

  const chords = band - 58;
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${chords}" fill="none" stroke="${COLOR.muted}" stroke-width="1"/>`);
  if (reading.natal) {
    for (const body of BODIES) {
      const [x, y] = at(reading.natal.positions[body].lon, chords);
      parts.push(`<circle cx="${x}" cy="${y}" r="${body === 'Sun' ? 6 : 3.5}" fill="${COLOR.gold}" stroke="${COLOR.night}" stroke-width="1.5"/>`);
    }
  }
  for (const aspect of reading.aspects) {
    if (aspect.name === 'conjunct') continue;
    const [x1, y1] = at(reading.positions[aspect.a].lon, chords);
    const [x2, y2] = at(reading.positions[aspect.b].lon, chords);
    let stroke = COLOR.muted;
    if (aspect.delta > 0) stroke = COLOR.good;
    else if (aspect.delta < 0) stroke = COLOR.bad;
    parts.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="2" opacity="${n(1 - aspect.orb / 8)}"/>`);
  }
  const elongation = (((reading.positions.Moon.lon - reading.positions.Sun.lon) % 360) + 360) % 360;
  parts.push(`<g transform="translate(${cx} ${cy})">${moonDisc(elongation, 22)}</g>`);
  return parts.join('');
}

const VERDICT_COLOR = { auspicious: COLOR.good, tolerable: COLOR.gold, 'ill-omened': COLOR.bad };
const signed = (delta) => (delta > 0 ? `+${delta}` : String(delta).replace('-', '−'));
const clip = (content, length) => (content.length > length ? `${content.slice(0, length - 1).trimEnd()}…` : content);
const stamp = (time) => `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

function heading(x, y, content) {
  return text(x, y, content.toUpperCase(), { size: 13, fill: COLOR.cyan, anchor: 'start', spacing: 2.5 });
}

// The whole reading as one picture, 1000 by 836. It is shown scaled down in
// READMEs and comments, so no text is smaller than 13 and the wheel is
// repeated as a table.
function readingSvg(reading, window) {
  const W = 1000;
  const H = 836;
  const edge = 28;
  const right = W - edge;
  const color = VERDICT_COLOR[reading.verdict];
  const parts = [`<defs>${NEON}</defs><rect width="${W}" height="${H}" fill="${COLOR.night}"/>`];
  const glow = (body) => `<g filter="url(#ds-neon)">${body}</g>`;

  // Verdict, score and the gauge with its pass mark.
  parts.push(text(edge, 34, `DEPLOYSCOPE · ${stamp(reading.time)} · ${String(reading.seed).slice(0, 12)}`,
    { size: 13, fill: COLOR.muted, anchor: 'start', spacing: 1 }));
  parts.push(glow(text(edge, 82, reading.verdict.toUpperCase(), { size: 40, fill: color, anchor: 'start', spacing: 4 })
    + text(right, 82, `${reading.score}/100`, { size: 40, fill: color, anchor: 'end' })));
  const gauge = right - edge;
  parts.push(`<rect x="${edge}" y="100" width="${gauge}" height="10" rx="5" fill="${COLOR.panel}"/>`);
  if (reading.score > 0) parts.push(`<rect x="${edge}" y="100" width="${n((gauge * reading.score) / 100)}" height="10" rx="5" fill="${color}"/>`);
  const mark = n(edge + (gauge * reading.failBelow) / 100);
  parts.push(`<path d="M${mark} 94V116" stroke="${COLOR.cream}" stroke-width="2"/>`);
  parts.push(text(mark + 8, 132, `pass mark ${reading.failBelow}`, { size: 13, fill: COLOR.muted, anchor: 'start' }));
  if (reading.verdict === 'ill-omened') {
    parts.push(text(right, 132, window ? `Next favourable window: ${stamp(window.time)}` : 'No favourable window in the next 14 days',
      { size: 15, fill: COLOR.gold, anchor: 'end' }));
  }

  // The sky: as a wheel, and as a table.
  parts.push(glow(wheelGroup(reading, 210, 348, 182)));
  const table = 418;
  parts.push(heading(table, 170, 'The sky now'));
  BODIES.forEach((body, i) => {
    const p = reading.positions[body];
    const y = 204 + i * 34;
    const tone = p.retrograde ? COLOR.bad : COLOR.cream;
    parts.push(glyph(body, table + 11, y - 6, 22, tone));
    parts.push(text(table + 34, y, body, { size: 16, fill: tone, anchor: 'start' }));
    parts.push(glyph(p.sign, table + 128, y - 6, 18, ELEMENTS[SIGNS.indexOf(p.sign) % 4]));
    parts.push(text(table + 146, y, `${Math.floor(p.lon % 30)}° ${p.sign}`, { size: 15, fill: COLOR.muted, anchor: 'start' }));
    if (p.retrograde) parts.push(text(table + 262, y, p.stationary ? 'station' : 'retro', { size: 13, fill: COLOR.bad, anchor: 'end' }));
  });

  // The omens that weigh most.
  const list = 704;
  parts.push(heading(list, 170, 'Weightiest omens'));
  [...reading.omens].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 9).forEach((omen, i) => {
    const y = 204 + i * 34;
    parts.push(text(list + 30, y, signed(omen.delta), { size: 16, fill: omen.delta < 0 ? COLOR.bad : COLOR.good, anchor: 'end' }));
    parts.push(text(list + 40, y, clip(omen.code.startsWith('OMEN1') ? omen.title.replace(/^.*?: /, '') : omen.title, 32), { size: 14, anchor: 'start' }));
  });
  parts.push(`<path d="M${edge} 562H${right}" stroke="${COLOR.panel}" stroke-width="2"/>`);

  // The spread.
  const scale = 0.62;
  const step = 124;
  parts.push(heading(edge, 596, 'The spread'));
  reading.cards.forEach((card, i) => {
    const x = edge + i * step;
    parts.push(`<g transform="translate(${x} 612) scale(${scale})">${cardGroup(card.number, card.reversed)}</g>`);
  });
  const cardText = edge + 3 * step + 6;
  reading.cards.forEach((card, i) => {
    const y = 650 + i * 56;
    parts.push(text(cardText, y, card.position, { size: 13, fill: COLOR.muted, anchor: 'start' }));
    parts.push(text(cardText, y + 20, clip(`${card.name}${card.reversed ? ', reversed' : ''}`, 26), { size: 16, anchor: 'start' }));
    parts.push(text(cardText + 222, y + 20, signed(card.delta), { size: 16, fill: card.delta < 0 ? COLOR.bad : COLOR.good, anchor: 'end' }));
  });

  // The hexagram, and the one it changes to.
  const hex = 688;
  const { primary, relating, lines, changing } = reading.hexagram;
  parts.push(heading(hex, 596, 'The hexagram'));
  parts.push(glow(`<g transform="translate(${hex} 614)">${hexagramGroup(lines, changing)}</g>`));
  parts.push(text(hex + 100, 640, `${primary.number} · ${clip(primary.name, 20)}`, { size: 16, anchor: 'start' }));
  parts.push(text(hex + 100, 662, relating ? `changing to ${relating.number} ·` : 'no changing lines', { size: 14, fill: COLOR.muted, anchor: 'start' }));
  if (relating) parts.push(text(hex + 100, 682, clip(relating.name, 24), { size: 14, fill: COLOR.muted, anchor: 'start' }));

  // What the reading was personal to.
  const notes = [`Moon: ${reading.moonPhase}${reading.voidOfCourse ? ', void of course' : ''}`];
  if (reading.natal) notes.push(`Repository Sun in ${reading.natal.sunSign}, age ${reading.natal.age.toFixed(1)}`);
  if (reading.release) notes.push(`Release ${clip(String(reading.release.version), 14)} is a ${reading.release.number}`);
  notes.forEach((note, i) => parts.push(text(hex, 722 + i * 21, note, { size: 14, fill: COLOR.muted, anchor: 'start' })));

  parts.push(text(edge, H - 14, `Red: retrograde. Chords: aspects, green in harmony, red at odds.${reading.natal ? ' Gold dots: the natal chart, the large one its Sun.' : ''}`,
    { size: 13, fill: COLOR.muted, anchor: 'start', opacity: 0.85 }));
  return document(W, H, parts.join(''));
}

module.exports = { cardSvg, deckSvg, hexagramSvg, iconSvg, readingSvg, linesOf, SIGNS };
