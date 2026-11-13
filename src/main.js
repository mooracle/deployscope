'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { divine, nextWindow } = require('./omens');
const report = require('./report');
const svg = require('./svg');
const comment = require('./comment');
const github = require('./github');

function input(name, fallback) {
  const value = (process.env[`INPUT_${name.toUpperCase()}`] || '').trim();
  return value === '' ? fallback : value;
}

// GitHub gives repository.created_at as ISO 8601 in most events and as Unix
// seconds in push events.
function parseBorn(value, time) {
  if (value === undefined) return undefined;
  const born = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value);
  if (Number.isNaN(born)) throw new Error(`Input "born" is not an ISO 8601 timestamp or Unix seconds: ${value}`);
  if (born > time) throw new Error(`Input "born" (${value}) is later than the moment being read: the repository is not born yet`);
  return born;
}

function readInputs() {
  const timeInput = input('time', '');
  const time = timeInput ? Date.parse(timeInput) : Date.now();
  if (Number.isNaN(time)) throw new Error(`Input "time" is not a valid ISO 8601 timestamp: ${timeInput}`);

  const failBelow = Number(input('fail-below', '25'));
  if (!Number.isFinite(failBelow) || failBelow < 0 || failBelow > 100) {
    throw new Error(`Input "fail-below" must be a number between 0 and 100, got: ${input('fail-below')}`);
  }

  const timezone = input('timezone', 'UTC');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new Error(`Input "timezone" is not a valid IANA time zone: ${timezone}`);
  }

  // Without a commit to read, the cards are drawn for the calendar day.
  const seed = input('seed', process.env.GITHUB_SHA || new Date(time).toISOString().slice(0, 10));
  const born = parseBorn(input('born'), time);
  const version = input('version');
  const defyFate = input('defy-fate', 'false').toLowerCase() === 'true';
  return { time, seed, timezone, failBelow, born, version, defyFate };
}

function setOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join(''));
}

function pullRequestNumber() {
  try {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    return event.pull_request ? event.pull_request.number : null;
  } catch {
    return null;
  }
}

// Draws the reading and, on pull requests, posts it as a comment. None of
// this may change the verdict, so failures here are warnings.
async function illustrate(reading, window, defied) {
  const directory = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'deployscope');
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'reading.svg');
  const picture = svg.readingSvg(reading, window);
  fs.writeFileSync(file, picture);
  setOutputs({ 'reading-svg': file });

  const token = input('github-token');
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return;
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const api = github.client({ token, repo, apiUrl: process.env.GITHUB_API_URL });

  let image;
  const branch = input('publish-branch');
  if (branch) {
    const seed = String(reading.seed).replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 40);
    const name = `readings/${seed}-${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || 1}.svg`;
    try {
      const commit = await api.publishFile(branch, name, picture, `Reading for ${seed}`);
      image = `${server}/${repo}/raw/${commit}/${name}`;
      setOutputs({ 'reading-url': image });
    } catch (err) {
      console.log(report.annotation('warning', 'OMEN451 The reading could not be published',
        `${err.message}. Publishing to a branch needs "contents: write" permission.`));
    }
  }

  const pullRequest = pullRequestNumber();
  if (!pullRequest || input('comment', 'true').toLowerCase() !== 'true') return;
  // The card and hexagram images are served from the action's own repository at the ref in use.
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const ref = process.env.GITHUB_ACTION_REF;
  const assets = action && ref ? `${server}/${action}/raw/${ref}/assets` : undefined;
  try {
    await api.upsertComment(pullRequest, comment.MARKER, comment.body(reading, { window, assets, image, defied }));
  } catch (err) {
    console.log(report.annotation('warning', 'OMEN450 The reading could not be posted to the pull request',
      `${err.message}. Commenting needs "pull-requests: write" permission, which pull requests from forks do not get.`));
  }
}

async function run() {
  const { defyFate, ...question } = readInputs();
  const reading = divine(question);
  const doomed = reading.verdict === 'ill-omened';
  const window = doomed ? nextWindow(question) : null;
  const { primary, relating } = reading.hexagram;

  console.log(report.logLines(reading).join('\n'));

  setOutputs({
    verdict: reading.verdict,
    score: reading.score,
    cards: reading.cards.map((c) => `${c.name}${c.reversed ? ' (reversed)' : ''}`).join(', '),
    hexagram: relating ? `${primary.number} ${primary.name} -> ${relating.number} ${relating.name}` : `${primary.number} ${primary.name}`,
    'mercury-retrograde': reading.positions.Mercury.retrograde,
    'moon-phase': reading.moonPhase,
    'moon-void': reading.voidOfCourse !== null,
    'sun-sign': reading.natal ? reading.natal.sunSign : '',
    'release-number': reading.release ? reading.release.number : '',
    'next-window': window ? new Date(window.time).toISOString() : '',
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.summary(reading, { defied: doomed && defyFate, window }));
  }
  await illustrate(reading, window, doomed && defyFate);

  const line = report.verdictLine(reading);
  if (!doomed) {
    console.log(report.annotation('notice', 'OMEN200 Verdict', line));
  } else if (defyFate) {
    console.log(report.annotation('warning', 'OMEN299 Fate defied', `${line}. Proceeding anyway because defy-fate is set. Hubris has been noted.`));
  } else {
    console.log(report.annotation('error', 'OMEN500 Verdict', `${line}. ${report.windowLine(window)}`));
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.log(report.annotation('error', 'OMEN400 The oracle could not be consulted', err.message));
  process.exitCode = 2;
});
