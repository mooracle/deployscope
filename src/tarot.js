'use strict';

const crypto = require('node:crypto');

// Major arcana. Each orientation is [score delta, reading].
const DECK = [
  { name: 'The Fool',
    upright: [6, 'A leap of faith. Deploying without staging works out, this once.'],
    reversed: [-12, 'Recklessness. No rollback plan is visible in the aura.'] },
  { name: 'The Magician',
    upright: [12, 'All tools are at hand and the pipeline obeys.'],
    reversed: [-8, 'Trickery. It only works on your machine.'] },
  { name: 'The High Priestess',
    upright: [4, 'Hidden knowledge. The logs already contain the answer.'],
    reversed: [-8, 'Secrets surface. Check what got committed alongside .env.'] },
  { name: 'The Empress',
    upright: [10, 'Abundance. Autoscaling nurtures the load.'],
    reversed: [-6, 'Overgrowth. The dependency tree and the cloud bill both bloom.'] },
  { name: 'The Emperor',
    upright: [10, 'Order. Branch protection holds and approvals are in place.'],
    reversed: [-7, 'Tyranny. The required approver is on vacation.'] },
  { name: 'The Hierophant',
    upright: [6, 'Tradition. The runbook is followed and the runbook is right.'],
    reversed: [-5, 'Heresy. Someone bypassed the review process.'] },
  { name: 'The Lovers',
    upright: [8, 'Union. The model has found its GPU, and the quota holds.'],
    reversed: [-10, 'Separation. CUDA out of memory.'] },
  { name: 'The Chariot',
    upright: [12, 'Victory through momentum. Ship it.'],
    reversed: [-10, 'Loss of control. The rollout outruns its own health checks.'] },
  { name: 'Strength',
    upright: [10, 'Resilience. Retries and circuit breakers hold.'],
    reversed: [-8, 'Fragility. One flaky test away from collapse.'] },
  { name: 'The Hermit',
    upright: [3, 'Solitude. A quiet deploy that nobody notices.'],
    reversed: [-6, 'Isolation. The only person who understands this service is offline.'] },
  { name: 'Wheel of Fortune',
    upright: [5, 'The wheel turns in your favour. Flaky tests pass.'],
    reversed: [-9, 'The wheel turns. Flaky tests fail.'] },
  { name: 'Justice',
    upright: [7, 'Fairness. You get exactly the deploy your test coverage deserves, and it is good.'],
    reversed: [-8, 'Karma. The skipped tests come to collect.'] },
  { name: 'The Hanged Man',
    upright: [-6, 'Suspension. The pipeline waits in "pending" for a runner.'],
    reversed: [-4, 'Stalling. Timeouts without a cause.'] },
  { name: 'Death',
    upright: [4, 'Transformation. An excellent day to decommission legacy systems.'],
    reversed: [-10, 'Resistance to change. The legacy system refuses to die.'] },
  { name: 'Temperance',
    upright: [10, 'Balance. A gradual canary rollout is favoured.'],
    reversed: [-8, 'Excess. All traffic shifts at once.'] },
  { name: 'The Devil',
    upright: [-12, 'Bondage. Vendor lock-in, and the temptation of --no-verify.'],
    reversed: [5, 'Liberation. A dependency is finally removed.'] },
  { name: 'The Tower',
    upright: [-25, 'Sudden collapse. Production is the tower.'],
    reversed: [-10, 'Disaster averted, or merely postponed.'] },
  { name: 'The Star',
    upright: [14, 'Hope. Green checkmarks as far as the eye can see.'],
    reversed: [-5, 'Lost faith. The monitoring dashboards are dark.'] },
  { name: 'The Moon',
    upright: [-10, 'Illusion. It passes in CI and fails in production; the mocks lie.'],
    reversed: [3, 'The fog lifts. A heisenbug reveals itself.'] },
  { name: 'The Sun',
    upright: [15, 'Radiant success. Everything is green.'],
    reversed: [3, 'Success, delayed by a slow pipeline.'] },
  { name: 'Judgement',
    upright: [6, 'Reckoning. Lessons from the last postmortem have been applied.'],
    reversed: [-8, 'Denial. The last incident is about to repeat.'] },
  { name: 'The World',
    upright: [14, 'Completion. The release is whole.'],
    reversed: [-6, 'Incompleteness. One migration is missing.'] },
];

const POSITIONS = ['The Build (past)', 'The Deploy (present)', 'Production (future)'];

// Three cards without replacement, determined entirely by the seed: the same
// commit always draws the same spread, fate cannot be re-rolled by re-running.
function draw(seed) {
  const hash = crypto.createHash('sha256').update(String(seed)).digest();
  const remaining = DECK.map((_, i) => i);
  return POSITIONS.map((position, i) => {
    const index = remaining.splice(hash.readUInt32BE(i * 4) % remaining.length, 1)[0];
    const card = DECK[index];
    const reversed = (hash[16 + i] & 1) === 1;
    const [delta, reading] = reversed ? card.reversed : card.upright;
    return { position, number: index, name: card.name, reversed, delta, reading };
  });
}

module.exports = { DECK, POSITIONS, draw };
