'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const svg = require('../src/svg');
const comment = require('../src/comment');
const { client } = require('../src/github');
const { assets } = require('../scripts/build-assets');
const { divine, nextWindow } = require('../src/omens');
const iching = require('../src/iching');

const at = (iso) => Date.parse(iso);
const question = { time: at('2026-11-13T12:00:00Z'), seed: 'abc124', born: at('2020-11-13T09:00:00Z'), version: 'v2.13.1' };

// Every tag opened is closed, in order: enough to catch a malformed drawing.
function assertWellFormed(document) {
  const stack = [];
  for (const [, closing, name, selfClosing] of document.matchAll(/<(\/?)([a-zA-Z]+)[^<>]*?(\/?)>/g)) {
    if (selfClosing) continue;
    if (closing) assert.equal(stack.pop(), name);
    else stack.push(name);
  }
  assert.deepEqual(stack, []);
  assert.ok(!/NaN|undefined|Infinity/.test(document), 'no broken numbers in the drawing');
}

test('the committed assets are what the drawing code produces', () => {
  const files = assets();
  assert.equal(Object.keys(files).length, 1 + 22 * 2 + 64);
  for (const [name, content] of Object.entries(files)) {
    assertWellFormed(content);
    assert.equal(fs.readFileSync(path.join(__dirname, '..', 'assets', name), 'utf8'), content, `${name} is stale, run npm run assets`);
  }
});

test('hexagram drawings use the lines of their own number', () => {
  for (let number = 1; number <= 64; number++) {
    assert.equal(iching.hexagram(svg.linesOf(number)).number, number);
  }
  assert.deepEqual(svg.linesOf(11), [1, 1, 1, 0, 0, 0]);
});

test('the reading draws for every kind of question', () => {
  for (let i = 0; i < 60; i++) {
    const q = { ...question, seed: `seed-${i}`, time: question.time + i * 86400000 * 5, failBelow: i % 3 ? 25 : 70 };
    if (i % 2) delete q.born;
    if (i % 4 < 2) delete q.version;
    const reading = divine(q);
    const picture = svg.readingSvg(reading, reading.verdict === 'ill-omened' ? nextWindow(q) : null);
    assertWellFormed(picture);
    assert.ok(picture.includes(reading.verdict.toUpperCase()));
  }
});

test('text in drawings is escaped', () => {
  const picture = svg.readingSvg(divine({ ...question, seed: '<&">' }), null);
  assertWellFormed(picture);
  assert.ok(picture.includes('&lt;&amp;&quot;&gt;'));
});

test('the comment shows card images when it knows where they are, and text when not', () => {
  const reading = divine(question);
  const withImages = comment.body(reading, { assets: 'https://github.com/mooracle/deployscope/raw/v1/assets', image: 'https://example.test/reading.svg' });
  assert.ok(withImages.startsWith(comment.MARKER));
  for (const card of reading.cards) {
    assert.ok(withImages.includes(`/assets/cards/${card.number}${card.reversed ? 'r' : ''}.svg`));
    assert.ok(withImages.includes(card.name));
  }
  assert.ok(withImages.includes(`/assets/hexagrams/${reading.hexagram.primary.number}.svg`));
  assert.ok(withImages.includes('](https://example.test/reading.svg)'));
  const plain = comment.body(reading);
  assert.ok(!plain.includes('<img'));
  assert.ok(plain.includes('━━━'));
});

test('a refused deployment says so in the comment, with the window', () => {
  const q = { ...question, failBelow: 90 };
  const reading = divine(q);
  assert.equal(reading.verdict, 'ill-omened');
  const body = comment.body(reading, { window: nextWindow(q) || null });
  assert.match(body, /❌ Ill-omened/);
  assert.match(body, /favourable window/);
});

// A stand-in for the GitHub API that records what it is asked.
async function fakeGitHub(handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const call = { method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined, auth: req.headers.authorization };
      calls.push(call);
      const [status, payload] = handler(call);
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    });
  });
  await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });
  return { calls, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => { server.close(resolve); }) };
}

test('the comment is created once and updated afterwards', async () => {
  const comments = [{ id: 1, body: 'unrelated' }];
  const api = await fakeGitHub(({ method, url, body }) => {
    if (method === 'GET') return [200, comments];
    if (method === 'POST') { comments.push({ id: 2, body: body.body }); return [201, { id: 2 }]; }
    if (method === 'PATCH' && url.endsWith('/issues/comments/2')) { comments[1].body = body.body; return [200, { id: 2 }]; }
    return [500, {}];
  });
  try {
    const github = client({ token: 't0ken', repo: 'o/r', apiUrl: api.url });
    await github.upsertComment(7, comment.MARKER, `${comment.MARKER}\nfirst`);
    await github.upsertComment(7, comment.MARKER, `${comment.MARKER}\nsecond`);
    assert.deepEqual(api.calls.map((c) => `${c.method} ${c.url.split('?')[0]}`), [
      'GET /repos/o/r/issues/7/comments', 'POST /repos/o/r/issues/7/comments',
      'GET /repos/o/r/issues/7/comments', 'PATCH /repos/o/r/issues/comments/2']);
    assert.equal(comments.length, 2);
    assert.ok(comments[1].body.endsWith('second'));
    assert.ok(api.calls.every((c) => c.auth === 'Bearer t0ken'));
  } finally {
    await api.close();
  }
});

