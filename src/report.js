'use strict';

const { BODIES } = require('./ephemeris');
const { BASE_SCORE } = require('./omens');

const GLYPHS = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const VERDICTS = {
  auspicious: 'AUSPICIOUS: the heavens approve of this deployment',
  tolerable: 'TOLERABLE: the heavens shrug, proceed with a rollback plan',
  'ill-omened': 'ILL-OMENED: the heavens advise against this deployment',
};

// Workflow command escaping, as done by @actions/core.
function escapeData(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function annotation(severity, title, message) {
  return `::${severity} title=${escapeProperty(title)}::${escapeData(message)}`;
}

function signed(delta) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function minute(time) {
  return `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function position(p) {
  const within = p.lon % 30;
  const deg = Math.floor(within);
  const min = String(Math.floor((within - deg) * 60)).padStart(2, '0');
  let motion = '';
  if (p.stationary) motion = ' (stationary)';
  else if (p.retrograde) motion = ' ℞';
  return `${String(deg).padStart(2)}°${min}' ${p.sign}${motion}`;
}

function moonLine(reading) {
  if (!reading.voidOfCourse) return reading.moonPhase;
  return `${reading.moonPhase}, void of course until about ${minute(reading.voidOfCourse.until)}`;
}

function natalLine(natal) {
  const rising = natal.ascendant ? ` ${natal.ascendant.sign} rising.` : '';
  return `Born ${minute(natal.born)}, ${natal.age.toFixed(1)} years ago. Sun in ${natal.sunSign}: ${natal.trait}.${rising}`;
}

// Top line first. Old (changing) lines are marked the traditional way: ○ yang, × yin.
function hexagramArt(casting) {
  const art = [];
  for (let i = 5; i >= 0; i--) {
    const line = casting.lines[i] ? '━━━━━━━' : '━━━ ━━━';
    let mark = '';
    if (casting.changing[i]) mark = casting.lines[i] ? ' ○' : ' ×';
    art.push(line + mark);
  }
  return art;
}

function hexagramLine(casting) {
  const name = (h) => `${h.symbol} ${h.number} ${h.name}`;
  return casting.relating ? `${name(casting.primary)}, changing to ${name(casting.relating)}` : `${name(casting.primary)}, no changing lines`;
}

// Most consequential first: GitHub shows at most 10 annotations per severity.
function ranked(omens) {
  return [...omens].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function logLines(reading) {
  const lines = [`deployscope: divining for ${new Date(reading.time).toISOString()} (${reading.timezone}), seed ${reading.seed}`, ''];
  lines.push('::group::Celestial positions');
  for (const body of BODIES) {
    lines.push(`  ${GLYPHS[body]} ${body.padEnd(8)} ${position(reading.positions[body])}`);
  }
  lines.push(`  Moon: ${moonLine(reading)}`, '::endgroup::');
  if (reading.natal) {
    lines.push('::group::Natal chart', `  ${natalLine(reading.natal)}`);
    for (const body of BODIES) {
      lines.push(`  ${GLYPHS[body]} ${body.padEnd(8)} ${position(reading.natal.positions[body])}`);
    }
    lines.push('::endgroup::');
  }
  lines.push('::group::The spread');
  for (const card of reading.cards) {
    lines.push(`  ${card.position.padEnd(20)} ${card.name}${card.reversed ? ' (reversed)' : ''}`);
  }
  lines.push('::endgroup::');
  lines.push('::group::The hexagram', ...hexagramArt(reading.hexagram).map((l) => `  ${l}`), `  ${hexagramLine(reading.hexagram)}`, '::endgroup::');
  if (reading.release) {
    lines.push('::group::The release number', `  ${reading.release.version}: digits sum to ${reading.release.sum}, release number ${reading.release.number}`, '::endgroup::');
  }
  lines.push('::group::Omens');
  lines.push(`  ${signed(BASE_SCORE).padStart(4)}  baseline optimism`);
  for (const omen of reading.omens) {
    lines.push(`  ${signed(omen.delta).padStart(4)}  ${omen.code}  ${omen.message}`);
  }
  lines.push('::endgroup::', '');
  for (const omen of ranked(reading.omens)) {
    lines.push(annotation(omen.severity, `${omen.code} ${omen.title}`, `${omen.message} (${signed(omen.delta)})`));
  }
  return lines;
}

function verdictLine(reading) {
  return `${VERDICTS[reading.verdict]} (score ${reading.score}/100, required ${reading.failBelow})`;
}

// What to tell someone whose deployment was refused. `window` comes from nextWindow().
function windowLine(window) {
  if (!window) return 'No favourable window opens in the next 14 days for this commit. Push a commit with better karma.';
  return `The next favourable window opens around ${minute(window.time)} (score ${window.score}). `
    + 'Re-running before then will not help: the cards and the hexagram are bound to the commit.';
}

function cell(text) {
  return String(text).replace(/\|/g, '\\|');
}

function summary(reading, { defied = false, window } = {}) {
  const icon = { auspicious: '🌟', tolerable: '🌗', 'ill-omened': '🔥' }[reading.verdict];
  const out = [`## ${icon} ${verdictLine(reading)}`, ''];
  if (defied) out.push('> Fate was defied (`defy-fate: true`). The job passes; the omens stand.', '');
  if (reading.verdict === 'ill-omened') out.push(`**${windowLine(window)}**`, '');
  out.push(
    '### The spread',
    '',
    '| Position | Card | Reading | Score |',
    '| --- | --- | --- | ---: |',
    ...reading.cards.map((c) => `| ${c.position} | ${c.name}${c.reversed ? ' (reversed)' : ''} | ${cell(c.reading)} | ${signed(c.delta)} |`),
    '',
    '### The hexagram',
    '',
    '```',
    ...hexagramArt(reading.hexagram),
    '```',
    '',
    hexagramLine(reading.hexagram),
    '',
  );
  if (reading.release) {
    out.push('### The release number', '',
      `\`${reading.release.version}\`: digits sum to ${reading.release.sum}, release number **${reading.release.number}**. ${reading.release.reading}`, '');
  }
  out.push(
    '### The sky',
    '',
    `Moon: **${moonLine(reading)}**`,
    '',
  );
  if (reading.natal) {
    out.push(natalLine(reading.natal), '',
      '| Body | Now | At birth |',
      '| --- | --- | --- |',
      ...BODIES.map((b) => `| ${GLYPHS[b]} ${b} | ${position(reading.positions[b]).trim()} | ${position(reading.natal.positions[b]).trim()} |`));
  } else {
    out.push('| Body | Position |',
      '| --- | --- |',
      ...BODIES.map((b) => `| ${GLYPHS[b]} ${b} | ${position(reading.positions[b]).trim()} |`));
  }
  out.push(
    '',
    '### Omens',
    '',
    '| Code | Omen | Score |',
    '| --- | --- | ---: |',
    `| | Baseline optimism | ${signed(BASE_SCORE)} |`,
    ...reading.omens.map((o) => `| ${o.code} | ${cell(o.message)} | ${signed(o.delta)} |`),
    `| | **Total (clamped to 0-100)** | **${reading.score}** |`,
    '',
  );
  return out.join('\n');
}

module.exports = { escapeData, escapeProperty, annotation, logLines, verdictLine, windowLine, summary };
