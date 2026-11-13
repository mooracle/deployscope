'use strict';

const crypto = require('node:crypto');

// King Wen number by [lower trigram][upper trigram]. A trigram is three bits,
// bottom line first, 1 = yang: index = bottom * 4 + middle * 2 + top.
// 0 Earth, 1 Mountain, 2 Water, 3 Wind, 4 Thunder, 5 Fire, 6 Lake, 7 Heaven.
const KING_WEN = [
  [2, 23, 8, 20, 16, 35, 45, 12],
  [15, 52, 39, 53, 62, 56, 31, 33],
  [7, 4, 29, 59, 40, 64, 47, 6],
  [46, 18, 48, 57, 32, 50, 28, 44],
  [24, 27, 3, 42, 51, 21, 17, 25],
  [36, 22, 63, 37, 55, 30, 49, 13],
  [19, 41, 60, 61, 54, 38, 58, 10],
  [11, 26, 5, 9, 34, 14, 43, 1],
];

// [name, score delta, reading], in King Wen order.
const HEXAGRAMS = [
  ['The Creative', 10, 'Six unbroken lines. Build, and do not hesitate.'],
  ['The Receptive', 4, 'Yield. Today the runbook leads and you follow.'],
  ['Difficulty at the Beginning', -6, 'First deploys are painful. Expect a broken bootstrap.'],
  ['Youthful Folly', -8, 'Inexperience. Somebody did not read the docs.'],
  ['Waiting', -3, 'Not yet. Let the queue drain first.'],
  ['Conflict', -10, 'Merge conflicts, in the code or in the meeting.'],
  ['The Army', 5, 'Discipline. A coordinated rollout succeeds.'],
  ['Holding Together', 7, 'Union. The services agree on their contracts.'],
  ['Small Taming', 2, 'Small restraint. Ship the small change, hold the big one.'],
  ['Treading', -2, 'Treading on the tail of the tiger. Careful steps still reach production.'],
  ['Peace', 12, 'Heaven and earth are in communion, and so are dev and ops.'],
  ['Standstill', -12, 'Heaven and earth do not meet, and neither do dev and ops.'],
  ['Fellowship', 8, 'Fellowship in the open. The reviewers are with you.'],
  ['Great Possession', 12, 'Abundance. Quota is plentiful.'],
  ['Modesty', 6, 'Modesty. A small diff is a virtue.'],
  ['Enthusiasm', 5, 'Momentum. The team is eager; channel it.'],
  ['Following', 3, 'Follow upstream. Rebase first.'],
  ['Work on the Decayed', -5, 'What has been spoiled must be repaired before anything new is added.'],
  ['Approach', 6, 'Something good approaches. Act while it does.'],
  ['Contemplation', 0, 'Observe. Look at the dashboards before acting.'],
  ['Biting Through', 2, 'An obstacle sits between the teeth. The blocker yields to decisive action.'],
  ['Grace', -2, 'Form over substance. The UI is polished; the backend is not.'],
  ['Splitting Apart', -14, 'Collapse from below. Check the base image.'],
  ['Return', 8, 'The turning point. The rollback is clean and recovery begins.'],
  ['Innocence', 3, 'The unexpected happens, though not through any fault of yours.'],
  ['Great Taming', 6, 'Great restraint stores great power. The feature flag holds.'],
  ['Nourishment', 2, 'Mind what you feed the system. Validate the inputs.'],
  ['Great Exceeding', -10, 'The ridgepole sags. Load exceeds capacity.'],
  ['The Abysmal', -12, 'Pit within pit, retry within retry.'],
  ['The Clinging', 5, 'Clarity. Observability is good and the traces are bright.'],
  ['Influence', 5, 'Mutual attraction. The integration succeeds.'],
  ['Duration', 9, 'Endurance. Uptime persists.'],
  ['Retreat', -7, 'Withdraw in good order. Roll back while it is still a choice.'],
  ['Great Power', 7, 'Great strength, to be used within limits.'],
  ['Progress', 10, 'The sun rises over the earth. Rapid, easy advance.'],
  ['Darkening of the Light', -10, 'The light is wounded. Monitoring is blind.'],
  ['The Family', 5, 'Each in their proper role. Permissions are correctly scoped.'],
  ['Opposition', -7, 'Estrangement. Two services misunderstand each other.'],
  ['Obstruction', -9, 'Water on the mountain. You are blocked; seek help.'],
  ['Deliverance', 10, 'The knot loosens. The incident resolves.'],
  ['Decrease', -3, 'Less. Cut scope and it goes well.'],
  ['Increase', 10, 'Gain. It furthers one to cross the great water: migrate.'],
  ['Breakthrough', 6, 'Resolution. Decide, and announce it publicly.'],
  ['Coming to Meet', -6, 'An unexpected encounter. An unvetted dependency enters.'],
  ['Gathering Together', 4, 'Many gather. Expect a traffic peak.'],
  ['Pushing Upward', 9, 'Steady ascent. The gradual rollout climbs unhindered.'],
  ['Oppression', -11, 'The lake has drained. Resources are exhausted.'],
  ['The Well', 4, 'The well serves all, if the rope reaches. Check connectivity.'],
  ['Revolution', 3, 'Molting. The time for the breaking change has come.'],
  ['The Cauldron', 9, 'The vessel is sound. The container holds.'],
  ['The Arousing', -6, 'Shock. Thunder upon thunder: alarms first, laughter later.'],
  ['Keeping Still', -4, 'The mountain does not move. Today, neither should you.'],
  ['Gradual Progress', 7, 'The wild goose approaches the shore step by step. Canary.'],
  ['The Marrying Maiden', -8, 'Out of position. Undertakings bring misfortune.'],
  ['Abundance', 8, 'Fullness at noon. It will not last; ship now.'],
  ['The Wanderer', -3, 'The traveller owns nothing. Ephemeral environments, nothing persists.'],
  ['The Gentle', 4, 'Wind penetrates. Small, repeated efforts succeed.'],
  ['The Joyous', 8, 'Joy. The users are pleased.'],
  ['Dispersion', -5, 'Things scatter. Check DNS and distributed state.'],
  ['Limitation', 1, 'Limits. Rate limits are a kindness.'],
  ['Inner Truth', 7, 'Sincerity. The tests test what they claim to test.'],
  ['Small Exceeding', -2, 'Small things may be done, great things may not. A patch, not a major.'],
  ['After Completion', 3, 'Everything is in its place. Good fortune at the start, disorder at the end: watch it after the deploy.'],
  ['Before Completion', -5, 'The fox wets its tail just short of the far bank. The last step fails.'],
];