test('publishing creates an orphan branch first and appends to it afterwards', async () => {
  let head = null;
  const api = await fakeGitHub(({ method, url, body }) => {
    if (method === 'GET' && url.includes('/git/ref/heads/')) return head ? [200, { object: { sha: head } }] : [404, {}];
    if (method === 'GET' && url.includes('/git/commits/')) return [200, { tree: { sha: 'tree-of-' + head } }];
    if (url.endsWith('/git/blobs')) return [201, { sha: 'blob1' }];
    if (url.endsWith('/git/trees')) return [201, { sha: 'tree1' }];
    if (url.endsWith('/git/commits')) return [201, { sha: body.parents.length ? 'commit2' : 'commit1' }];
    if (method === 'POST' && url.endsWith('/git/refs')) { head = body.sha; return [201, {}]; }
    if (method === 'PATCH' && url.endsWith('/git/refs/heads/readings')) { head = body.sha; return [200, {}]; }
    return [500, {}];
  });
  try {
    const github = client({ token: 't', repo: 'o/r', apiUrl: api.url });
    assert.equal(await github.publishFile('readings', 'readings/a.svg', '<svg/>', 'first'), 'commit1');
    const first = api.calls.splice(0);
    assert.deepEqual(first.find((c) => c.url.endsWith('/git/commits')).body.parents, []);
    assert.equal(first.find((c) => c.url.endsWith('/git/trees')).body.base_tree, undefined);
    assert.deepEqual(first.at(-1).body, { ref: 'refs/heads/readings', sha: 'commit1' });

    assert.equal(await github.publishFile('readings', 'readings/b.svg', '<svg/>', 'second'), 'commit2');
    assert.deepEqual(api.calls.find((c) => c.url.endsWith('/git/commits')).body.parents, ['commit1']);
    assert.equal(api.calls.find((c) => c.url.endsWith('/git/trees')).body.base_tree, 'tree-of-commit1');
    assert.equal(api.calls.at(-1).method, 'PATCH');
    assert.equal(head, 'commit2');
  } finally {
    await api.close();
  }
});

function runAction(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'main.js')], { env: { PATH: process.env.PATH, ...env } });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.on('close', (status) => resolve({ status, stdout }));
  });
}

test('on a pull request the action draws the reading, publishes it and comments', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'deployscope-test-'));
  fs.writeFileSync(path.join(temp, 'event.json'), JSON.stringify({ pull_request: { number: 12 } }));
  let posted;
  const api = await fakeGitHub(({ method, url, body }) => {
    if (method === 'GET' && url.includes('/git/ref/')) return [404, {}];
    if (method === 'GET') return [200, []];
    if (url.endsWith('/issues/12/comments')) { posted = body.body; return [201, { id: 1 }]; }
    return [201, { sha: 'c0ffee' }];
  });
  try {
    const env = {
      INPUT_TIME: '2026-11-13T12:00:00Z', INPUT_SEED: 'abc124', 'INPUT_DEFY-FATE': 'true', 'INPUT_GITHUB-TOKEN': 't',
      'INPUT_PUBLISH-BRANCH': 'deployscope-readings', GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: api.url, GITHUB_RUN_ID: '99',
      GITHUB_EVENT_PATH: path.join(temp, 'event.json'), GITHUB_OUTPUT: path.join(temp, 'out'), RUNNER_TEMP: temp,
      GITHUB_ACTION_REPOSITORY: 'mooracle/deployscope', GITHUB_ACTION_REF: 'v1',
    };
    const result = await runAction(env);
    assert.equal(result.status, 0, result.stdout);
    const outputs = fs.readFileSync(path.join(temp, 'out'), 'utf8');
    assertWellFormed(fs.readFileSync(path.join(temp, 'deployscope', 'reading.svg'), 'utf8'));
    assert.match(outputs, /reading-url=https:\/\/github\.com\/o\/r\/raw\/c0ffee\/readings\/abc124-99-1\.svg/);
    assert.ok(posted.includes('https://github.com/o/r/raw/c0ffee/readings/abc124-99-1.svg'));
    assert.ok(posted.includes('https://github.com/mooracle/deployscope/raw/v1/assets/cards/'));

    // Without permission to comment the verdict still stands and the job is not failed by it.
    const denied = await fakeGitHub(() => [403, { message: 'Resource not accessible by integration' }]);
    try {
      const refused = await runAction({ ...env, GITHUB_API_URL: denied.url });
      assert.equal(refused.status, 0, refused.stdout);
      assert.match(refused.stdout, /::warning title=OMEN450/);
      assert.match(refused.stdout, /::warning title=OMEN451/);
    } finally {
      await denied.close();
    }

    // No comment when it is switched off, and none outside pull requests.
    api.calls.length = 0;
    await runAction({ ...env, INPUT_COMMENT: 'false', 'INPUT_PUBLISH-BRANCH': '' });
    await runAction({ ...env, GITHUB_EVENT_PATH: '', 'INPUT_PUBLISH-BRANCH': '' });
    assert.equal(api.calls.length, 0);
  } finally {
    await api.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('action.yml has no plain value that YAML would read as a nested mapping', () => {
  const lines = fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8').split('\n');
  for (const [index, line] of lines.entries()) {
    const value = (line.match(/^\s*[\w-]+:\s+(.*)$/) || [])[1];
    if (!value || /^['"|>]/.test(value)) continue;
    assert.ok(!/: | #/.test(value), `action.yml line ${index + 1} needs quoting`);
  }
});
