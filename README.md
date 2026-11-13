# deployscope

Your deployment horoscope: a GitHub Action that decides whether you may deploy
by reading the planets, the repository's natal chart, a tarot spread, an
I Ching hexagram and, for tagged releases, the numerology of the version.

The astronomy is real. The conclusions are not. Everything in between is
deterministic, tested, and reported as ordinary CI errors.

```
Error: OMEN001 Mercury is retrograde
  Mercury rules networking, DNS and message queues, and it is moving backwards
  through Cancer. Messages will be lost, duplicated, or delivered to the wrong
  environment. (-25)
Error: OMEN011 The Moon is void of course
  The Moon makes no further aspect before it enters Gemini around 2026-07-10
  23:00 UTC. Nothing begun under a void Moon comes to anything: the deploy will
  succeed and change nothing, or be rolled back. (-12)
Error: OMEN031 Read-only Friday
  No planet forbids a Friday deploy; the elders of operations do. Whoever ships
  today owns the weekend. (-15)
Error: OMEN500 Verdict
  ILL-OMENED: the heavens advise against this deployment (score 1/100, required 25).
  The next favourable window opens around 2026-07-13 00:00 UTC (score 27).
  Re-running before then will not help: the cards and the hexagram are bound to
  the commit.
```

![An example reading: chart wheel, tarot spread and hexagram](docs/reading-example.svg)

## Usage

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: mooracle/deployscope@v1
        with:
          timezone: Europe/Berlin
      - run: ./deploy.sh   # only reached when the omens allow it
```

Advisory mode, using the outputs yourself:

```yaml
      - id: oracle
        uses: mooracle/deployscope@v1
        with:
          defy-fate: true
      - if: steps.oracle.outputs.verdict == 'ill-omened'
        run: echo "come back at ${{ steps.oracle.outputs.next-window }}"
```

On pull requests the reading is also posted as a comment, laid out like a
deployment bot's: one row with the status, score, spread and hexagram, and the
full reading (card and hexagram pictures, every omen) folded under it. Give the
job permission to do so:

```yaml
    permissions:
      contents: read
      pull-requests: write
