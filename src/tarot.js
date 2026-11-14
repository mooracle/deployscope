'use strict';

const crypto = require('node:crypto');

// The deck: 22 major arcana here, the 56 minor arcana added below.
// Each orientation is [score delta, reading].
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

// Minor arcana: four suits of fourteen, in the order Ace to Ten, Page, Knight,
// Queen, King. Wands are will and new work, Cups are people (the team and the
// users), Swords are the mind and its conflicts (review, incidents), Pentacles
// are the material world (infrastructure and money).
const RANKS = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const SUITS = {
  Wands: [
    [[8, 'A spark. The first commit of something good.'], [-5, 'A false start. The branch is abandoned by Thursday.']],
    [[4, 'Planning. The roadmap is drawn and the world is in your hand.'], [-4, 'Fear of the unknown. The plan never leaves the document.']],
    [[7, 'The ships come in. Work sent out earlier returns as results.'], [-5, 'Delays. The upstream release you wait for is late.']],
    [[9, 'Celebration. A milestone is reached and the team is home.'], [-3, 'An unsettled home. The release party is premature.']],
    [[-6, 'Strife. Five people are editing the same file.'], [2, 'The quarrel is avoided. The merge conflict resolves itself.']],
    [[10, 'Victory in public. The release is praised by name.'], [-6, 'A fall from favour. The announcement precedes the fix.']],
    [[2, 'Standing your ground. The review is hostile but the design holds.'], [-6, 'Overwhelmed. Too many review comments to answer.']],
    [[8, 'Swiftness. The pipeline is fast today and the queue is empty.'], [-6, 'Delay. Runners are slow and the queue is long.']],
    [[1, 'The last stand. Tired, but one more fix will do it.'], [-6, 'Exhaustion. There is no strength left for a rollback.']],
    [[-8, 'Burden. One person carries the whole release.'], [3, 'The burden is put down. Something is delegated at last.']],
    [[4, 'Enthusiasm. A newcomer brings good news and a first pull request.'], [-4, 'Idle talk. A promising idea with no commits behind it.']],
    [[3, 'Energy and haste. It ships quickly, and mostly whole.'], [-8, 'Recklessness. Merged without waiting for CI.']],
    [[7, 'Confidence. The maintainer knows this code and it shows.'], [-5, 'Jealousy. A turf war over who owns the module.']],
    [[8, 'Vision. The lead sees where this is going and is right.'], [-7, 'A tyrant. Decisions are made, and nobody is asked.']],
  ],
  Cups: [
    [[8, 'An overflowing cup. Users will love this one.'], [-5, 'An empty cup. Nobody asked for this feature.']],
    [[8, 'Partnership. Frontend and backend agree on the contract.'], [-6, 'A broken bond. The API contract was changed on one side only.']],
    [[7, 'Friendship. The team celebrates together, with reason.'], [-4, 'Overindulgence. Too much celebrating, too little testing.']],
    [[-4, 'Apathy. The alert is seen and nobody moves.'], [3, 'Interest returns. Someone finally picks up the ticket.']],
    [[-8, 'Loss. Three cups are spilled; mourn the data, check the backups.'], [3, 'Moving on. Two cups still stand: the backups were good.']],
    [[3, 'Nostalgia. An old, simple solution turns out to be right.'], [-4, 'Stuck in the past. "It worked in the previous version."']],
    [[-5, 'Illusions. Too many options, all of them imagined.'], [3, 'Clarity. The scope is cut down to what is real.']],
    [[-4, 'Walking away. Something unfinished is left behind.'], [-3, 'Drifting. Neither leaving the old system nor committing to it.']],
    [[10, 'The wish card. What you asked of this release is granted.'], [-5, 'Smugness. Satisfaction arrives before the verification does.']],
    [[12, 'Harmony. Everyone is content: users, team and on-call alike.'], [-6, 'Discord at home. The teams do not agree on what was shipped.']],
    [[4, 'A pleasant surprise. An unexpected message, and it is good.'], [-4, 'Immaturity. Feelings are hurt in code review.']],
    [[5, 'An offer arrives. Accept the pull request.'], [-5, 'A beautiful promise. The demo will not survive real data.']],
    [[6, 'Compassion. Someone thought of the on-call engineer.'], [-5, 'Moods rule. Decisions are made by whoever is most upset.']],
    [[7, 'Calm at the helm. The incident commander does not panic.'], [-6, 'A troubled captain. Calm on the call, chaos in the channel.']],
  ],
  Swords: [
    [[8, 'Clarity. The root cause is found, and it is one line.'], [-6, 'Confusion. The stack trace points at the wrong file.']],
    [[-4, 'Stalemate. Two approaches, two reviewers, no decision.'], [-3, 'A forced choice. The lesser of two evils is merged.']],
    [[-10, 'Heartbreak. Three swords through the heart of the release.'], [2, 'Recovery. The pain of the last outage is fading.']],
    [[2, 'Rest. A freeze is in effect, and it is deserved.'], [-4, 'Restlessness. The freeze is broken for "just one small fix".']],
    [[-7, 'A hollow victory. The argument is won and the team is lost.'], [2, 'Reconciliation. The revert is accepted without blame.']],
    [[5, 'Passage to calmer waters. The migration carries everything across.'], [-5, 'A stalled crossing. The migration stopped halfway.']],
    [[-9, 'Stealth and theft. Something was changed without telling anyone.'], [1, 'Coming clean. The undocumented change gets its changelog entry.']],
    [[-6, 'Self-made bonds. Blocked by a rule that nobody remembers making.'], [3, 'Release. The needless approval gate is removed.']],
    [[-8, 'Sleepless nights. The pager is the nightmare.'], [2, 'Morning comes. It was a false alarm.']],
    [[-15, 'Ruin. Ten swords in the back: it cannot get worse than this.'], [3, 'The only way is up. The worst has already happened.']],
    [[3, 'Vigilance. Someone is watching the logs, and watching well.'], [-5, 'Gossip. A rumour of an outage outruns the status page.']],
    [[2, 'A charge. Fast and sharp, and for once aimed correctly.'], [-8, 'A charge with no plan. Straight to production, sword first.']],
    [[6, 'Clear sight. The reviewer is strict and right.'], [-6, 'Coldness. The review is correct and nobody will thank you for it.']],
    [[7, 'Authority of the mind. The architecture decision is sound.'], [-7, 'Misused intellect. Clever code that no one else can read.']],
  ],
  Pentacles: [
    [[9, 'A new resource. Budget, quota or hardware has been granted.'], [-6, 'A missed chance. The quota request was never filed.']],
    [[1, 'Juggling. Two priorities stay in the air, for now.'], [-6, 'Overcommitted. One of the two things is about to drop.']],
    [[9, 'Craft. Builder, reviewer and architect work as one.'], [-6, 'Poor workmanship. Nobody read the design before building.']],
    [[2, 'Holding on. Resources are conserved and nothing is wasted.'], [-4, 'Hoarding. The staging environment is not shared with anyone.']],
    [[-9, 'Hardship. Out in the cold: the credits have run out.'], [3, 'Relief. The invoice is paid and the lights come back on.']],
    [[6, 'Generosity. Capacity is shared with those who need it.'], [-5, 'Strings attached. The free tier has a price after all.']],
    [[2, 'Patience. The long investment has not paid yet, but it grows.'], [-5, 'Wasted effort. Months of work on what will not ship.']],
    [[8, 'Diligence. The same careful work, done well eight times.'], [-5, 'Cutting corners. Copied, pasted, and not understood.']],
    [[9, 'Self-sufficiency. The service stands on its own, with room to spare.'], [-5, 'Living beyond means. The instance types are larger than the traffic.']],
    [[12, 'Legacy. What is built today will be inherited and kept.'], [-6, 'Legacy code. What is inherited today is nobody\'s to keep.']],
    [[4, 'Study. Someone read the documentation first.'], [-4, 'Distraction. The tutorial was skimmed.']],
    [[7, 'Reliability. Slow, methodical and never late.'], [-4, 'Stagnation. Still on the version from three years ago.']],
    [[7, 'Practical care. The platform team has thought of everything.'], [-5, 'Neglect. The shared tooling is everyone\'s and no one\'s.']],
    [[10, 'Abundance. The infrastructure is solid and paid for.'], [-7, 'Greed. Cost was optimised until it broke.']],
  ],
};
for (const [suit, cards] of Object.entries(SUITS)) {
  cards.forEach(([upright, reversed], rank) => DECK.push({ name: `${RANKS[rank]} of ${suit}`, suit, rank, upright, reversed }));
}
const MAJORS = 22;

// The three positions and how much each weighs: the past is half spent, the
// outcome is what the question was about.
const POSITIONS = ['The Build (past)', 'The Deploy (present)', 'Production (future)'];
const WEIGHTS = [0.5, 1, 1.5];

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
    return { position, number: index, name: card.name, reversed, delta: Math.round(delta * WEIGHTS[i]), reading };
  });
}

module.exports = { DECK, MAJORS, RANKS, SUITS, POSITIONS, WEIGHTS, draw };
