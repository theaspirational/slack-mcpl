# Re-review — TASK-V08EN @ `d9fa8ab55af6cdd13d95d0b147bb937d376988e1`

Fix round for my review of `9b43671e` (`/home/orgasmic/.orgasmic/runs/run-01M63J5ABFCB4YT7JDXDJQS4TD/evidence/report.md`).
One commit on upstream main `7274283f`; worktree left clean at the reviewed commit
(`git status --porcelain` empty; only ignored `dist/`). Read-only: every probe and
mutation ran in scratch copies under `/tmp/rev2-v08en/{base,head}`, never in the worktree.

## Verdict

**Approve with changes — no blocker.** All six findings from round 1 are genuinely fixed,
and I re-proved each one rather than taking the report's word: the production-path
reproduction of MEDIUM-1 now returns success, all 10 of my mutations are killed (the 3
that survived last round included), plus 5 new mutations aimed at this round's fixes,
621/621 on all three Node versions, and byte-identity without reactions still holds under
my own A/B differential.

One new MEDIUM, introduced by the MEDIUM-1 fix and reproduced through the real server: the
short-circuit fires when the joined automatic cleanup **failed terminally**, not only when
it succeeded, so a `remove_reaction` that joins a failing cleanup is told
`isError: false` / "Nothing changed: ACK cleanup … already finished" while the reaction is
still on the message and Slack's actionable refusal (`is_archived`, `missing_scope`,
`not_authed`) is swallowed. My own round-1 fix direction prescribed that short-circuit
without conditioning it on the joined cleanup's outcome, so this one is on me as much as
on the implementer. It is not a shipping blocker: no unmet acceptance criterion, no data
loss, no security or MSRV problem, and a repeat call surfaces the real error.

## Findings

### MEDIUM — bug — `src/slack-adapter.ts:1444`: joining a cleanup that *failed* also reports success-shaped "Nothing changed"

`if (this.ackPending.get(channelId)?.get(ts) !== entry) return false;` treats "the entry is
gone" as "the reaction is gone". But `removeAck` (`src/slack-adapter.ts:1196`) drops the
entry on terminal failure too — `refusedForGood(err) || this.stopping || entry.tries >=
ACK_MAX_TRIES`. So a manual removal that joined a cleanup whose attempt was refused for
good returns `false`, and `src/server.ts:798` turns that into the success-shaped
`Nothing changed: ACK cleanup for message <ts> already finished.`

Reproduced on the production path (real `SlackMcplServer` + `SlackAdapter` over JSON-RPC,
stateful Slack fake — `$ORGASMIC_EVIDENCE_DIR/probe5.ts`, log `probe5.log`). Mention → ACK
added; the bot replies, which starts the automatic cleanup; the agent then calls
`remove_reaction` for the ACK emoji while that cleanup is in flight:

```
[is_archived]   manual isError=false
[is_archived]   manual text: Nothing changed: ACK cleanup for message 10.0 already finished.
[is_archived]   slack log: add:10.0:eyes post remove:10.0:eyes
[is_archived]   reactions STILL on message: 10.0:eyes
[not_authed]    … same: isError=false, "Nothing changed", reaction still on message
[missing_scope] … same: isError=false, "Nothing changed", reaction still on message
```

Control, same refusal with no cleanup to join — the agent gets the actionable error it
should have got:

```
control isError=true  An API error occurred: is_archived / No reaction was removed:
  conversation C1 is archived, so nothing can be posted or changed there. Calling again
  won't change that unless someone in the workspace unarchives it.
control reactions still on message: 12.0:eyes
```

