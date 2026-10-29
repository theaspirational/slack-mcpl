# Re-review (round 3) — TASK-V08EN @ `8130e8735b5f3779f12b4bec7f32743f067f40e9`

Fix round for my re-review of `d9fa8ab5`
(`/home/orgasmic/.orgasmic/runs/run-01M63KQDN21CVP6GW7K3KX9KKC/evidence/report.md`).
One commit on upstream main `7274283f`; `git status --porcelain` empty, only ignored
`dist/` and `node_modules/`; worktree `src/slack-adapter.ts` byte-identical to HEAD after
all probes. Read-only: every probe and mutation ran in scratch copies under
`/tmp/rev3-v08en/{head,m18}`, never in the worktree.

## Verdict

**Approve — no blocker.** The single MEDIUM from my round-2 re-review is genuinely fixed,
and I re-proved it rather than taking the report's word: my unchanged `probe5` now returns
Slack's actionable refusal in all three failed-join cases where it previously returned a
success-shaped "Nothing changed", and the confirmed-removal and `no_reaction` joins still
short-circuit with exactly one Slack call. 17 of 18 mutations killed, 626/626 on all three
Node versions, typecheck green.

Two LOW findings, neither a shipping concern: one real test gap I proved by differential
probe (the manual path's `gone` write is load-bearing but no test covers it, and it is
unreachable through the MCP tool path today), and one un-rewrapped README line. No HIGH, no
MEDIUM, no unmet acceptance criterion, no security or MSRV problem, no data loss.

## Findings

### LOW — test — `src/slack-adapter.ts:1458`: the manual path's `gone = true` on confirmed removal is load-bearing but untested

`entry.gone = true` in `removeReaction`'s success branch is the one `gone` write with no
test behind it. Mutation **M18** (delete that assignment, keeping the `dropAck`) **survived
the entire 626-test suite**, not just `test/reactions.test.ts`
(`gate-rev3-mutations-01M63N08WEQQ6E8KMRJCS1FFYJ.log`,
`gate-rev3-mutation-M18-full-01M63N2HD3FE1KRKNH9BG80D8B.log`).

It is not dead code. `$ORGASMIC_EVIDENCE_DIR/probe8.ts` (log `probe8.log`) runs two
overlapping `removeReaction` calls at the adapter, the second joining the first's
`entry.removing`:

```
########## HEAD (shipped) ##########
first:  resolved true
second: resolved false              → "Nothing changed", correct
removals: 1
########## M18 mutant ##########
first:  resolved true
second: REJECTED An API error occurred: no_reaction
removals: 2
```

So the assignment is exactly what prevents the round-1 MEDIUM-1 bug class (a redundant
second Slack call and a spurious `no_reaction`) on the manual-join path — and nothing
guards it against regression.

**Reach is bounded, which is why this is LOW, not MEDIUM.** The read of `gone` requires a
second `removeReaction` to overlap the first's `entry.removing`, and the server serializes
`tools/call`: re-verified at this commit, 603 ms for two 300 ms calls, strictly sequential
(`probe7.log`, `enter:1.0 exit:1.0 enter:2.0 exit:2.0`). `clearAck` joins `entry.removing`
but never reads `gone`. So only a direct adapter consumer, or a future change that
unserializes tool calls, can reach it. Shipped behavior is correct today.

**Fix direction:** add one adapter-level test in the shape of `probe8.ts` — two overlapping
`removeReaction` calls on a pending ACK, asserting the second resolves `false` and that
`reactions.remove` was called exactly once. That kills M18 and pins the invariant for
whoever later changes the server's concurrency.

### LOW — docs — `README.md:88`: the inserted sentence was not re-wrapped

The new sentence leaves a 144-character line in the middle of a paragraph whose other
lines are all 79:

```
a failure, the tool makes its own removal attempt and reports Slack's answer. Manual ACK removals share automatic cleanup's five-attempt budget:
```

The content is accurate; only the wrap is wrong, and it shows up as an oddly-shaped hunk in
the upstream PR diff. The changelog fragment has the milder version of the same thing (a
short `Manual ACK removal shares the` line). **Fix direction:** re-wrap the paragraph at
the file's prose width.

## Answers 1–5

**1. `probe5` re-run unchanged: the MEDIUM is fixed, and the success join is intact.**

I copied my round-2 `probe5.ts` byte-for-byte into a scratch tree whose
`src/slack-adapter.ts` sha256 matches the worktree's (`6b799fd9…`) and ran it untouched.
All three failed-join cases flipped (`probe5.log`):

