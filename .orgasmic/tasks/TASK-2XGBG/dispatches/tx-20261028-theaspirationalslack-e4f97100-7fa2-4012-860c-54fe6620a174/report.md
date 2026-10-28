# Final re-review — TASK-2XGBG at `85c41a5ca5f1f18e57e75e9a8fbd07b9d4e70f51`

Scope: the single commit `85c41a5` on upstream main `ca8f6b1`, a polish of
`17275b84`, which I approved with three LOWs in dispatch
`tx-20261028-theaspirationalslack-247bc265-258d-427f-b079-fdce6cac1c24`.
Read-only: no edits, commits, push or GitHub comment. The worktree is clean at
the reviewed SHA (`git status --porcelain` empty; `--ignored` shows only
`dist/` and `node_modules/`), both before and after my work. All probe and
mutation work ran in sandbox copies under `/tmp/task-2xgbg-rev3/` (`src` and
`test` byte-identical to HEAD by `diff -r`, `node_modules` symlinked; the
lockfile and `package.json` are unchanged versus upstream, so the symlink is
sound).

**Upstream main has not moved**: `git ls-remote --heads upstream main` →
`ca8f6b1193154384e4626921255f86923fc5edf3`, checked at the start and the end of
this review. `85c41a5`'s only parent is that SHA.

## Verdict

**Approve.** All three LOWs are fixed, and I verified each by re-running my own
round-2 probes rather than by reading the diff: **P2 and P7, unchanged, now
fail** (they were written to assert the round-2 defect), their inverted forms
pass, and **P1 passes**. The new ok/refused/uncertain outcome logic is sound:
the two failure modes the brief asks about — dropping a *new* peer's ownership,
and leaving a status set with no owner — do **not** occur on the new path, and
uncertain failures (timeouts, 5xx, rate limits, non-`Error` rejections) are
still owned and still retried on the next refresh. I measured the counts myself
on all three runtimes: **614/614 at HEAD on Node 22.23.3, 24.22.1 and 22.12.0**,
against an independently exported upstream floor of **584/584**;
`test/threadStatus.test.ts` is **30/30 in five consecutive runs**.

Nothing blocks the push. Four LOWs remain. Two are new test gaps that my
mutations prove are live — `M7` and `M12` each survive the **full 614-test
suite** — and two are prose fixes to the drafts. None is a behaviour bug at
this commit.

## Findings

### LOW — test — `src/slack-adapter.ts:1170-1174`: the round's headline invariant ("an uncertain failure retains ownership for a clear") has no committed test

The comment at `src/slack-adapter.ts:1171-1172` and the PR body's "Uncertain
failures remain retryable" are the point of this round's `callStatus` change,
and the behaviour is real: an uncertain failure may have landed, so ownership is
kept and the teardown clear still runs.

Mutation **M12** collapses the branch to `this.statusOn.delete(channelId);` —
any non-`ok` outcome drops ownership — and the suite does not notice:

* `test/threadStatus.test.ts` **30/30**, full suite **614/614**
  (gate `review3-mutations`, `evidence/mutations/M12.py`).
* It is not an equivalent mutant: **five** of my probes catch it
  (`P9` for `ratelimited`, a 503 `slack_webapi_http_error`, `ECONNRESET` and a
  non-`Error` rejection; `P11` for the retired-epoch case). Under M12 the
  teardown clear is simply never issued for a status Slack may well be showing,
  which is exactly the "status set with no owner" the brief asks about.
* `R3-P1` does not cover it: with ownership dropped, `cur` is `undefined` on the
  next refresh, so the throttle is bypassed anyway and `R3-P1` still passes.

**Fix:** one case against the existing `adapter()` helper — set, reject with a
`ratelimited` platform error, assert `a['statusOn'].get('C1')?.ts === '1.0'`,
then `resetThreadStatuses()` and assert the trailing `'C1:1.0:'` clear. My
`P9`'s `ratelimited` row is that test; `evidence/probes/zz-r3-new.test.ts`.

### LOW — test — `src/slack-adapter.ts:1189`: the `statusRefused.clear()` ordering in `resetThreadStatuses` is still unpinned

Carried over from round 2's LOW 1 attribution. The implementer took my fix
option (a) — a clear can no longer arm suppression — which closes the symptom I
named. But the round-2 reorder (clearing suppression *before* the teardown
clears rather than after) still matters for a refused **set**, and nothing pins
it.