function hexagram(lines) {
  const trigram = (offset) => lines[offset] * 4 + lines[offset + 1] * 2 + lines[offset + 2];
  const number = KING_WEN[trigram(0)][trigram(3)];
  const [name, delta, reading] = HEXAGRAMS[number - 1];
  return { number, name, delta, reading, symbol: String.fromCodePoint(0x4dc0 + number - 1) };
}

// Three-coin method, one hash bit per coin: heads 3, tails 2, so each line is
// 6 (old yin), 7 (young yang), 8 (young yin) or 9 (old yang). Old lines change,
// producing the relating hexagram: where the situation is heading.
function cast(seed) {
  const hash = crypto.createHash('sha256').update(`iching:${seed}`).digest();
  const values = [];
  for (let line = 0; line < 6; line++) {
    let sum = 0;
    for (let coin = 0; coin < 3; coin++) {
      const bit = line * 3 + coin;
      sum += 2 + ((hash[bit >> 3] >> (bit & 7)) & 1);
    }
    values.push(sum);
  }
  const lines = values.map((v) => v % 2);
  const changing = values.map((v) => v === 6 || v === 9);
  const primary = hexagram(lines);
  const relating = changing.includes(true) ? hexagram(lines.map((l, i) => (changing[i] ? 1 - l : l))) : null;
  return { values, lines, changing, primary, relating };
}

module.exports = { KING_WEN, HEXAGRAMS, hexagram, cast };
