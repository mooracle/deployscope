'use strict';

const { verdictLine, windowLine } = require('./report');

const MARKER = '<!-- deployscope-reading -->';
const ICONS = { auspicious: '🌟', tolerable: '🌗', 'ill-omened': '🔥' };
const TOP_OMENS = 8;

function signed(delta) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function cell(text) {
  return String(text).replace(/\|/g, '\\|');
}

function hexagramText(casting) {
  const rows = [];
  for (let i = 5; i >= 0; i--) {
    let mark = '';
    if (casting.changing[i]) mark = casting.lines[i] ? ' ○' : ' ×';
    rows.push((casting.lines[i] ? '━━━━━━━' : '━━━ ━━━') + mark);
  }
  return rows;
}

// The pull request comment. `assets` is the URL of the action's assets
// directory (card and hexagram images) and `image` the URL of the published
// reading; without them the comment falls back to text.
function body(reading, { window, assets, image, defied = false } = {}) {
  const out = [MARKER, `## ${ICONS[reading.verdict]} Deployscope: ${verdictLine(reading)}`, ''];
  if (reading.verdict === 'ill-omened') {
    out.push(`**${windowLine(window)}**`, '');
    if (defied) out.push('> Fate was defied (`defy-fate: true`). The job passes; the omens stand.', '');
  }
  if (image) out.push(`![The reading: chart wheel, spread and hexagram](${image})`, '');

  const label = (card) => `${card.name}${card.reversed ? ' (reversed)' : ''}`;
  out.push('### The spread', '',
    `| ${reading.cards.map((c) => c.position).join(' | ')} |`,
    `| ${reading.cards.map(() => ':-:').join(' | ')} |`);
  if (assets) {
    out.push(`| ${reading.cards.map((c) => `<img src="${assets}/cards/${c.number}${c.reversed ? 'r' : ''}.svg" width="150" alt="${label(c)}">`).join(' | ')} |`);
  }
  out.push(`| ${reading.cards.map((c) => `**${label(c)}** (${signed(c.delta)})`).join(' | ')} |`,
    `| ${reading.cards.map((c) => cell(c.reading)).join(' | ')} |`, '');

  const { primary, relating } = reading.hexagram;
  out.push('### The hexagram', '');
  if (assets) {
    const picture = (h) => `<img src="${assets}/hexagrams/${h.number}.svg" width="72" alt="Hexagram ${h.number}">`;
    out.push(relating ? `${picture(primary)} &nbsp;→&nbsp; ${picture(relating)}` : picture(primary), '');
  } else {
    out.push('```', ...hexagramText(reading.hexagram), '```', '');
  }
  out.push(`**${primary.number} · ${primary.name}** (${signed(primary.delta)}). ${primary.reading}`);
  if (relating) {
    const changed = reading.hexagram.changing.map((c, i) => (c ? i + 1 : 0)).filter(Boolean);
    out.push('', `${changed.length > 1 ? 'Lines' : 'Line'} ${changed.join(', ')} changing, towards **${relating.number} · ${relating.name}**. ${relating.reading}`);
  }
  out.push('');

  const ranked = [...reading.omens].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const row = (o) => `| \`${o.code}\` | ${cell(o.message)} | ${signed(o.delta)} |`;
  out.push('### Weightiest omens', '', '| Code | Omen | Score |', '| --- | --- | ---: |', ...ranked.slice(0, TOP_OMENS).map(row), '');
  if (ranked.length > TOP_OMENS) {
    out.push('<details><summary>All omens</summary>', '', '| Code | Omen | Score |', '| --- | --- | ---: |', ...reading.omens.map(row), '', '</details>', '');
  }

  const facts = [`read for ${new Date(reading.time).toISOString().slice(0, 16).replace('T', ' ')} UTC`, `seed \`${String(reading.seed).slice(0, 12)}\``,
    `Moon: ${reading.moonPhase}${reading.voidOfCourse ? ', void of course' : ''}`];
  if (reading.natal) facts.push(`repository Sun in ${reading.natal.sunSign}`);
  if (reading.release) facts.push(`release ${reading.release.version} is a ${reading.release.number}`);
  out.push(`<sub>${facts.join(' · ')}</sub>`, '');
  return out.join('\n');
}

module.exports = { MARKER, body };