```
[is_archived]   manual isError=true
[is_archived]   manual text: An API error occurred: is_archived / No reaction was removed:
                conversation C1 is archived, so nothing can be posted or changed there.
                Calling again won't change that unless someone in the workspace unarchives it.
[is_archived]   slack log: add:10.0:eyes post remove:10.0:eyes remove:10.0:eyes
[not_authed]    isError=true, "Slack doesn't accept this server's bot token…"
[missing_scope] isError=true, "…hasn't been granted the scope this call needs…"
```

Round 2 produced `isError=false` and `Nothing changed: ACK cleanup for message 10.0 already
finished.` for each of these, with only one removal in the Slack log. The agent now gets
the same actionable text as the no-join control, and the second `remove:10.0:eyes` is the
manual call obtaining its own answer. The reaction is still on the message in all three
cases, which is correct and pre-existing: a terminal refusal genuinely cannot remove it —
the bug was only that the agent was told otherwise.

The success side still holds (`probe5b.ts`, log `probe5b.log`), both outcomes that set
`gone`:

| Joined cleanup outcome | `isError` | text | `reactions.remove` calls | reaction after | `ackPending` after |
| --- | --- | --- | --- | --- | --- |
| confirmed success | false | `Nothing changed: ACK cleanup for message 10.0 already finished.` | **1** | gone | 0 |
| `no_reaction` | false | same | **1** | still there (Slack said so) | 0 |

Both assert `removals === 1` and an empty `ackPending`, so the short-circuit still saves the
redundant call and leaks nothing.

**2. The `gone` flag: set only on confirmed removal or `no_reaction`, on both paths. No new
race or leak.**

Four writes, all guarded:

| Site | Condition |
| --- | --- |
| `:1193` automatic | after `reactions.remove` resolved |
| `:1196` automatic | `slackRefusal(err) === 'no_reaction'` |
| `:1458` manual | after `reactions.remove` resolved |
| `:1463` manual | `slackRefusal(err) === 'no_reaction'` |

No write on any other failure, and `no_reaction` is in `refusedForGood` (it is a Slack
refusal not in `SLACK_FAILED`), so every `gone = true` is immediately followed by a
`dropAck` on both paths — there is no state where `gone` is true and the entry is still the
live map entry. `dropAck` is identity-guarded (`pending.get(ts) !== entry`), so a newer
entry for the same `ts` is never clobbered by a stale entry's flag, and the flag is per
`AckEntry` object, so it cannot survive into a later `acknowledge`.

