'use strict';

const { windowLine } = require('./report');

const MARKER = '<!-- deployscope-reading -->';

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

const STATUS = { auspicious: '🌟 Auspicious', tolerable: '✅ Tolerable', 'ill-omened': '❌ Ill-omened' };
const DOCS = 'https://github.com/mooracle/deployscope#theoretical-basis';

// "Nov 13 2026, 10:24 PM", in UTC.
function stamp(time) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    .formatToParts(new Date(time));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('month')} ${get('day')} ${get('year')}, ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}

// The pull request comment, laid out like a deployment bot's: one status row
// that can be taken in at a glance, and the whole reading folded away under it.
// `assets` is the URL of the action's assets directory (icon, card and hexagram
// images), `image` the URL of the published reading and `run` the URL of the
// workflow run; without them the comment falls back to text.
function body(reading, { window, assets, image, run, docs = DOCS, defied = false } = {}) {
  const icon = assets ? ` <img src="${assets}/icon.svg" width="26" height="26" alt=""> ` : ' ';
  const out = [MARKER, `## Consulting${icon}Deployscope`, '',
    `The latest omens for this commit. Learn more about [how they are read](${docs}).`, ''];

  const status = reading.verdict === 'ill-omened' && defied ? '⚠️ Ill-omened, fate defied' : STATUS[reading.verdict];
  const { primary, relating } = reading.hexagram;
  out.push('| Status | Score | Cast for | Spread | Hexagram | Updated (UTC) |', '| --- | --- | --- | --- | --- | --- |',
    `| ${[
      `${status}${run ? `<br>[View omens](${run})` : ''}`,
      `**${reading.score}**/100<br>pass mark ${reading.failBelow}`,
      `\`${cell(String(reading.seed).slice(0, 7))}\``,
      reading.cards.map((c) => `${c.name}${c.reversed ? ' ↓' : ''}`).join('<br>'),
      `${primary.number} · ${primary.name}${relating ? `<br>→ ${relating.number} · ${relating.name}` : ''}`,
      stamp(reading.time),
    ].join(' | ')} |`, '');
  if (reading.verdict === 'ill-omened') out.push(`**${windowLine(window)}**`, '');

  out.push('<details><summary>The full reading</summary>', '');
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
  out.push('### The omens, weightiest first', '', '| Code | Omen | Score |', '| --- | --- | ---: |', ...ranked.map(row), '');

  const facts = [`read for ${new Date(reading.time).toISOString().slice(0, 16).replace('T', ' ')} UTC`, `seed \`${String(reading.seed).slice(0, 12)}\``,
    `Moon: ${reading.moonPhase}${reading.voidOfCourse ? ', void of course' : ''}`];
  if (reading.natal) facts.push(`repository Sun in ${reading.natal.sunSign}`);
  if (reading.release) facts.push(`release ${reading.release.version} is a ${reading.release.number}`);
  out.push(`<sub>${facts.join(' · ')}</sub>`, '', '</details>', '');
  return out.join('\n');
}

module.exports = { MARKER, body };
