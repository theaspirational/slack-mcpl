# Review — TASK-38EPN, "Allow zero automatic backscroll" (d5a84bcc)

Reviewed: `d5a84bccdca69a9804df28f834616a2ea73abfd5`, parent
`d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`. 4 files, +36/-5.

**Preflight.** `git fetch https://github.com/anima-research/slack-mcpl.git main`
→ `FETCH_HEAD = d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`. Upstream main has
**not** moved since planning; the commit sits directly on current main and
needs no rebase.

## Verdict

**Changes requested** — one confirmed behavioural regression in the mode the
PR adds (MEDIUM-1, a 3-line fix). Everything else is sound: the feature is
minimal and correct, the tests are substantive and kill every mutation I
threw at them, the changelog fragment and README row are well-formed, and
the suite is green on both Node lines.

## Findings

### MEDIUM-1 — `src/server.ts:1666` (run) — `SLACK_BACKSCROLL_LIMIT=0` also suppresses the conversation-name lookup, so the auto-subscribe note loses the channel name

The new guard was added to the condition that wraps **two** things: the
backscroll fetch *and* the `getConversationMeta` lookup at `src/server.ts:1680`.

```ts
if (isFirstInteraction && isAddressed && backscrollLimit > 0) {
  try { ...fetchHistory... } catch { ... }
  if (!isCurrent()) return abandon();
  if (!msg.isDM) { meta = await this.lookUpMeta(msg); ... }   // ← now also skipped
}
```

`meta` is re-fetched later only when `contextChanged` is true
(`src/server.ts:1692`). When it is false, `meta` stays `undefined` and the
auto-subscribe system note at `src/server.ts:1707` falls back from
`#general` to `conversation C1`.

`contextChanged` is false at a first interaction whenever `lastChannelId`
already names the conversation — reached by `markOutbound()`
(`src/server.ts:997`), i.e. the bot wrote into the conversation before the
first inbound message from it was taken. That is an ordinary sequence: the
watermark that makes `isFirstInteraction` false is only committed in
`taken()` (`src/server.ts:1794`), while `lastChannelId` is set by any
outbound write.

Failure scenario, reproduced (`probe-transcript.txt` §E,
`meta-lookup-probe.test.ts`), at the reviewed commit:

```
PROBE limit=0  ==> "<system>Auto-subscribed to conversation C1 because you were mentioned. …"
PROBE limit=50 ==> "<system>Auto-subscribed to #general because you were mentioned. …"
```

So an operator who sets `SLACK_BACKSCROLL_LIMIT=0` silently degrades an
agent-facing message that has nothing to do with backscroll. This is new
with the PR: before it, `0` fell back to 50 and the lookup always ran.

**Fix direction** — gate only the fetch, keep the meta lookup under the
original condition:

```ts
if (isFirstInteraction && isAddressed) {
  if (backscrollLimit > 0) {
    try { ...fetchHistory... } catch { ... }
    if (!isCurrent()) return abandon();
  }
  if (!msg.isDM) { meta = await this.lookUpMeta(msg); if (!isCurrent()) return abandon(); }
}
```

Verified: with that edit the probe and all of `operatorControls.test.ts` pass
(16/16, `probe-transcript.txt` §F). The reviewed worktree was not modified —
all mutation and fix work ran in a scratch copy.

### LOW-1 — `src/server.ts:236-241` (run) — off-looking values silently leave automatic backscroll on at 50