Mutations confirm the guards are load-bearing: **M16** (set `gone` on *every* automatic
cleanup failure — i.e. revert this round's fix) is KILLED by all four new tests, and
**M17** (set `gone` on every *manual* failure) is KILLED by the exhausted-budget test. Only
M18 survives (the LOW above).

*No new race.* The read is `if (entry.gone) return false;` immediately after
`await entry.removing`, and the reservation is still synchronous — `clearTimeout` →
`remove()` → `entry.removing = …` with no await between them — so no `clearAck` or second
removal can observe `removing === undefined` mid-flight. The fix replaced a map lookup with
a field read on the same object, which removes a dependency on map state rather than adding
one.

*No new leak.* `ackPending` was empty after every probe that completes: `probe5b` (both
cases, asserted), `probe8`, `probe9`. The terminal-failure fall-through path, which is the
new code path, cannot strand a timer: after `dropAck` the entry is out of the map, and the
re-arm in the `finally` is identity-guarded
(`if (this.ackPending.get(channelId)?.get(ts) === entry)`), so it no-ops. **M4** (drop that
re-arm) and **M3** (drop the timer cancellation) are both still killed.

*The one path where `gone` stays unset by design* — I probed it rather than assuming. If
the ACK add never landed, `removeAck` returns at `if (!(await entry.added))` without a
Slack call and without setting `gone`, so a joined manual removal falls through and asks
Slack. `probe9.ts` (log `probe9.log`): one `reactions.remove`, `REJECTED An API error
occurred: no_reaction`, `ackPending` 0 before and after `stop()`. That is the honest answer
— the reaction really is not there — and matches the documented `remove_reaction` contract
("`no_reaction` is an error saying the bot has no such reaction"). It costs one API call
that round 2's false success avoided; correctness over the call, which is the right trade.

**3. Mutations: 17 of 18 killed.** My 15 from round 2 re-anchored to this round's code, plus
3 new ones aimed at `gone` (I ran 3 rather than the 2 asked for, to cover both the
automatic and the manual write). Driver `mutate3.mjs`, scratch `/tmp/rev3-v08en/head`,
originals restored in a `finally`; every anchor matched exactly once (no skips).

```
M1  drop the wait for a pending ACK add ............................ KILLED (1)
M2  drop the join with a running automatic cleanup ................. KILLED (6)
M3  drop the ACK timer cancellation ................................ KILLED (1)
M4  never re-arm cleanup after a failed manual removal ............. KILLED (3)
M5  retire the ACK on any failure, not just the terminal ones ...... KILLED (4)
M6  report the raw reaction count as omitted ....................... KILLED (2)
M7  never emit reactionsOmitted .................................... KILLED (2)
M8  remove_reaction is not a write for the error explainer ......... KILLED (1)
M9  drop the DM restriction on removal ............................. KILLED (1)
M10 reaction metadata escapes the byte budget ...................... KILLED (7)
M11 revert MEDIUM-1: no short-circuit after a confirmed cleanup .... KILLED (2)
M12 revert MEDIUM-2: assert own:false when the bot is absent ....... KILLED (2)
M13 revert LOW-6: manual attempt off the budget .................... KILLED (3)
M14 revert LOW-6: ignore the attempt budget on manual failure ...... KILLED (1)
M15 revert LOW-5: trust Slack's reaction shape ..................... KILLED (4)
M16 NEW: set gone on EVERY automatic cleanup failure ............... KILLED (4)
M17 NEW: set gone on EVERY manual failure .......................... KILLED (1)
M18 NEW: never record confirmed removal on the entry (manual) ...... SURVIVED  ← LOW above
```

M2 now kills 6 tests rather than 1, and M16 kills exactly the four new failed-join tests,
so this round's tests are the thing doing the killing. M18 also survived the full suite.

**4. Suites and typecheck: green, 626 as expected.**

| Runtime | Result | Source |
| --- | --- | --- |
| Node 22.23.3 | 626 pass / 0 fail | my gate `rev3-full-22.23.3` |
| Node 24.22.1 | 626 pass / 0 fail | my gate `rev3-full-24.22.1` |
| Node 22.12.0 | 626 pass / 0 fail | reusable receipt `full-22.12.0` at this commit, read not rerun |
| typecheck 22.23.3 | pass | my gate `rev3-typecheck-22.23.3` |
| typecheck 24.22.1 | pass | reusable receipt at this commit, read not rerun |

The brief's three suites and typecheck are all accounted for. 22.23.3 and 24.22.1 had no
reusable receipt at this commit, so I ran them; 22.12.0 and typecheck-24.22.1 did, so I read
the logs per the receipt rules. `reactions-repeat-5` (43/43), `changelog`, `diff-check` and
`r3-final-state` receipts at this commit also read and clean.

**5. README, changelog and PR body: accurate and public-safe, one wrap nit.**

Accuracy — the changed sentences now match what I measured. `README.md:86`–`90` says the
short-circuit happens when cleanup "confirms removal (or `no_reaction`)" and that otherwise
"the tool makes its own removal attempt and reports Slack's answer": exactly `probe5b` and
`probe5` respectively. `changelog.d/slack-reactions.added.md:12`–`16` carries the same
correction. The secondary wording problem I raised in round 2 — docs describing the join as
unconditionally successful — is resolved. The retained sentence "Manual ACK removals share
automatic cleanup's five-attempt budget: transient failures retry after one minute; terminal
refusals, shutdown and the fifth failure retire cleanup" remains true of what it describes
(a manual failure increments `tries` and obeys the same drop rule — M13/M14 still killed);
it is about retry/retirement, not a promise that an explicit call is refused locally, and
an explicit call always reaching Slack is the behavior I accepted as correct in round 2.

Public-safe — I scanned `README.md`, the changelog fragment and `pr-body.md` for
`orgasmic`, `/home/`, run IDs, dispatch/evidence/task identifiers and credential patterns:
no hits. The only `xoxb-`/`xapp-` strings are pre-existing README placeholders in the setup
instructions. The PR body's claims match my measurements (626 vs 583, three runtimes, 43
reaction tests, the 39/4 red run, the `gone` mutation), its Slack doc links are the real
ones, and its "Not verified" and "Out of scope" sections are honest. Commit metadata is as
required: default author, one commit on `7274283f`, `Co-Authored-By: GPT-6-Astra`.

## Verification Gates

All run through `orgasmic dispatch gate <name> -- …` in the worktree. Logs are in
`/home/orgasmic/.orgasmic/runs/run-01M63MQZF4HSATTEPGP0TF1DQP/evidence`.