Mutation **M7** (restore round 1's position) leaves `test/threadStatus.test.ts`
at **30/30** and the full suite at **614/614** (gate `review3-mutations`,
`evidence/mutations/M7.py`), yet it is an observable defect. My new **P14**
(`evidence/probes/zz-r3-m7.test.ts`) distinguishes them: one conversation whose
set is definitively refused (`no_permission`, so `statusRefused` is armed in
that epoch) plus a second conversation whose teardown clear is slow, so the
reset's clears take real ticks:

* HEAD — `calls: ['C1:1.0:is thinking…','C2:1.0:is thinking…','C2:1.0:','C1:2.0:is thinking…']`;
  the new peer gets its attempt.
* M7 — `calls: [... 'C2:1.0:']`; **the new peer gets no attempt at all**,
  because its turn runs before `statusRefused.clear()`. That is the same
  README:43-44 / fragment promise ("until the peer changes") breaking, just via the
  refused set rather than the refused clear.

**Fix:** add `P14` verbatim; it is ~20 lines against the existing `adapter()`
helper shape.

### LOW — docs — the draft reviewer reply and the PR body's test bullet cite artefacts no upstream reader can resolve

`reviewer-reply.md` says "P2/P7 fail on `17275b84`; P1 fails with the old unsafe
`.message` read", and both drafts cite `be7c3af1` and `17275b84`. "P1", "P2" and
"P7" are *my* internal reviewer-probe labels — they appear nowhere in the diff,
the PR or any public artefact — and `be7c3af1` / `17275b84` are unpushed local
drafts that will never exist in `anima-research/slack-mcpl`, so a reviewer
cannot resolve or check any of them. R1-8 was itself a complaint about
unverifiable test claims in the PR body; unresolvable references invite the same
point. (The committed names `R3-P1` and `R3-P2` are fine — they are in the
diff.)

**Fix, reply paragraph:**

> This polish adds two regression cases, `R3-P1` and `R3-P2`, and widens
> `a late old-peer refusal cannot disable the new peer status`. All three are red
> against the previous draft of this branch: `R3-P2` and the widened case on the
> teardown-clear repair, `R3-P1` on the unsafe `(err as Error).message` read.
> Separately, removing the epoch guard on refusal recording makes the widened
> case fail; that is a mutation, not an additional regression test.

and open that paragraph with "Five regression cases from the teardown/error
follow-up are red against the first version of this branch" instead of naming
`be7c3af1`. Same substitution in the PR body's fifth **Tests** bullet.

### LOW — docs — `pr-body.md`: the AI-attribution footer does not follow `CONTRIBUTING.md:77-79`, and names a different model than the commit trailer

The convention is "the `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
footer (or equivalent for your tooling) in the PR body, and a
`Co-Authored-By:` trailer naming the model in commits". The body's footer is
"AI-assisted implementation with Codex; model co-author recorded in the commit"
— no linked footer, and it names "Codex" while the commit trailer names
`GPT-6-Astra <noreply@openai.com>`. A reviewer comparing the two sees a
mismatch on the one convention `CONTRIBUTING.md` spells out.

Also minor, same file: the checklist line is paraphrased as
`- [x] Changelog fragment included.`, where `.github/PULL_REQUEST_TEMPLATE.md`
ships `- [x] Changelog fragment added — `changelog.d/<slug>.<breaking|added|changed|fixed>.md``.
Keeping the template's wording (and its `---` separator) makes the box
self-evidently the template's.

**Fix:** `🤖 Generated with [Codex](https://openai.com/codex)` (or whatever the
tool's own footer is), naming the same model as the trailer; restore the
template's checklist text.

### LOW — docs/correctness — `src/slack-adapter.ts:1155-1158` + `README.md:43-44`: the one path that still leaves a status with no owner is the move-branch clear, and README's "transient failures may retry" reads wider than it is

This is the honest answer to the brief's "leave a status set with no owner"
question, and it is **pre-existing from round 2, not introduced here**. The
move branch awaits `callStatus(channelId, cur.ts, '')` and then deletes
ownership **unconditionally**, discarding the outcome the new type now makes
available. My **P15** (`evidence/probes/zz-r3-orphan.test.ts`) measures it for
both failure classes:

```
P15 uncertain (ratelimited):   calls=[C1:1.0:is thinking…, C1:1.0:, C1:2.0:is thinking…, C1:2.0:]
                               ownedAfterMove=2.0  stillLiveOnSlack=["C1:1.0"]
P15 refused (not_in_channel):  same
```

Thread `1.0` is still showing "is thinking…" on Slack, no later call ever
targets it, and `resetThreadStatuses()` and `stop()` cannot reach it. It is
reachable in ordinary use: a second addressed message in a different thread of
the same conversation moves `lastIncomingRoot`, the next host refresh moves the
status, and one transient rate limit on the clear orphans the old one.

How bad: cosmetic and bounded by Slack's 2-minute expiry. The fragment and the
PR body's **Not verified** already cover it ("best-effort; … failed calls,
client timeouts … can leave status until Slack's expiry"). The one line that
overreaches is README:43-44, "Lasting API refusals disable status in that
conversation until the peer changes; **transient failures may retry on the next
refresh**" — true of the set, not of a clear, which is issued once and dropped.

**Fix (docs is enough):** append to README:43-44, "a clear that fails is not
retried: that status stays until Slack expires it." A code fix would need
`statusOn` to track more than one possibly-live thread per conversation, which
is more machinery than the 2-minute bound justifies — I would not ask for it.

### Informational — not findings

* **The new outcome plumbing is in the right place.** `refused` ⇒ nothing
  landed is sound: `refusedForGood` (`src/slack-adapter.ts:68`) is a Slack
  platform error whose code is **not** in
  `SLACK_FAILED = {internal_error, fatal_error, service_unavailable, request_timeout, ratelimited}`
  (`src/content.ts:298`), i.e. `no_permission`, `not_in_channel`, `is_archived`,
  `channel_not_found`, `method_deprecated`. Every code that could mean "it may
  have landed" classifies as `uncertain`. HTTP 5xx and socket errors are not
  `PlatformError` at all, so they are `uncertain` too.
* **`callStatus`'s `return 'uncertain'` when `!this.web.assistant`** is
  unreachable in practice: `statusOn` can only be populated past the
  `!this.web.assistant` guard in the set path, so the move-branch clear never
  sees a `cur` without a client. Harmless either way — the move branch ignores
  the outcome.
* **The typing handler needs no `this.conn !== conn` guard.**
  `dispatchNotification` (`src/server.ts:572-600`) is fully synchronous and is
  called from the live connection's read loop (`src/server.ts:316`), and
  `lastIncomingRoot.clear()` runs in the same `finally` that nulls `conn`, so an
  old peer's typing cannot land after its disconnect. P6 and P13 confirm it on
  the production path.
* **`markOutbound`'s unconditional `setThreadStatus(channelId, undefined)`**
  (`src/server.ts:1013`) costs one queue turn and no Slack call when nothing is
  owned — `cur` is `undefined`, so the move branch and the set path both bail.
* **Fragment rewrap is content-preserving**: whitespace-normalised, the
  `17275b84` and `85c41a5` fragments are byte-identical; line widths are now
  53–73 against the previous 34–80 outlier. `changelog.d/README.md` and
  `CONTRIBUTING.md:95-106` impose no width, so this was optional and is done.
* **Commit author** is still `orgasmic worker (devbox) <orgasmic@devbox>`; the
  owner will want a deliverable address before pushing. Body wrapped ≤72
  columns, `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` present.

## Answers to the brief's four questions

### 1. Are LOWs 1-3 fixed? P1/P2/P7 and M7/M9 re-run

**Yes, all three.** Gate `review3-probes-asis-expect-red` runs round-2 **P2 and
P7 byte-unchanged** (they assert the defect, so exit 1 is the evidence);
`review3-probes-inverted` runs the inverted forms and the new probes.

| Probe | At `17275b8` (round 2) | At `85c41a5` |
|---|---|---|
| **P1** safe non-`Error` read keeps the refresh retryable | passed (behaviour was already right, just unpinned) | passes: `['C1:1.0:is thinking…','C1:1.0:is thinking…']` |
| **P2** refused teardown clear re-suppresses the next peer | `calls=['C1:1.0:is thinking…','C1:1.0:']`, `refusedAfterReset: true` | **fails** → `refusedAfterReset: false`, `calls=[…,'C1:2.0:is thinking…']`. **P2′** asserts that and passes |
| **P7** refusal that also refuses the clear disables the next peer | `calls=['C1:1.0:is thinking…','C1:1.0:']`, `statusRefused: ["C1"]` | **fails** → `calls=['C1:1.0:is thinking…','C1:2.0:is thinking…']`, `statusRefused: []`. **P7′** asserts that, plus that the new peer still owns its status and is cleared at its own teardown, and passes |
| P3-P6, P8 (unchanged) | pass | pass, same observations |

LOW 1's two halves are both closed, by exactly the two mechanisms the brief
names: `if (status && …)` in `callStatus` (a clear can no longer arm
suppression) and `if (outcome === 'refused') statusOn.delete(…)` (a definitively
refused set releases ownership, so teardown issues no pointless clear). LOW 2's
`instanceof` read is now pinned. LOW 3's draft is corrected — see Q4.

Mutations (gate `review3-mutations`, scripts in `evidence/mutations/`), all
against the committed `test/threadStatus.test.ts`:

| Mutation | Round 2 | At `85c41a5` |
|---|---|---|
| **M9** revert the `instanceof` read in `callStatus` | 28/28 — **not caught** | **caught**: `not ok R3-P1` (29/30) |
| **M7** restore round 1's `statusRefused.clear()` position | 28/28 — **not caught** | 30/30 — **still not caught**, and still a live defect (see LOW 2 above) |
| **M10** let a refused *clear* arm suppression again (revert LOW 1a) | n/a | **caught**: `not ok R3-P2` |
| **M11** key the ownership release on `statusRefused` rather than the outcome (revert LOW 1b) | n/a | **caught**: `not ok a late old-peer refusal cannot disable the new peer status` |
| **M13** remove the epoch guard on refusal recording | n/a | **caught**: same test — confirms the reply's mutation claim |
| **M12** drop ownership on *any* non-`ok` outcome | n/a | 30/30 and 614/614 — **not caught** (LOW 1 above) |

So the fixes for LOWs 1 and 2 are both pinned by committed tests; two mutations
in the same area are not.

### 2. The new outcome logic

**Can releasing ownership after epoch retirement drop a NEW peer's status?
No.** It is structurally impossible, and I probed it rather than argued it.
`setThreadStatus` chains every turn for a conversation onto
`statusQueue.get(channelId)` and replaces the tail synchronously, and the
tail-identity cleanup (`src/slack-adapter.ts:1182`) only removes the entry when
the settling turn is still the tail — so the old turn's `statusOn.delete` always
runs before the next peer's turn starts.
`resetThreadStatuses` bumps the epoch and enqueues its clears **synchronously**,
and `src/server.ts:327-335` calls it synchronously in `serve()`'s `finally`, so a
new peer can never slip in front of it.

* **P10** forces the adversarial interleaving: the old set is held in flight,
  the epoch retires, the new peer's set is queued, and the old call then rejects
  `no_permission` only after **20 further microtask hops**. Result
  `calls: ['C1:1.0:is thinking…','C1:2.0:is thinking…']`,
  `statusOn: {C1 → 2.0}`, `statusRefused: []`, and the new peer's status is
  cleared `'C1:2.0:'` at its own teardown. No pointless clear, no dropped
  ownership, no suppression carried across the peer change.
* **P13** reproduces it on the production path — real `SlackMcplServer`, a
  refused set, `close()`, then a second peer over a fresh connection:
  statuses `['C1:4.0:is thinking…']` at disconnect (no clear for the refused
  set), then `'C1:8.0:is thinking…'`, with `statusOn.get('C1').ts === '8.0'`.
* **P8/P4** (unchanged) still hold the queue and `statusOn` identity invariants
  under a pile-up of move/stop/reset/move.

**Can it leave a status set with no owner, so it's never cleared? Not on the
new path.** `P9` is the full outcome table; every row passes:

| set outcome | ownership after | `statusRefused` | retried on the next refresh | teardown clear issued |
|---|---|---|---|---|
| `ok` | held | no | no (60 s throttle) | **yes** |
| `refused` `no_permission` | released | yes | no (suppressed) | no — correct, nothing landed |
| `refused` `not_in_channel` | released | yes | no | no |
| `uncertain` `ratelimited` | **held** | no | **yes** | **yes** |
| `uncertain` 503 `slack_webapi_http_error` | **held** | no | **yes** | **yes** |
| `uncertain` `ECONNRESET` | **held** | no | **yes** | **yes** |
| `uncertain` non-`Error` (`throw null`) | **held** | no | **yes** | **yes** |

`P11` adds the retired-epoch variant: an old set that fails `service_unavailable`
keeps ownership, so the reset's clear *is* issued
(`['C1:1.0:is thinking…','C1:1.0:','C1:2.0:is thinking…']`) — the asymmetry with
`refused` is deliberate and correct. `P12` runs a six-conversation mixed
sequence with rotating `ratelimited` / `throw null` / success outcomes through
`resetThreadStatuses()` and `stop()` and finds **no accepted status without a
clear attempt**, `statusOn` empty and `statusQueue` drained.

**Are uncertain failures still owned and retried? Yes** — the `P9` table above.
Ownership is retained and `entry.at = -Infinity` defeats the 60-second throttle,
so the host's very next refresh re-attempts immediately; `R3-P1` pins that for
the non-`Error` case with a frozen virtual clock. The one residual hole is the
move-branch *clear*, whose outcome is still discarded — LOW 5 above, pre-existing
and bounded by Slack's 2-minute expiry.

**P3-P6, P8 re-run:** all pass, same observations as round 2 — no unhandled
rejection on any status path with queues drained (`P3`); the two removed
identity guards still hold under concurrency (`P4`); `reply_message`,
`send_message` and `upload_file` each clear a pending status
(`P5`, `['C1:4.0:is thinking…','C1:4.0:']`); `serve()`'s cleanup still cannot
run while a write is in flight, so no clear lands after the next peer's set
(`P6`, `conn` nulled early: `false`); the queue entry is removed exactly once,
by the tail (`P8`).

### 3. Full suite on three runtimes, plus threadStatus ×5

I ran all of these myself in the assigned worktree; I did not reuse the
implementer's suite logs.

| Runtime | At `85c41a5` | Upstream `ca8f6b1` floor |
|---|---|---|
| Node 22.23.3 | **614 pass / 0 fail** | **584 pass / 0 fail** |
| Node 24.22.1 | **614 pass / 0 fail** | — |
| Node 22.12.0 (`engines` floor) | **614 pass / 0 fail** | 584 (implementer's `r3-baseline-floor`, read) |

614 − 584 = 30, exactly the size of the new `test/threadStatus.test.ts`.
Zero cancelled, zero skipped, zero todo on every run. The floor is my own
`git archive ca8f6b1` export with the lock-identical `node_modules` linked —
valid because `package.json` and `package-lock.json` are unchanged versus
upstream (`git diff --stat ca8f6b1 HEAD -- package.json package-lock.json` is
empty).

`test/threadStatus.test.ts`: **30/30 in five consecutive runs**, one process,
Node 22.23.3 (gate `review3-thread-x5`). No flake, no ordering sensitivity.

### 4. The draft reviewer reply and the replacement PR body

**Accurate on every number I checked.** I verified each independently:

* "30 thread-status tests" — ✓, `# tests 30` on every run of that file.
* "614/614 on Node 22.23.3, 24.22.1 and 22.12.0 … upstream 584/584" — ✓,
  measured myself on all three, and the 584 floor exported and run myself.
* "30/30 in five consecutive runs" — ✓.
* "Five new regression cases from the teardown/error follow-up fail on
  `be7c3af1`" — ✓ five, which is LOW 3 fixed; the implementer's
  `r3-recount-round2-red.log` shows `0 pass / 5 fail` and names the fifth
  correctly as the committed test, not a mutation.
* "removing the epoch guard fails the widened late-refusal test; that is the
  mutation, not an additional regression test" — ✓, reproduced as **M13**.
* "This polish adds two tests and widens the late-refusal case" — ✓, 28 → 30
  plus the widened `thread_ts === '1.0'` fake.
* R1-4's three clauses — ✓ each, by `P2′`, `P7′`, `P9`, `P10`, `P13`.
* R1-5's "remain immediately retryable when uncertain" — ✓, `P9`/`R3-P1`.
* PR body's `mode: 'degraded'` / `missingCapabilities: ['channels.typing']` /
  `effect: 'disabled'` — ✓ against `src/grant.ts:167-172`.
* PR body's "the wire selection field is `enabled`" — ✓ against
  `@animalabs/mcpl-core` `capabilities.d.ts:228,268`.
* "Rebuilt as one commit, `85c41a5…`, on `ca8f6b1…`" — ✓.

**Public-safe:** yes. I found no credential, path, hostname, internal
identifier, orgasmic/dispatch terminology, owner name or private-channel
reference in either draft. Both are plain engineering prose about this
repository.

**Edit suggestions** — two, both LOW and both above:

1. Replace the internal probe labels and unpushed SHAs. Reply paragraph, and the
   PR body's fifth **Tests** bullet; exact replacement text in LOW 3.
2. Footer and checklist: `🤖 Generated with [Codex](https://openai.com/codex)`
   naming the same model as the `Co-Authored-By:` trailer, and the template's
   own checklist wording. See LOW 4.

One optional third, if the owner wants README:43-44 to be exactly right about
clears: see LOW 5's one-clause append.

## Verification Gates

All run through `orgasmic dispatch gate <name> -- timeout 900 <cmd>` from the
assigned worktree, which was clean at both ends (every receipt records
`clean=yes`). Logs under this report's directory.

| Gate | Command after `timeout 900` | Result | Log |
|---|---|---|---|
| `review3-suite-22.23.3` | `node --import tsx --test --experimental-test-isolation=none test/*.test.ts` | **614 pass / 0 fail** | `gate-review3-suite-22.23.3-01M62BYMX9KA6PE99NPBP9KAMJ.log` |
| `review3-suite-24.22.1` | same, scratch Node 24.22.1 | **614 pass / 0 fail** | `gate-review3-suite-24.22.1-01M62BZ43TSREA25NKT3ZYZ841.log` |
| `review3-suite-22.12.0` | same, scratch Node 22.12.0 | **614 pass / 0 fail** | `gate-review3-suite-22.12.0-01M62BZJQH6YBWF7VRTQ5Q4E0F.log` |
| `review3-thread-x5` | `bash -c 'for i in 1..5; … test/threadStatus.test.ts'` | **30/30 ×5** | `gate-review3-thread-x5-01M62C024ACDKRK76CSGNQBZYV.log` |
| `review3-floor-22.23.3` | my own `git archive ca8f6b1` export, full suite | **584 pass / 0 fail** | `gate-review3-floor-22.23.3-01M62C6QQJCSTSP3SSD84VWZMT.log` |
| `review3-probes-inverted` | `zz-r3` + `zz-r3-new` + `zz-r3-m7` + `zz-r3-orphan` | **24 pass / 0 fail** | `gate-review3-probes-inverted-01M62C6M3H90KA10M01Q46D6BP.log` |
| `review3-probes-asis-expect-red` | round-2 **P2 and P7 unchanged** | **0 pass / 2 fail — expected and intended**: these assert the round-2 defect, so `exited:1` is the evidence it is gone | `gate-review3-probes-asis-expect-red-01M62C6QFFCEJKTQP331BGZJ1Z.log` |
| `review3-mutations` | M7, M9, M10, M11, M12, M13 vs `threadStatus`; M7, M12 vs the full suite | M9/M10/M11/M13 **caught**; M7, M12 **survive 30/30 and 614/614** | `gate-review3-mutations-01M62C75F4DX41MH5NRJ9B50MP.log` |

Reused receipts, read not re-run (all `clean=yes` at `85c41a5`):
`final-24.22.1-install`, `final-24.22.1-typecheck`, `final-24.22.1-build`,
`final-changelog-regex` (exact CI added-fragment regex, parent SHA, clean
merge-tree), `final-release-fold` (dry fold reproduces the bullet verbatim;
only scratch changed), `final-runtime` (versions, official checksums, empty npm
configs, loopback guard), `final-22.12.0-suite`, `final-thread-repeat-5`.
I read the implementer's red/green and recount logs as claims and reproduced
their load-bearing parts myself (`r3-mutation-epoch` as M13, the clear-refusal
reds as M10/M11, the unsafe-message red as M9).

Environment, as the brief requires: no edit, commit, push or GitHub comment —
the only writes were to `/tmp/task-2xgbg-rev3/` and this evidence directory.
`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false` and two empty npm
configs outside the repository were exported for every command
(`evidence/env.sh`); no `npm ci` was needed, since the lockfile is unchanged and
the existing `node_modules` was linked. The loopback-only listener guard
(`evidence/loopback.cjs`) was inherited by every suite and probe through
`NODE_OPTIONS`, and I re-smoke-tested it: wildcard binding refused, unspecified
binding forced to `127.0.0.1`. Scratch Node 24.22.1 and 22.12.0 report
`v24.22.1` and `v22.12.0`; their archive checksums were verified against
freshly fetched official SHASUMS in the implementer's `final-runtime` gate,
which I read. Every suite ran under `timeout 900`. The only network access was
two read-only `git ls-remote --heads upstream main` calls.

## Unmet Criteria / test gaps

No unmet acceptance criterion. Checking the task's acceptance list against the
commit: rebuilt on current upstream main ✓ (sole parent `ca8f6b1`, confirmed
still `refs/heads/main`); every R1 point answered or argued ✓ (R1-1…R1-8 in the
reply, each traceable to code I read); `channels.typing` optional with a host
keeping messaging and getting no status, red before and green after ✓
(`R1-1/R1-6: original harness grant keeps push and publish, with no status`,
red on `be7c3af1`); tests in upstream's homes ✓ (`test/threadStatus.test.ts`
plus edits to the existing `harness.ts`, `handshake`, `forwardingLifecycle`,
`registrationRecovery`, `serverVersion`); red/green and a mutation ✓; full
one-process suite on 22.23.3 and 24.22.1 ✓ (and 22.12.0); changelog fragment
and README ✓; public-safe text ✓.

Test gaps, both proven by a surviving mutation against the **full 614-test
suite**:

1. An uncertain failure retaining ownership (and therefore the teardown clear)
   is untested — **M12** survives. LOW 1.
2. The `statusRefused.clear()` ordering in `resetThreadStatuses` is untested —
   **M7** survives, and **P14** shows it is still a real defect. LOW 2.

Both are small, additive tests against the existing `adapter()` helper; my
`P9` (`ratelimited` row) and `P14` are drop-in candidates, in
`evidence/probes/`.

## Residual Risk

* **The move-branch clear can orphan a status** for up to Slack's 2-minute
  expiry (LOW 5, `P15`). Pre-existing, cosmetic, covered by the drafts'
  best-effort language except for README:43-44's one over-broad clause.
* **No live Slack and no live host.** `assistant.threads.setStatus` is only ever
  exercised against fakes and the local fake API, so the real rendering, the
  real `chat:write`-in-channels behaviour since 2026-03, and the real 2-minute
  expiry are asserted, not observed. The drafts say so under **Not verified**.
* **Cleanup stays best-effort** — a failed call, a client timeout, forced
  termination or the 5-second shutdown cap can leave a status until expiry.
* **Multiple pending addressed threads are ambiguous.** Channel-only typing
  cannot identify the host's actual inference target; the latest accepted
  addressed thread is a proxy. Documented as such, and out of scope.
* **A new peer's set still queues behind the old peer's in-flight call** in the
  same conversation. Bounded by the Slack client's own timeout; reconnects
  themselves are not blocked (`P6`, `C′`).
* **`op: 'stop'` is an extension.** Base-shape hosts clear only via post,
  disconnect, shutdown or expiry. Documented in README, the fragment and the PR
  body.
* **Deliverable identity.** The commit author is still
  `orgasmic worker (devbox) <orgasmic@devbox>`; the owner should set a real
  address before pushing, and should reconcile the "Codex" footer with the
  `GPT-6-Astra` trailer (LOW 4).
* Push, the PR body replacement and the reviewer comment remain owner
  decisions; none was performed.

## Fix Directions

Ordered by value, none blocking:

1. **LOW 1** — add one case: set, reject `ratelimited`, assert
   `statusOn` still holds `1.0`, then `resetThreadStatuses()` and assert the
   trailing `'C1:1.0:'`. Kills M12. Copy the `ratelimited` row of `P9` from
   `evidence/probes/zz-r3-new.test.ts`.
2. **LOW 2** — add `P14` from `evidence/probes/zz-r3-m7.test.ts` verbatim.
   Kills M7 and finally pins the round-2 reorder.
3. **LOW 3** — rewrite the reply's last-but-two paragraph and the PR body's
   fifth **Tests** bullet to drop `P1`/`P2`/`P7` and the unpushed SHAs;
   replacement text is in the finding.
4. **LOW 4** — linked AI footer naming the same model as the trailer; restore
   the template's checklist wording.
5. **LOW 5** — optional one clause on README:43-44: a clear that fails is not
   retried.

Items 1 and 2 are the only ones that touch the repository; 3 and 4 are drafts
that have not been posted, and 5 is one README clause.