This is a regression against `9b43671e`, where the same sub-case issued its own
`reactions.remove` and reported Slack's refusal correctly. Window and reach: the join
window is the whole duration of the automatic removal (up to the 10 s client timeout) and
opens on every bot reply in a conversation with a pending ACK — the same window as
MEDIUM-1. Triggers are a terminal refusal of that attempt (`is_archived`, `missing_scope`,
`not_authed`/`token_revoked`, `message_not_found`), `stop()` racing it, or the fifth
attempt under sustained rate limiting. It is self-correcting: the entry is gone, so a
repeat `remove_reaction` goes straight to Slack and gets the real error. Two concurrent
*manual* removals cannot reach it — the server serializes `tools/call` (602 ms for two
300 ms calls, `probe7.log`), so only the automatic cleanup, started outside call time,
can overlap a tool call.

Secondary, same root cause: the wording asserts "ACK cleanup … already finished", which in
this case says the wrong thing twice. `README.md:86`–`88` ("If an automatic cleanup already
in progress finishes while the tool waits, it returns a successful 'Nothing changed'") and
`changelog.d/slack-reactions.added.md:12`–`13` describe the same behavior without the
failure case, so they will need a word when the code changes.

**Fix direction:** make the short-circuit depend on the joined cleanup's *outcome*, not on
map membership. Record it on the entry — e.g. set a `gone` flag in `removeAck` next to the
success `dropAck` (`:1191`) and on `no_reaction` — and `return false` only when that flag
is set; otherwise fall through to `remove()`, which reports Slack's answer like the control
above. Add the test that fails today: a manual removal joining a cleanup refused for good
must surface the refusal, not "Nothing changed".

## Answers 1–6

**1. All six round-1 findings are fixed, each re-proved.**

| Finding | Status | Fresh evidence |
| --- | --- | --- |
| MEDIUM-1 misreported `no_reaction` on the join path | **Fixed** | `probe2.log`: `isError=false`, `Nothing changed: ACK cleanup for message 10.0 already finished.`, slack log `add:10.0:eyes post remove:10.0:eyes` (one removal, not two), reaction gone. Control unchanged: `isError=false`, `Reaction removed`, `add:11.0:eyes remove:11.0:eyes post`. (New sub-case in the MEDIUM above.) |
| MEDIUM-2 `own: false` conflated absent with unknown | **Fixed** | `src/slack-adapter.ts:1574`–`1577`: `true` on a listed bot ID, `false` only when `users.length === count` and every entry is a string, `undefined` otherwise. A/B output now shows `{"name":"e_1","count":2}` where round 1 printed `own:false`. Fixture at `test/reactions.test.ts:26` is now a complete 3-of-3 list for the negative case; truncated, missing-list, unknown-bot and malformed-count cases all assert omission (`:333`–`:366`). Mutation M12 (assert `false` whenever the bot is absent) killed, 2 tests. |
| MEDIUM-3 ACK coordination unexercised | **Fixed** | All 10 of my mutations killed, including the 3 that survived both the reactions file and the full suite last round. Timer-driven tests at `test/reactions.test.ts:223`, `:252`, `:275`, `:287`, `:300`, `:311`. |
| MEDIUM-4 new fields documented only in the operator README | **Fixed** | `src/tools.ts:182`–`183` and `:204`–`:205` name `reactions`, `reactionsOmitted`, the 20 cap and the three `own` states; `src/tools.ts:113` now reads "to remove the reaction from"; `test/reactions.test.ts:75`–`77` compares `required` + property names + that description instead of `deepEqual` of the whole schema; description test at `:382`. |
| LOW-5 unvalidated Slack shape failed the whole read | **Fixed** | `probe3.log`: no `TypeError` anywhere. `reactions: 'eyes'` and `{length: 2}` → field omitted; `count` string/`Infinity` → count omitted; `users: 'notUBOTsuffix'` → `own` omitted, so no substring false positive; `name: {}` → entry skipped. Mutation M15 (trust the shape) killed, 4 tests. |
| LOW-6 manual path re-armed outside the automatic rules | **Fixed** | `probe.log` P5: entry **not** retained after `message_not_found` — identical to the automatic path ("state after same refusal: empty"); round 1 had it retained with `tries: 0` and a 60 s timer. P7: entry **not** retained after 12 failed manual removals and no timer kept alive past the TTL; the 12 Slack calls are the agent's own repeated requests after the entry was dropped at the fifth try, not a retry loop. Mutations M13/M14 (drop `tries++`, ignore the budget) killed. |

Mutations, all 15 killed by assertions (`mutations.log`, driver `mutate2.mjs`, run in
`/tmp/rev2-v08en/head`; originals restored and byte-compared afterwards):

```
M1  drop the wait for a pending ACK add ............................ KILLED (1)
M2  drop the join with a running automatic cleanup ................. KILLED (1)   ← survived r1
M3  drop the ACK timer cancellation ................................ KILLED (1)   ← survived r1
M4  never re-arm cleanup after a failed manual removal ............. KILLED (2)   ← survived r1
M5  retire the ACK on any failure, not just the terminal ones ...... KILLED (3)
M6  report the raw reaction count as omitted ....................... KILLED (2)
M7  never emit reactionsOmitted .................................... KILLED (2)
M8  remove_reaction is not a write for the error explainer ......... KILLED (1)
M9  drop the DM restriction on removal ............................. KILLED (1)
M10 reaction metadata escapes the byte budget ...................... KILLED (7)
M11 revert MEDIUM-1 (re-issue the removal after the join) .......... KILLED (1)
M12 revert MEDIUM-2 (assert own:false when the bot is absent) ...... KILLED (2)
M13 revert LOW-6 (manual attempt off the budget) ................... KILLED (2)
M14 revert LOW-6 (ignore the attempt budget on manual failure) ..... KILLED (1)
M15 revert LOW-5 (trust Slack's reaction shape) .................... KILLED (4)
```

**2. The new `own` semantics are correct and honest, including for a missing `count`.**
`src/slack-adapter.ts:1574`–`1577`: `undefined` when the bot ID is unknown or `users` is
not an array; `true` on an exact match of the bot ID in the list (positive evidence, taken
before the stricter validation, which is right); `false` only when a valid non-negative
safe-integer `count` equals `users.length` and every element is a string; `undefined`
otherwise. A missing or unusable `count` therefore yields omission, not `false` — which is
the honest answer, because without `count` there is no way to know the list is complete.
`users.length > count` (inconsistent Slack) also omits. The `every(string)` guard means a
list with a non-string element omits rather than asserting absence. `probe3.log` and
`test/reactions.test.ts:333`–`366` cover all of it, including a `users` string containing
`UBOT`, which correctly yields no `own`. Agent-facing wording matches
(`src/tools.ts:182`–`183`, `:204`–`:205`), and `README.md:92`–`102` is the fuller version. One honest
imprecision, not worth a finding: malformed entries are dropped without being counted in
`reactionsOmitted`, so an agent cannot tell a nameless entry existed — those entries carry
no usable information, and counting them would read as "20 shown, 5 hidden" for garbage.

**3. New ACK logic — no new race, hang or leak; one new misreport (the MEDIUM).** All eight
concurrency probes pass (`probe.log`), plus `probe5`–`probe7`:
- *Reservation is synchronous.* `clearTimeout` + `remove()` + the `entry.removing`
  assignment (`:1464`–`:1472`) run with no await between them, so no `clearAck` or second
  removal can observe `removing === undefined` mid-flight. P1: `clearAck('C1')` and
  `clearAck('C1','1.0')` racing a manual removal still produce exactly one
  `reactions.remove` and no leaked state.
- *The double removal is gone.* P3 (two overlapping manual removals at the adapter)
  now yields one Slack call and two successful results, where round 1 produced two calls
  and a `no_reaction` error for the loser.
- *No hang.* `removeReaction` waits on `entry.removing` and `entry.added`, both bounded by
  the 10 s client timeout; `await entry.removing` in the `finally` (`:1476`) can see
  `undefined` after the chain's own `finally` cleared it, which resolves immediately
  rather than blocking. P4 (`stop()` during a manual removal waiting on a pending add)
  settles inside the 3 s race guard.
- *`tries` interplay.* The manual path increments before its attempt (`:1449`) exactly as
  `removeAck:1188` does, and applies the same drop rule (`:1457` vs `:1196`), so the
  five-attempt budget is genuinely shared: `test/reactions.test.ts:287` asserts four manual
  attempts plus one automatic fifth and no sixth, and `:300` asserts the fifth manual
  failure drops rather than arming. P7 confirms no timer survives the budget.
- *Shutdown.* `test/reactions.test.ts:311` counts `armAck` calls through a single
  call-through observer, so `stop()`'s final sweep cannot hide a re-arm; P4 adds the
  production-shaped race. Nothing is armed once `stopping`.
- *Leaks.* `ackPending` was empty after every probe that completes (P1, P3, P4, P6, P8) and
  after the two retain-on-failure cases once the budget ran out. The only thing stranded in
  the MEDIUM scenario is the reaction itself, which is pre-existing automatic behavior
  (a terminal refusal gives up) — the new part is only that the agent is told otherwise.

**4. Byte-identity without reactions — confirmed by my own A/B differential.** Identical
driver (`ab.ts`) in scratch `base` (`7274283f`) and `head` (`d9fa8ab`): a 10-message corpus
with no reactions (bot and user authors, thread parent and replies, a file, empty text, a
500-char body, a `root` field, a bogus `reply_count`, unicode/quotes/newlines) × 10
`fetch_history`/`fetch_thread` argument sets, each followed one page on by its
`nextCursor`, plus live Socket-Mode delivery and first-interaction backscroll with *and*
without reactions. Section-by-section comparison (`ab2.diff`, `ab2-{base,head}.txt`):

```
[plain]            base=36 head=36  identical=True
[plain-delivery]   base=1  head=1   identical=True
[withR-delivery]   base=1  head=1   identical=True
(pretty-printed delivery payloads, 61 lines)  identical=True
[withR]            base=36 head=42  identical=False   ← intended
```

So messages without reactions are byte-identical, and live delivery/backscroll is
byte-identical even for messages that *do* carry reactions; only the reaction-bearing
read output differs, and its 6 extra lines are extra pages — the new bytes really are
charged against `maxBytes` (mutation M10 killed 7 tests).

**5. Suites, typecheck and build: green.** Fresh 621 pass / 0 fail on Node 22.23.3,
24.22.1 and 22.12.0 — the expected count. Typecheck and build pass. I also re-checked
order independence in one process, because this round adds `t.mock.timers`: reactions
first → 621/621, reactions last → 621/621, so the new timer mocks do not bleed. Mock
hygiene is clean — every mock is on the test context (`t.mock.timers`, `t.mock.method`),
no `globalThis`, `process.env`, `Date.now` or bare `setTimeout` patching.
`test/reactions.test.ts` alone: 38/38.

**6. Docs, changelog and PR body: accurate and public-safe, with one gap.** Agent-facing
`src/tools.ts` now carries the output contract (MEDIUM-4). `README.md:75`–`110` matches the
code: the reaction table, the shared `reactions:write` scope and send-list/DM restrictions,
"`own: false` is emitted only when the bot is absent from a complete list", the 20-valid
cap, `reactionsOmitted`, "These fields count against `maxBytes`", and the retry paragraph
("transient failures retry after one minute; terminal refusals, shutdown and the fifth
failure retire cleanup") — all verified against the implementation and my probes. The one
gap is the MEDIUM above: README and the changelog fragment describe the join short-circuit
as what happens when the cleanup "finishes", without saying it also fires when the cleanup
failed. Public-safe: a scan of the diff, commit message and `pr-body.md` for
`orgasmic|/home/|run-01|xoxb|xoxp|token|secret|ORGASMIC_|TASK-V08EN|tx-2026|/tmp/` returns
only the words "dispatch" and "dispatches" in ordinary sentences. CONTRIBUTING conformance
holds: `feat:` title, `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`, the
Problem/Changes/Tests/Not verified/Out of scope/Companion PRs shape, the changelog-fragment
checkbox, and the numeric baseline (621 against 583 — I verified 621 myself on all three
runtimes this round and 583 on the base last round). The PR body's "Not verified" still
discloses the absence of a live workspace and the ACK-timeout limitation.

## Verification Gates

Run by me, wrapped, in the assigned worktree at `d9fa8ab5…` (clean at start and end):

| Gate | Command (after `timeout 900`) | Outcome | Log |
| --- | --- | --- | --- |
| `rev2-typecheck-22.23.3` | `npm run typecheck` | exit 0 | `gate-rev2-typecheck-22.23.3-01M63KT3GQY5VVYQMRBPQ85R31.log` |
| `rev2-build-22.23.3` | `npm run build` | exit 0 | `gate-rev2-build-22.23.3-01M63KT3RXJ2JKYMVF7GMFRSYQ.log` |
| `rev2-full-22.23.3` | `npm test` | exit 0 — 621 pass / 0 fail | `gate-rev2-full-22.23.3-01M63KT41F29J66BQ06TC1A8Y0.log` |
| `rev2-full-24.22.1` | `npm test` (scratch Node 24.22.1) | exit 0 — 621 pass / 0 fail | `gate-rev2-full-24.22.1-01M63KTK530SPBVNXCYY904GCX.log` |
| `rev2-full-22.12.0` | `npm test` (scratch Node 22.12.0, the MSRV) | exit 0 — 621 pass / 0 fail | `gate-rev2-full-22.12.0-01M63KV1RS0NB49S75H4B3DZZH.log` |

All with notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`), empty
npm user/global configs, and the loopback-only listener guard preloaded
(`NODE_OPTIONS=--require=$ORGASMIC_EVIDENCE_DIR/loopback.cjs`). Commands and PATH selection
are in `suites.sh`; combined output in `suites.log`. No `npm ci` was needed — the
worktree's `node_modules` is the one the implementer installed this round with
`npm ci --ignore-scripts` and empty configs (receipt `install.log`).

Reused receipts from the implementer's run (same commit, clean tree at start and end, exit
0, re-read not re-run): `typecheck-24.22.1`, `build-24.22.1`, `changelog`, `diff-check`,
`r2-final-state`, `reactions-repeat-5` (38/0), and the three `r2-final-mutation-*` gates.
`full-22.12.0` had a receipt too; I ran it fresh anyway because the brief asks for fresh
suites on all three runtimes.

Unwrapped probes (evidence, not reusable receipts); scripts and logs in
`$ORGASMIC_EVIDENCE_DIR`, run in `/tmp/rev2-v08en/`:

| Probe | What it showed |
| --- | --- |
| `probe.ts` → `probe.log` | ACK concurrency P1–P8, 8/8; P5 and P7 show LOW-6 fixed |
| `probe2.ts` → `probe2.log` | production-path MEDIUM-1 reproduction now returns success, one Slack call |
| `probe3.ts` → `probe3.log` | LOW-5 Slack-shape robustness: no `TypeError`, no substring `own` |
| `probe5.ts` → `probe5.log` | **new MEDIUM**: joining a terminally failed cleanup reports "Nothing changed" while the reaction stays |
| `probe6.ts` → `probe6.log` | two manual removals through the server: no join, pre-existing behavior |
| `probe7.ts` → `probe7.log` | `tools/call` is serialized (602 ms for two 300 ms calls), bounding the join window |
| `ab.ts` in `base/` and `head/` → `ab2-*.txt`, `ab2.diff` | plain reads and all delivery output byte-identical |
| `mutate2.mjs` → `mutations.log` | 15 mutations, all killed; sources byte-restored afterwards |
| reactions first / last in one process | 621/621 both orders — no mock-timer bleed |

## Unmet Criteria / test gaps

No acceptance criterion is unmet. Item by item: reactions appear in history and thread
output ✓; removing an own reaction succeeds ✓; removing one that is not the bot's own or is
missing fails with the fixed `no_reaction` message ✓ (verified through the server); the
access policy blocks read and removal where it should ✓ (feature-set, send-list and DM
tests, each mutation-killed); no change to existing output for messages without reactions ✓
(my A/B differential).

Test gaps:

1. No test joins a cleanup that **fails** — only the success path (`test/reactions.test.ts:223`).
   That is the gap the new MEDIUM shipped through.
2. No test covers the `stopping` arm of the join: `stop()` dropping the entry while a manual
   removal waits on `entry.removing`. P4 exercises the pending-*add* race, not this one.
3. `reactionsOmitted` is never asserted for a message that mixes malformed entries with more
   than 20 valid ones, so the "invalid entries do not consume the cap" rule is only covered
   below the cap.

## Residual Risk

- **No live Slack workspace and no network.** Everything behavioral here is proven against
  fakes plus the real server/adapter. The implementer discloses the same.
- **The `reactions:read` claim is still unverifiable offline.** `reactions:write` is in the
  manifest (`README.md:213`) and no new Slack call is added (`h.reactions` asserted empty in
  the rendering tests), but I cannot confirm that `conversations.history` carries
  `reactions` without `reactions:read`. The failure mode is silent, not breaking: with the
  field absent, `Array.isArray(msg.reactions)` is false and no new keys appear. Worth one
  live check before rollout, since a silently inert feature is the quiet failure.
- **Reaction bytes are bounded by count, not size.** 20 entries at realistic emoji-name
  lengths is ~2.6 KB, inside the 65,536 default but able to exceed the 2,048 `maxBytes`
  floor. `probe3.log`'s 20 × 4,000-char case refuses cleanly with the pre-existing
  actionable guidance ("takes 80,550 bytes … more than maxBytes"), so it is a usability
  edge, not a trap.
- **The pre-existing ACK timeout limitation is unchanged**: an add whose request times out
  can still reach Slack after the removal.
- **Duplicate-delivery corner of the join short-circuit.** If the entry were dropped and a
  *new* ACK entry created for the same `channel`/`ts` while a manual removal waits,
  `:1444`'s identity check would return `false` against the newer reaction. It needs Slack
  to redeliver the same mention inside the cleanup window, and `acknowledge:1135` already
  ignores a second delivery while an entry is pending, so I could not construct it.
- **Companion-PR independence (#55/#56) could not be checked** — no network. `src/server.ts`
  and `src/slack-adapter.ts` are the declared overlap, with merge-order guidance in the body.
- Unrelated to this diff, flagged again only because it is a live foot-gun: `npm run version`
  (`scripts/release-changelog.mjs`) performs a real release on any invocation and consumes
  `changelog.d/`. Pre-existing on main, out of scope here.

## Fix Directions

1. `src/slack-adapter.ts:1444` — short-circuit on the joined cleanup's *outcome*, not on map
   membership: set a flag next to `removeAck`'s success `dropAck` (`:1191`) and on
   `no_reaction`, and `return false` only when it is set; otherwise fall through to
   `remove()` so Slack's refusal reaches the agent, as the no-join control already does.
   Add the failing-join test, and the `stopping`-during-join test (gap 2).
2. With that change, adjust the one sentence in `README.md:86`–`88` and
   `changelog.d/slack-reactions.added.md:12`–`13` so "finishes" reads "succeeds", and
   consider wording `src/server.ts:798` so it does not attribute the no-op to ACK cleanup
   when the caller is not in that situation.