```

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `seed` | `github.sha` | What the cards and hexagram are cast for. Same seed, same casting. |
| `time` | now | ISO 8601 moment to read the sky for. |
| `timezone` | `UTC` | IANA time zone that decides which weekday it is. |
| `born` | repository creation time | Birth moment for the natal chart, ISO 8601 or Unix seconds. |
| `version` | tag name on tag builds | Release version for numerology. Empty on branch builds, so numerology applies to tagged releases only. |
| `fail-below` | `25` | Fail the job when the score is below this. |
| `defy-fate` | `false` | Report everything, never fail. |
| `comment` | `true` | On pull requests, post the reading as a comment. One comment per pull request, rewritten on every run. |
| `publish-branch` | empty | Branch to commit the reading's SVG to, so the chart wheel appears in the comment. Needs `contents: write`. |
| `github-token` | `github.token` | Token for the comment and for publishing. |

`born` comes from the event payload, which scheduled runs do not carry; set it
explicitly there, or the natal chart is skipped.

### Outputs

| Output | Meaning |
| --- | --- |
| `verdict` | `auspicious`, `tolerable` or `ill-omened` |
| `score` | 0-100 |
| `cards` | the three cards drawn |
| `hexagram` | the hexagram cast, and the one it changes to |
| `mercury-retrograde` | `true` while Mercury moves backwards, stations included |
| `moon-phase` | current lunar phase |
| `moon-void` | `true` when the Moon is void of course |
| `sun-sign` | the repository's Sun sign |
| `release-number` | numerological number of the version, on tagged releases |
| `next-window` | when ill-omened, the hour at which the verdict next improves |
| `reading-svg` | path of the reading drawn as an SVG, for `actions/upload-artifact` |
| `reading-url` | URL of the published SVG, when `publish-branch` is set |

### Exit codes

`0` deploy permitted, `1` ill-omened, `2` the oracle could not be consulted
(invalid input).

## Pictures

Every run draws the reading as one SVG: the verdict and the score against the
pass mark; the chart wheel (the sky now, aspects as chords, the natal chart as
gold dots, retrograde planets in red, the Moon's phase in the middle) with the
same positions as a table beside it; the omens that weigh most; the three
cards; and the hexagram with its changing lines. Planet and sign glyphs are
drawn as paths, not taken from a font, so the picture looks the same
everywhere. Its path is the `reading-svg` output.

GitHub does not render inline SVG in comments or job summaries, only images
with a URL, so the comment gets its pictures two ways:

- **Cards and hexagrams** are static files in this repository's `assets/`
  directory, linked at the ref the action is used at. No extra permission, but
  the action's repository has to be readable by whoever views the comment.
- **The chart wheel** is different on every run. Set `publish-branch` (for
  example `deployscope-readings`) and the SVG is committed to that branch and
  embedded in the comment. The branch is created as an orphan if missing and
  gains one file per run.

A failure to comment or publish is a warning (`OMEN450`, `OMEN451`), never a
failed job: pull requests from forks get a read-only token.

## Theoretical basis

**1. The sky is computed, not looked up.** Planetary positions come from JPL's
Keplerian elements ("Approximate Positions of the Planets", valid 1800-2050):
solve Kepler's equation for each planet and for Earth, subtract, and take the
geocentric ecliptic longitude, corrected for precession to the tropical
zodiac. The Moon uses the truncated Astronomical Almanac series. Accuracy is a
few arcminutes for planets and about 0.3° for the Moon, which is far better
than the interpretation deserves. No network, no dependencies.

**2. Retrograde is a sign change in a derivative.** A planet is retrograde when
its geocentric longitude is decreasing (central difference over one day).
Mercury moving slower than 0.2°/day is "stationary": the turning point of the
cycle and its most intense moment. Stationing retrograde (speed still falling)
is the worst case (-30, against -25 mid-retrograde); stationing direct (speed
rising) is the mildest (-15), since the retrograde is ending.

**3. Doctrine of correspondences.** Each body governs a part of the pipeline:

| Body | Governs |
| --- | --- |
| ☉ Sun | the main branch |
| ☽ Moon | the on-call mood |
| ☿ Mercury | networking, DNS and message queues |
| ♀ Venus | the UI and user affection |
| ♂ Mars | hotfixes and force pushes |
| ♃ Jupiter | scaling and capacity |
| ♄ Saturn | tech debt and compliance |
| ♅ Uranus | sudden outages and shiny rewrites |
| ♆ Neptune | caches, mocks and other illusions |

**4. Aspects.** Two bodies within 5° of an angle of 0°, 60°, 90°, 120° or 180°
are in aspect. Sextiles and trines are harmonious (+4, +6 with a benefic:
Venus, Jupiter). Squares and oppositions are hard (-4, -7 with a malefic: Mars,
Saturn, Uranus). Conjunctions take the nature of the planets involved. Aspects
between two slow planets (Jupiter and beyond) last for months and are ignored,
since they are nobody's deploy's fault. Sun-Moon aspects are the lunar phase
and are judged there, not twice.

**5. Time.** Each weekday has its classical planetary ruler and takes its
character from it; Thursday (Jupiter) is best. A day whose ruler is retrograde
or stationary works against you. Friday belongs to Venus, a benefic, so the
no-deploy rule is not hers: it is scored separately as operational custom
(`OMEN031`, and `OMEN032` for the weekend). The lunar phase is the Sun-Moon
elongation. As in electional astrology, the dark Moon is against beginnings
(-6), the first crescent after it is the best time to start something (+7),
the rest of the waxing Moon favours shipping, full moon raises incident risk,
and the waning Moon favours deleting code.

**6. Void-of-course Moon.** From electional astrology, the branch concerned
with choosing when to begin things. The Moon is void when it will complete no
further major aspect to any body before leaving its sign, and what is begun
then "comes to nothing". It is found by stepping the Moon forward in half-hour
steps to the sign boundary and looking for an exact aspect on the way. With
eight bodies to aspect, the Moon is void about a fifth of the time.

**7. Natal chart.** The repository is born when it is created; its chart is
the sky of that moment and its Sun sign gives its character. The reading then
becomes personal, so two repositories get different verdicts at the same
instant:

- *Transits*: today's planets against the natal Sun (the repository's core
  purpose), Moon (its users' habits) and Mercury (its APIs), orb 3°, scored
  like aspects by the nature of the transiting planet.
- *Solar return*: the Sun back at its natal place, the repository's birthday
  (+10, good for a major version).
- *Lunar return*: the Moon back at its natal place, every 27 days (+4).
- *Saturn cycle*: Saturn square or opposite its natal place, roughly every
  seven years (-8), and the Saturn return near 29.5 years (-15, time for the
  rewrite).

**8. Tarot.** Three major arcana are drawn without replacement for Build
(past), Deploy (present) and Production (future), upright or reversed, from
SHA-256 of the seed.
The cards are drawn in neon, each scene on its own:

![The 22 major arcana](docs/deck.svg)

**9. I Ching.** A hexagram is six binary lines, so it is the oracle native to
the medium. It is cast by the three-coin method with one hash bit per coin:
each line comes out 6, 7, 8 or 9 with the traditional odds of 1:3:3:1. Lines of
6 and 9 are "old" and change into their opposite, giving a second hexagram for
where the situation is heading. How much each weighs follows the number of
changing lines, after Zhu Xi: with one or two the present hexagram governs
(the future counts a quarter), with three the two are read together (three
quarters each), with four or five the future governs (the present counts a
quarter), with six the present has turned over completely. Hexagrams are
looked up by trigram pair in the King Wen sequence, and scored by their
judgment: "it furthers one to cross the great water", the classical phrase for
a large undertaking, is read as leave to deploy.

**10. Numerology, for tagged releases.** The digits of the version are summed
and reduced to a single digit, except for the master numbers 11, 22 and 33:
`v2.4.1` is a 7. Each number has a character (1 beginnings, 4 foundation,
5 restless change, 8 success, 9 endings). A version component equal to 13
carries its own penalty.

**11. Fate and free will.** Cards, hexagram and release number derive from the
commit and the tag, so they are properties of the thing being deployed:
re-running the job cannot re-roll them. The sky moves, so the same commit can
legitimately get a different answer later.

**12. Verdict and the next window.** Start from 75 (baseline optimism), add
every omen's delta, clamp to 0-100. Below `fail-below` (default 25) is
`ill-omened` and fails the job; 85 and above is `auspicious`; in between is
`tolerable`. The defaults are calibrated so that roughly one deployment in ten
is refused; which one is up to the stars. Every
omen is printed with its delta, so any verdict can be audited line by line.
A refused deployment is told when to come back: the same question is asked
again for every hour of the next 14 days, and the first hour that passes is
reported in the error and in the `next-window` output.

In simulation with the defaults (natal chart on, no release tag), 8.8% of
deployments are refused in 2026, 13.6% in 2027, 7.8% in 2028 and 9.6% in 2029;
about 18% are auspicious and the rest tolerable. Some years are simply worse
than others.

### Error codes

| Code | Meaning |
| --- | --- |
| `OMEN001` | Mercury retrograde (-25) |
| `OMEN002` | Another planet retrograde |
| `OMEN003` | Mercury stationing retrograde (-30) or direct (-15) |
| `OMEN010` | Lunar phase |
| `OMEN011` | Moon void of course (-12) |
| `OMEN013` | Friday the 13th |
| `OMEN020` | Planetary aspect |
| `OMEN030` | Planetary ruler of the weekday |
| `OMEN031` | Read-only Friday (custom, not astrology) |
| `OMEN032` | Weekend deploy (custom, not astrology) |
| `OMEN040` | Transit to the natal chart |
| `OMEN041` | Solar return |
| `OMEN042` | Lunar return |
| `OMEN043` | Saturn cycle or Saturn return |
| `OMEN100`-`OMEN121` | Tarot card (number of the arcanum) |
| `OMEN200` | Verdict: deploy permitted |
| `OMEN299` | Verdict: ill-omened, but fate was defied |
| `OMEN301`-`OMEN364` | I Ching hexagram (King Wen number) |
| `OMEN400` | Invalid input |
| `OMEN450` | The comment could not be posted (warning) |
| `OMEN451` | The reading could not be published (warning) |
| `OMEN500` | Verdict: ill-omened |
| `OMEN601`-`OMEN633` | Release number |
| `OMEN613` | Version contains 13 |

## Development

```sh
npm test                                   # node --test, no dependencies
npm run divine                             # consult the oracle for right now
npm run assets                             # regenerate assets/ after changing src/svg.js
INPUT_TIME=2026-07-10T12:00:00Z INPUT_SEED=1197955 \
  INPUT_BORN=2020-11-13T09:00:00Z INPUT_VERSION=v2.4.1 npm run divine
```

Layout:

- `src/ephemeris.js`: planetary positions, retrogrades, void-of-course Moon
- `src/natal.js`: the repository's birth chart
- `src/tarot.js`, `src/iching.js`, `src/numerology.js`: the other oracles
- `src/omens.js`: rules, scoring, verdict, next-window forecast
- `src/report.js`: log, annotations and job summary
- `src/svg.js`: drawings; `scripts/build-assets.js` writes the static ones to `assets/`
- `src/arcana.js`: the 22 card scenes, each drawn on its own as neon line art
- `src/comment.js`, `src/github.js`: the pull request comment and the API calls behind it
- `src/main.js`: action entry point

## Disclaimer

Not a substitute for tests, staging, or a rollback plan. Planets do not read
your changelog.