| Gate | Command after `timeout 900` | Result | Log |
| --- | --- | --- | --- |
| `rev3-typecheck-22.23.3` | `npm run typecheck` | exit 0 | `gate-rev3-typecheck-22.23.3-01M63MW7ZHJG1NG85B3XPRQJZS.log` |
| `rev3-full-22.23.3` | `npm test` | exit 0, 626/626 | `gate-rev3-full-22.23.3-01M63MW87H0G5E0H9NRA5MMQQD.log` |
| `rev3-full-24.22.1` | `npm test` (PATH Node 24.22.1) | exit 0, 626/626 | `gate-rev3-full-24.22.1-01M63MWPR44B7H2AQ32MTESRG7.log` |
| `rev3-mutations` | `node mutate3.mjs` (18 mutations) | exit 0, 17 killed / 1 survived | `gate-rev3-mutations-01M63N08WEQQ6E8KMRJCS1FFYJ.log` |
| `rev3-mutation-M18-full` | `node mutate3.mjs full M18` | exit 0, survived | `gate-rev3-mutation-M18-full-01M63N2HD3FE1KRKNH9BG80D8B.log` |

Unwrapped scoped probes (evidence, not reusable receipts), all in scratch copies:
`probe5.log` (round-2 probe, unchanged), `probe5b.log`, `probe7.log`, `probe8.log`,
`probe9.log`, with sources alongside them.

Receipts read rather than rerun, all at `8130e873…` with `clean=yes`: `full-22.12.0`
(626/626), `typecheck-24.22.1`, `build-24.22.1`, `reactions-repeat-5` (43/43), `changelog`,
`diff-check`, `r3-mutation-gone`, `r3-final-state`.

Conditions held: notifiers off (`NO_UPDATE_NOTIFIER=1`,
`npm_config_update_notifier=false`), empty user/global npmrc at `/tmp/task-v08en`, the
loopback-only listener guard preloaded through `NODE_OPTIONS` for every test and probe, all
suites under `timeout 900`. No install was needed (`node_modules` present from the
implementer's `npm ci --ignore-scripts`). No commit, no edit, no new file in the worktree;
tree verified clean and `src/slack-adapter.ts` unchanged afterwards.

## Unmet Criteria / test gaps

No unmet acceptance criterion. Task acceptance is met and was re-proved across rounds:
reactions in history and thread output, own-reaction removal, clear fixed errors for a
missing or not-own reaction, access policy blocking read and removal, and no change to
output for messages without reactions (round-2 A/B byte-identity, with M10 still killing
budget escape).

Test gaps:

1. **The LOW above** — no test covers two overlapping manual removals, so the manual
   path's `gone` write on confirmed removal is unprotected (M18 survives the full suite).
   `probe8.ts` is a ready-made test.
2. **No test pins `tools/call` serialization.** The LOW's severity rests on it, and I only
   verified it by probe (`probe7.log`). If the server ever processes tool calls
   concurrently, gap 1 becomes reachable from an agent with nothing failing.
3. **The never-landed-ACK join** (`probe9`) has no test — the behavior is correct, but the
   `if (!(await entry.added))` early return is the one `gone`-unset path, and no assertion
   fixes what a joined manual removal should report there.
4. Unchanged from earlier rounds: no live Slack workspace or external MCPL host; malformed
   reaction entries are dropped without being counted in `reactionsOmitted`.

## Residual Risk

- Gap 1 is latent, not live: serialization closes it today, and it self-corrects anyway
  (the loser gets a `no_reaction` error, the reaction is already gone). A future change to
  the server's call handling is the thing that would surface it, with no test to catch it.
- Pre-existing and unchanged by this round: an ACK add whose request times out can still
  land after removal, so a reaction can survive cleanup; a terminal refusal still leaves the
  reaction on the message — now correctly reported rather than hidden.
- Joining an exhausted cleanup issues one Slack request beyond the five-attempt budget.
  Intended (an explicit agent call must get a real answer), asserted by the `exhausted`
  test, and bounded — the entry is already retired, so no retry follows.
- No live-Slack verification of reaction metadata shapes; the validation is defensive and
  omits rather than guesses, which M12/M15 still pin.
- Future rebases may conflict in `src/slack-adapter.ts` and `src/server.ts`, the two files
  this PR shares with #55/#56.

## Fix Directions

1. (LOW, test) Add `probe8.ts` as a test: two overlapping adapter-level `removeReaction`
   calls on a pending ACK → the second resolves `false`, `reactions.remove` called once.
   Optionally add an assertion that `tools/call` is serialized, so gap 2 fails loudly if
   that ever changes.
2. (LOW, docs) Re-wrap the `README.md:86`–`90` paragraph at the file's prose width, and the
   `Manual ACK removal shares the` line in the changelog fragment.

Neither blocks the PR. Both are one-line-scale changes a maintainer could also fold in at
review time. Merge, publication and rollout remain separate owner decisions.