Now that `0` means "off", the silent fallback acquires a failure mode it did
not have before: `SLACK_BACKSCROLL_LIMIT=off`, `=false`, `=no`, `=-1`, `=abc`
all yield 50, i.e. backscroll **enabled**, for an operator who meant to
disable it. `src/config.ts:1-8` states the opposite intent for switches
("a present value must say yes or no so a broken environment template cannot
disable a guard"); here the template error fails toward *more* context being
read, not less.

The mechanism is unchanged from before the PR (parser probe diff, implementer
evidence `gate-{base,final}-node22-parser-probe-*.log`: the **only** value
whose result changed is `"0"`, 50 → 0), and the README row now documents the
fallback. So it does not contradict upstream enough to block — but it is the
one thing a maintainer is most likely to comment on, and it is the natural
companion to the startupSettings question below.

### LOW-2 — `README.md:335` (run) — "Unparseable … values fall back to 50" overstates what `parseInt` rejects

`parseInt(raw, 10)` is lenient. Measured at the reviewed commit
(`gate-final-node22-parser-probe-01M622P8257HC70MS64BW70MPQ.log`):
`"7junk"` → 7, `"1.5"` → 1. By the same rule `"0junk"` → 0, which now
**silently disables** automatic backscroll. The row's claim is the only
place a reader would check. Fix: say "values that do not begin with a
number in 0–1000", or tighten the getter to `/^\d+$/`.

### LOW-3 — commit metadata (source-read) — the commit author is an internal identity, not a public one

`git log` author is `orgasmic worker (devbox) <orgasmic@devbox>` — a
non-public name and an unroutable address. The task's "public-safe text
only" criterion and the brief's "no agent, host or private names" apply to
the commit that would be pushed upstream, not just to the diff. The commit
*message* is clean. Before any push, reset `user.name`/`user.email` to the
owner's public identity.

The `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer is correct
per CONTRIBUTING.md's "AI-assisted contributions" section (a
`Co-Authored-By:` trailer naming the model). I cannot verify from the repo
that the named model is the one that actually wrote the commit.

## Answers to the brief

**1 — Complete and minimal?** Yes. The whole diff is: the getter's
comparison `n > 0` → `n >= 0` (`src/server.ts:240`), hoisting the getter read
into a local (`src/server.ts:1665`, necessary so the env is read once per
delivery rather than twice), the guard (`src/server.ts:1666`), a doc comment,
a README row and a changelog fragment. Nothing extraneous.

Only the one automatic call site is guarded, and it is the **only** automatic
history read in the tree. `grep -rn fetchHistory src/` returns exactly one
production call site, `src/server.ts:1668`; `conversations.history` /
`conversations.replies` appear only in `src/slack-adapter.ts:1440,1464` and
`src/content.ts:411`, all reached through `fetchHistory` (line 1482) or
through the explicit tools. Explicit reads go via
`this.slack.readHistory` (`src/server.ts:845`) and `this.slack.readThread`
(`src/server.ts:852`) and are untouched — pinned by the second half of the
new test (`fetch_history` still returns `earlier context` with the limit at
0) and independently by the full suite being green.

**2 — Getter vs. `startupSettings`.** Keeping the getter is **consistent**
with how upstream treats operator settings today, and I would not block on
it.

- `startupSettings` (`src/config.ts:11-53`) holds only what `src/index.ts:40-52`
  needs *before* connecting Slack: transport, tokens, and the adapter/server
  constructor arguments. It is a startup-refusal gate, not a registry of
  every operator setting.
- Two documented operator settings already live outside it and are read from
  `process.env` inside the server: `SLACK_SUBSCRIPTIONS_FILE`
  (`src/server.ts:1006`, read per call, exactly this pattern) and
  `SLACK_MCPL_DEBUG_LOG` (`src/server.ts:110`). `SLACK_BACKSCROLL_LIMIT`'s
  getter predates this PR; the commit does not introduce the pattern, it
  changes one comparison inside it.
- The worker's stated reason holds: `SlackMcplServer`'s options bag is
  `{ subscribeMemberChannels?: boolean }` (`src/server.ts:257`), and every
  directly-constructed server in `test/` goes through it without
  `startupSettings`. Moving the value would mean widening that bag and
  threading it through every construction site — real scope growth for a
  commit meant to be a small PR.

Would a maintainer *ask*? Plausibly, yes — because `0` turns a tuning value
into a switch, and the startup-refusal design exists precisely so a bad
switch value stops the server rather than silently defaulting (LOW-1). But
that is a design request for a follow-up, not a defect in this commit. If it
is raised, the cheap answer is a `startupSettings` entry that *refuses* an
unparseable value, with the getter kept as the delivery-time read.

**3 — Invalid values falling back to 50.** Consistent in mechanism with
before (unchanged code path; the parser probe shows `"0"` is the single
behavioural difference), and the README now states it. It does mildly
contradict `src/config.ts:1-8`'s stated intent, and it is newly *meaningful*
because "off" now exists. Reported as LOW-1/LOW-2, not as a blocker.

**4 — Tests.** `test/operatorControls.test.ts:23-48`, a
`for (const limit of [0, 7])` loop. They are substantive and they pin both
directions. All runs below are from a scratch copy; transcripts in
`probe-transcript.txt`.

| | result |
|---|---|
| New tests against base `src/server.ts` (d3e4f7c9) | **red** — `not ok 1` (limit 0), `ok 2` (limit 7); 13/14 |
| My M1: drop `&& backscrollLimit > 0` from the guard | **red** — `not ok 1`; 13/14 |
| My M2: getter back to `n > 0 && n <= 1000` | **red** — `not ok 1`; 13/14 |
| My M3: `backscrollLimit > 0` → `> 1000` (automatic read never runs) | **red** — `not ok 2`; 13/14 |

M3 matters: it shows the `limit: 7` case genuinely pins that the non-zero
path still fetches, so the pair is not a one-sided test. The explicit-read
half is pinned by `assert.deepEqual(h.reads, …)` *after* the `fetch_history`
call, which distinguishes "explicit read happened" from "automatic read
happened" by position in `h.reads`, not just by count.

Env handling (save / set / restore in `t.after`) matches the in-tree
precedent at `test/forwardingLifecycle.test.ts:976-981` and
`test/toolRefusals.test.ts:144-148`, which matters under
`--experimental-test-isolation=none` (one process for the whole suite, from
#49). No cross-file leakage observed in four full-suite runs.

Gap: no test covers MEDIUM-1 (the auto-subscribe note's wording at limit 0).
That is why the regression got through.

**5 — Fragment, README row, commit message.**

- Fragment `changelog.d/zero-backscroll.added.md` matches
  `.github/workflows/changelog.yml`'s regex
  `^changelog\.d/[^/]+\.(breaking|added|changed|fixed)\.md$` as an **added**
  file, so the soft CI check passes. Content is one bullet with a
  two-space-indented continuation line, no heading, no rule — matches
  `changelog.d/README.md` and precedent (`bounded-history.added.md`,
  `feat-rfc008-tool-classes.added.md`). Slug style matches the
  branch-name precedent. Proven, not just read: I ran
  `release(dir)` from `scripts/release-changelog.mjs` over the real
  `changelog.d/` in a scratch copy — it exited clean, folded the bullet into
  `## 0.1.0 — …` and consumed the fragment (`probe-transcript.txt` §G).
- README row (`README.md:335`) is accurate on range, default, the 0
  semantics and "explicit history tools remain available" — all four
  confirmed by probe/test. The one inaccuracy is the "unparseable" wording
  (LOW-2).
- Commit message: subject is a plain descriptive title, accepted by
  CONTRIBUTING.md ("Conventional-commit-style titles are the house default;
  plain descriptive titles are accepted"). Body wraps at ≤72 columns,
  matching the precedent of `2b887e8`. `Co-Authored-By:` trailer present as
  required. Author identity is the problem — LOW-3.

**6 — Gates.** Base = d3e4f7c9, final = d5a84bcc. Zero failures everywhere;
586 = 584 + the 2 new tests, on both Node lines.

## Verification Gates

Run by me, at d5a84bcc, clean tree before and after:

| gate | command | exit | log |
|---|---|---|---|
| `review-node22-typecheck` | `timeout 900 npm run typecheck` (Node 22.23.3) | 0 | `gate-review-node22-typecheck-01M6230BY7SC6KZ5ARKWBHJEVC.log` |
| `review-node22-build` | `timeout 900 npm run build` (Node 22.23.3) | 0 | `gate-review-node22-build-01M6230FAAWCE1QY2SQEK4JP9V.log` |
| `review-node22-suite` | `timeout 900 npm test` (Node 22.23.3) | 0 — **586 pass / 0 fail** | `gate-review-node22-suite-01M6230KS8S6RHEDCDTD9E0N8P.log` |

Reused receipts (clean-tree passes at d5a84bcc, read not rerun):

| gate | command | exit | counts |
|---|---|---|---|
| `final-node22-npm-ci` | `timeout 900 npm ci --ignore-scripts --registry=https://registry.npmjs.org` | 0 | — |
| `final-node22-parser-probe` | `node --import tsx backscroll-probe.mjs` | 0 | `"0"`→0, all other inputs unchanged vs base |
| `final-node24-typecheck` | `timeout 900 npm run typecheck` (Node 24.22.1) | 0 | — |
| `final-node24-build` | `timeout 900 npm run build` (Node 24.22.1) | 0 | — |
| `final-node24-suite` | `timeout 900 npm test` (Node 24.22.1) | 0 | **586 pass / 0 fail** |

Base counts, from the implementer's receipts at d3e4f7c9 (clean):
`gate-base-node22-suite-01M622HNN4X0F36FM3G192PJY5.log` → **584 pass / 0 fail**;
`gate-base-node24-suite-01M622JQBKXGZHXCHW0E270E30.log` → **584 pass / 0 fail**.
Final − base = +2 on both lines, exactly the two new tests. No pre-existing
failures, so nothing to classify as regression/flake.

Unwrapped scoped probes (evidence, not reusable receipts): the four
mutation/base runs, the meta-lookup probe, the candidate-fix run and the
release-script run — all in `/tmp/rev38epn`, transcripts in
`probe-transcript.txt`, probe source in `meta-lookup-probe.test.ts`.

## Unmet criteria / test gaps

Against the task's acceptance list, all criteria are met except:

- **Public-safe text only** — not met for the commit's author identity
  (LOW-3). The diff and message are clean.
- **Test gap:** no coverage of the first-interaction *note* path at limit 0,
  which is what MEDIUM-1 breaks. A fix should add one assertion that the
  auto-subscribe note still names the conversation with the limit at 0 —
  `meta-lookup-probe.test.ts` is a ready-made starting point.
- **Test gap (minor):** nothing pins the getter's boundary values (`1000`
  accepted, `1001`/`-1` rejected) or the `0`-disables-but-`abc`-does-not
  distinction at the unit level. The implementer's `backscroll-probe.mjs`
  covers it as a probe, but it is not in the suite, so a future refactor of
  the getter is unguarded.

## Residual risk

- MEDIUM-1 is the only behavioural defect I found, and it is confined to the
  new `=0` mode; operators on the default are unaffected.
- The per-call `process.env` read means the limit can change under a running
  server (e.g. a test or an embedder mutating `process.env`). That is
  pre-existing and is in fact the behaviour the worker deliberately
  preserved, but it means `=0` is not a *startup* guarantee: nothing refuses
  or logs a later change. Low risk in practice.
- Not checked: behaviour against a live Slack workspace; the macOS CI leg;
  Node 22.12.0 exactly (the `engines` floor that `ci.yml` pins) — I ran
  22.23.3 and 24.22.1 as the brief specified.
- Not checked: whether `GPT-6-Astra` is the model that actually authored the
  commit. Not discoverable from the repo.

## Fix directions

1. **MEDIUM-1** — move the `backscrollLimit > 0` test inside the
   `isFirstInteraction && isAddressed` block so it guards only the
   `fetchHistory` call and its `isCurrent()` re-check, leaving the
   `lookUpMeta` call under the outer condition (exact shape and a green
   16/16 run in `probe-transcript.txt` §F). Add the missing assertion for
   the auto-subscribe note at limit 0.
2. **LOW-2** — reword `README.md:335` to match `parseInt` ("values that do
   not begin with a number in 0–1000 fall back to 50"), or tighten the getter
   to reject trailing junk.
3. **LOW-3** — set the commit's author to the owner's public identity before
   any push.
4. **LOW-1** — optional, and worth raising in the PR body rather than fixing
   silently: whether an unparseable `SLACK_BACKSCROLL_LIMIT` should refuse at
   startup via `startupSettings` now that `0` is a real "off". Flagging it in
   the PR as a deliberate, documented choice will pre-empt the review comment.
