# Review — TASK-NNEWZ round 2: `docs/FORK-VS-UPSTREAM.md` at `a2295638`

Preflight: `git rev-parse HEAD` = `a2295638779bce1bc6ec873b24adeacf4009b310` (match).
Fresh unauthenticated `git fetch` of both mains: upstream `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`
and fork `685b2debff12ed5cfdcae9070ddb131842c5a6d0` — **neither has moved**. Worktree left clean
at the same commit; all application/runtime work was done in `/tmp/nnewz-rv/repo`.

## Verdict

**Approve.** Every factual premise the next two PRs rest on checks out against git and the
public API, and I reproduced both extractions byte-for-byte and re-ran their suites
independently. A maintainer would find **no wrong factual premise**. They would find one
*shape* premise for PR 3 that contradicts this document's own U49 guidance and costs a review
round-trip (M1), and one omission about who reviewed #50 (M2). Neither is a defect in the
audit's mapping or its disposition.

## Findings

### MEDIUM

**M1 — `docs/FORK-VS-UPSTREAM.md:430` (order 3), `:464` (apply table) and `:90` (U49 row): the tested
disabled-tools extraction adds an operator switch *outside* #49's startup-refusal contract,
which the same document tells you not to do.** *(source-read + run)*

The U49 ledger row says "Integrate new configuration into the pure startup-parser design."
The measured artifact does the opposite: it creates a second parser file `src/configuration.ts`
(`optionalConfiguration`) beside upstream's `src/config.ts` (`startupSettings`), calls it from
`main()` after the refusal check, and **throws** instead of returning a refusal. The order-3
row and the apply table ("isolated optional parser", "+47/-2", "587/0") measure that shape.

Demonstrated on the production path in the rebuilt scratch tree:

```
$ SLACK_DISABLE_DMS=maybe node --import tsx src/index.ts --stdio
SLACK_DISABLE_DMS must be true or false, got "maybe"            # exit 1, #49's contract

$ SLACK_DISABLED_TOOLS=bogus_tool node --import tsx src/index.ts --stdio
[slack-mcpl] Fatal error: Error: SLACK_DISABLED_TOOLS names an unknown tool
    at optionalConfiguration (src/configuration.ts:5:63)
    at main (src/index.ts:48:20)                                 # exit 1, + 6 stack frames
```

`src/config.ts:3-9` (`booleanFlag`) states the intent this violates: "a present value must say
yes or no so a broken environment template cannot disable a guard." The new switch does not
name the offending value, and it surfaces through the `Fatal error` path, which in this
codebase means an unexpected crash rather than operator misconfiguration. Upstream main *is*
#49's merge commit, so this is the first PR after it to add a switch.

Two secondary consequences of the same root cause (extraction faithful to the *fork*, not
reconciled with *post-#49 upstream*):

- Validation is duplicated with two different messages — `src/configuration.ts:5`
  ("SLACK_DISABLED_TOOLS names an unknown tool") and the server constructor
  ("Unknown disabled tool"). Both are verbatim from the fork, so this is inherited, not
  introduced; it is still a likely review comment on a fresh PR.
- Both PRs put their tests in **new** files (`test/operatorZero.test.ts`,
  `test/operatorDisabled.test.ts`) when upstream already owns both homes:
  `test/operatorControls.test.ts:1-5` is "The operator controls seen from the host … The real
  server over the in-memory harness" and already holds `send_dm is not offered when DMs are
  disabled` — the same tool-hiding shape; `test/config.test.ts:5,15` already holds "operator
  switches default off only when absent…" and "…refuse present empty, whitespace, and
  unrecognized values" — the same parser shape.

Impact: both size bands survive (25 vs "20–50"; 49 vs "60–120"), but the PR-3 artifact is not
the patch that will land. Fix direction: put `disabledTools` in `StartupSettings`/`startupSettings`
returning a refusal (and name the bad value, as `booleanFlag` does), drop the second parser file
and the duplicate check, and move the cases into `test/config.test.ts` and
`test/operatorControls.test.ts`. Then re-state the order-3 estimate against that shape.

**M2 — `docs/FORK-VS-UPSTREAM.md:329-336` and `:428` (order 1): #50's only review is an
automated, non-collaborator review that states it did not run the code; the document does not
say so, while applying the opposite standard to #31.** *(source-read, public API)*

The document says "There is one COMMENTED review… The review recommends merge plus follow-up,
not a formal approval" — accurate about its *weight*, silent about its *provenance*. The review
body opens "### Automated review" and states that it reviewed commit `7fc1aca` "by reading the
code. **It did not run the code or look at the checks.**" `author_association` is
`NONE`. So **no maintainer or collaborator has reviewed #50.**

The document holds #31 to exactly the standard it skips here — "Obtain maintainer review: lack
of objections is not approval" — and it does characterise #12's reviews carefully (the later one
is `author_association: COLLABORATOR`, "posted by the maintainer's campaign runner", "Verdict:
**CHANGES_REQUESTED** (the formal review event is left to the maintainer)"). Order 1's "only
review follow-through remains" therefore understates #50: what remains is a first maintainer
look, not follow-through on one. Fix direction: one clause noting the review is automated and
from a non-collaborator, and apply the #31 sentence to #50.

### LOW

**L1 — `docs/FORK-VS-UPSTREAM.md:494-495`: "#49 exposes it to path uploads and the upstream
upload suites" reads as though upstream main's suite is affected today; it is not.**
*(run)* `test/fileAccess.test.ts` is fork-only (absent at `d3e4f7c9`), and my control run of
upstream main under the one-process runner is **584 pass / 0 fail**, clean. The leak can only
materialise once A's `fileAccess.test.ts` joins a one-process suite — which is what the
document says correctly elsewhere ("A/H follows with the mock-isolation fix as part of its
tests"). Worth tightening so nobody concludes upstream main is broken. The suites that *would*
be hit, once that file is present, are the ones sorting after it and using real `fetch`:
`test/toolRefusals.test.ts:130-138` and `test/uploadSteps.test.ts:245-246`
(`attachmentDownload.test.ts` sorts before it and is safe).

**L2 — disabled-tools extraction: the `src/index.ts` wiring line is the one uncovered line in
the patch.** *(run)* Reverting `src/index.ts` to upstream and keeping everything else leaves all
three new tests green (`# tests 3 / # pass 3 / # fail 0`) — the tests construct
`new SlackMcplServer(slack, {disabledTools})` directly, so nothing proves the env value reaches
the server. This disappears under M1's fix direction: in `startupSettings` the value is covered
by the existing `test/config.test.ts` / `test/cli.test.ts` pattern that #49 established.
The zero-backscroll test has no equivalent gap — it drives `process.env` through the real getter.

## Answers to the brief

### 1. Facts

All confirmed from git and the public API. Nothing wrong found.

| Claim | Check | Result |
|---|---|---|
| 57 ahead / 3 behind | `git rev-list --left-right --count 685b2deb...d3e4f7c9` | `57  3` ✓ |
| 31 non-merge + 26 merge = 57 | `rev-list --count [--no-merges\|--merges]` | 31 / 26 ✓ |
| merge base `439a81b5` | `git merge-base` | ✓ |
| 60 files, +4,916/-518 | `git diff --shortstat d3e4f7c9..685b2deb` | `60 files, 4916 insertions(+), 518 deletions(-)` ✓ |
| ledger covers exactly the diff | 60 doc rows vs 60 diff paths, `comm` both ways | **0 extra, 0 missing** ✓ |
| 15 ledger paths are upstream-only improvements | each of the 15 pure-U49 paths vs merge base | all 15 `SAME-as-base`, i.e. true inverse deltas ✓ |
| acceptance: every `439a81b5..685b2deb` path mapped | 45 paths vs the 60-row ledger | 45 is a strict subset, 0 unmapped ✓ |
| upstream-only history is two commits + merge #49 | `git log d3e4f7c9 ^685b2deb` | `9e6afe9`, `2b887e8`, merge `d3e4f7c9` ✓ |
| only open fork PRs are #12/#31/#50; #20 is another fork's | `GET /pulls?state=open&per_page=100` | 4 open: #50/#31/#12 from `theaspirational`, #20 from `nissa-seru` ✓ |

Fresh `GET /repos/anima-research/slack-mcpl/pulls/{n}` (unauthenticated):

- **#12** open, non-draft, `mergeable:false`, `mergeable_state:dirty`, head `21a7ebc`, API base
  `4c50eef`, 7 files +218/-14, 7 commits, 8 inline review comments and 8 issue comments.
  Commit list matches the document's
  seven exactly. Fork beyond head over the seven PR files: **5 files, +1,204/-254** — matches;
  `src/feature-sets.ts` and the changelog fragment absent from that list, i.e. byte-identical,
  confirming "**the fork has not made typing optional**."
- **#31** open, `mergeable:false`, `dirty`, head `ddf9212`, base `bff8f10`, 12 files +1,131/-53,
  10 commits, **0 reviews / 0 inline comments**, 3 issue comments. Fork beyond head over the 12
  API files: **6 files, +711/-120** — matches; `upload-path.ts`, `tool-classes.ts`,
  `uploadPath.test.ts`, `pathUploads.test.ts` and both fragments byte-identical, and `src/tools.ts`
  differs *only* in import ordering — matches verbatim.
- **#50** open, `mergeable:true`, `clean`, head `7fc1aca`, base `d3e4f7c9`, 1 commit,
  **5 files +66/-8**, 1 inline comment, 0 issue comments ✓.
- **#20** open, `dirty`, head `7afe8df`; its one review is `APPROVED` at `0ba9f49` — the
  document's "the existing approval predates this base" ✓.
- **#49** merged 2026-10-28, 18 files +380/-155 — and exactly 18 ledger rows name U49 ✓.
  #26/#32/#38/#39/#45/#47/#48 all merged, as the document states.

Ledger rows sampled against `git diff d3e4f7c9..685b2deb` — **19 rows**, all exact:
`package.json` (U49 test command only, **no dependency delta** ✓), `src/history-read.ts` (one
appended `a.fetchHint` ✓ H), `src/tools.ts` (P only ✓), `src/feature-sets.ts` (T declaration +
manifest ✓), `src/content.ts` (P `SLACK_MAX_FILE_BYTES` + A `redirect` option + A `fileId`-bearing
types — all three owners, nothing else ✓), `changelog.d/enterprise-user-ids.fixed.md` (E ✓),
`test/harness.ts` (every hunk is T status fake/capture + the `channels.typing` grant, so "all
remaining hunks" is exact ✓), `src/upload-path.ts` / `src/tool-classes.ts` /
`test/uploadPath.test.ts` / `test/pathUploads.test.ts` (P ✓), `src/clock.ts` / `test/clock.test.ts`
/ `test/virtualClock.ts` / `src/config.ts` (U49, absent from fork ✓), `src/configuration.ts`
(A+F+G+R+E+O+K owners all present ✓), `src/access-policy.ts` (A `requireReadable`, F proof symbol
+ fallback validation, G `groupDms` **and** the "must not overlap" rejection, E `/^[UW]…/` — all
four ✓), `src/file-access.ts` (`associatedFileUrl` + `attachmentFetchHint` ✓),
`test/fileAccess.test.ts` (A tests + P's final oversized-Buffer test as the last case ✓),
`test/recipientRouting.test.ts` (E's Enterprise Grid W-ID test at line 188 ✓),
`changelog.d/feat-slack-thread-status.added.md` (identical to #12 head ✓).

Five higher-risk assertions I also verified because a maintainer would:

- Row U, "do not resend `b060b2f`": `b060b2f` added a clock-derived `latest`
  (`Date.now()/1000 + 60`) when only `oldest` was given. Upstream `src/history-read.ts:280-283`
  now says history "ends at the first message at or before `oldest`, **which isn't sent to
  Slack**", and `:336-340` applies `oldest` locally via `rows.findIndex`. Genuinely superseded ✓.
  `test/historyRead.test.ts`, `inboundOrder.test.ts`, `locationHeader.test.ts` are byte-identical
  between the mains ✓.
- #12 section, "the post-ownership fix is already in #12 via `2d9ac2a`": the line
  `if (opts.threadTs && status?.ts === opts.threadTs) status.at = -Infinity;` is present in both
  `21a7ebc:src/slack-adapter.ts:1224` and `685b2deb:src/slack-adapter.ts:1471`, introduced by
  `2d9ac2a`, which is in #12's commit list ✓. The warning not to re-present it is well founded.
- R1-1's premise: fork `src/feature-sets.ts:55-62` adds `channels.typing` to `messagingUses`, and
  `src/grant.ts:88-92` (**identical in both mains**) returns false from `isFeatureSetActive` when
  `missingFor(name).length !== 0`. So an older grant without `channels.typing` disables the whole
  messaging feature set. R1-1 is a real blocker, correctly identified, correctly deferred to
  TASK-H6B2X.
- The subtlest semantic claim, and the subject of the three newest fork commits: "Non-routed group
  DMs do not depend on `readJoinedChannels`; routed group DMs do, because the ledger admits them as
  joined private channels." Exact: `685b2deb:src/access-policy.ts:81-85` returns `'group_dm'` in an
  early branch that never reaches the `!this.readJoinedChannels` test at `:98-101`; and
  `685b2deb:src/slack-adapter.ts:1875` classifies an mpim as `private_channel`
  (`is_mpim || is_private ? 'private_channel' : 'channel'`), which *does* go through that test. This
  also confirms the G row's "No new host wire kind is required: routed group DMs use
  `private_channel` admission" ✓.
- "Descriptor-label bug also exists upstream": `src/channels.ts` is byte-identical between the two
  mains, and `d3e4f7c9:src/channels.ts:24-28` quotes DM/group-DM names via `nameShown` while
  interpolating `conv.name` and `teamName` raw ✓. #50 is not in fork main ✓.

The 13 rows of `apply-results.json` conflict paths match the document's apply table row for row.
I also re-ran the #12 apply myself: `git diff 4c50eef 21a7ebc` onto `d3e4f7c9` with `--3way`
conflicts in **exactly one file, `test/harness.ts`**, and the conflict hunks are literally `reads`
versus `statuses` (at the `fakeWeb` signature, the `Harness` interface and the `fakeSlack` return).
So the document's resolution advice — "Merge `reads` with `statuses` rather than dropping either" —
is right, and its hedge that the review's historical conflict might not be today's turns out
conservative: it is today's.

### 2. The next two PRs

**Both extractions are complete, correctly scoped, byte-faithful to the fork, and carry real
regression tests. Both size estimates are right.** Rebuilt independently in my own scratch clone
at `d3e4f7c9` (Node 22.23.3, `npm ci --ignore-scripts` with two empty npm config files).

*Zero automatic backscroll* — 2 files, **+22/-3** (= the claimed 25 changed lines; "20–50" band).
Both `src/server.ts` hunks are byte-identical to `685b2deb:src/server.ts` (the getter block diffs
empty against the fork). No new imports; `src/server.ts` is the only production file;
**no dependency on any other fork feature**. The `backscrollLimit > 0` guard at the single
automatic `fetchHistory` call site is the whole feature — no other automatic read in either tree
is gated on it. No zero-limit test exists in *either* main (`git grep SLACK_BACKSCROLL_LIMIT -- test/`
is empty in both), so the new test is genuinely new coverage, and the README row already exists in
the fork, consistent with "before docs/fragment".

*Disabled-tool controls* — 4 files, **+47/-2** (= the claimed 49; "60–120" band). I re-ran
`prepare-disabled.py` against my own clone and the output is **byte-identical** to the worker's
`disabled-tested.patch`. Faithfulness: the parse block is the fork's three lines verbatim
(`685b2deb:src/configuration.ts:47-49`), the constructor validation + copy is verbatim
(`685b2deb:src/server.ts:270-273`), the `offeredTools` filter line is verbatim, and the refuse
block and its **ordering** (after the `tools` capability throw, before the feature-set check) are
verbatim (`685b2deb:src/server.ts:682-684`). Correctly scoped: it filters `toolDefinitions`, not the fork's
`toolDefinitionsForPathUploads`, so P is not dragged in; the only new import is upstream's
`./tools.js`; **no routing, no access policy**. See M1 for the one shape objection.

Writing fresh tests rather than lifting the fork's was necessary, not gratuitous: the fork's only
end-to-end disabled-tools coverage is `685b2deb:test/recipientIntegration.test.ts:161-168`, whose
fixture calls both `configureAccessPolicy(policy)` and
`configureRecipientRouting({stateFile: …receipts.sqlite…})` at `:44-45` — so it depends on A *and*
R, including `node:sqlite`. The parser coverage at `685b2deb:test/configuration.test.ts:7,12-13,28`
asserts `disabledTools` inside the same object as `accessPolicy` and `recipientRouting`, so it
cannot be lifted verbatim either. The document's "Neither should import the recipient fixture just
to test a switch" is the right call.

Gates (all `orgasmic dispatch gate`, logs in this directory; typecheck + build + full suite,
`node --import tsx --test --experimental-test-isolation=none test/*.test.ts`):

| Scratch tree | typecheck | build | suite |
|---|---|---|---|
| control, upstream main `d3e4f7c9` | pass | pass | **584 pass / 0 fail / 0 skipped** |
| #50 exact patch (clean apply) | pass | pass | **602 / 0 / 0** |
| zero backscroll | pass | pass | **585 / 0 / 0** |
| disabled tools | pass | pass | **587 / 0 / 0** |

Every count matches the document exactly (584, 602, 585, 587), with no skipped or cancelled tests.

Red-without-the-change and mutations:

- Zero, red: test alone on upstream main → `not ok 1 … # pass 0 / # fail 1` (limit `0` clamps to
  50, the read happens).
- Zero, **mutation**: drop `&& this.backscrollLimit > 0`, keep the `[0,1000]` clamp → `# fail 1`.
  The test pins the guard specifically, not just the clamp.
- Disabled, red: revert `src/server.ts` only (parser kept so imports resolve) →
  `# pass 1 / # fail 2`; both hide/refuse cases fail in MCP and MCPL mode.
- Disabled, **mutation A**: drop the `handleToolCall` refusal only → `# fail 2`.
- Disabled, **mutation B**: drop the `tools/list` filter only → `# fail 2`.
- Disabled, **mutation C**: drop `this.opts = { ...opts, disabledTools: [...] }` → `# fail 2`,
  so the document's "copied-option checks" claim is genuinely exercised (via `splice(0)` after
  construction).
- The one gap is L2 (`src/index.ts` wiring uncovered).

### 3. The test-isolation problem — **reproduced, and the stated cause is exactly right**

`685b2deb:test/fileAccess.test.ts:38` (fixture) and `:112` (redirect test) both call
`t.mock.method(globalThis, 'fetch', …)` on the **same** `TestContext`. Node's `MockTracker`
restores in **insertion** order, not reverse: mock1's record (original = native) is restored
first, then mock2's record (original = **mock1**) — leaving mock1 installed. Standalone probe on
Node 22.23.3, no repo code involved (`probes/leak.test.mjs`):

```
fetch === native ?  false
leaked mock returns: MOCK1
```

The consequence the document claims is also reproduced verbatim (`probes/consequence.test.mjs`) —
a later test that really fetches its own HTTP server:

```
body = "hello"   endpoint contacted = false
```

`"hello"` is literally the fixture's body (`new Response('hello', {'content-type':'text/plain'})`),
so "a subsequent test's fetch returns fixture bytes without contacting its endpoint" is exact.
The proposed one-line fix (`t.mock.restoreAll()` after `fixture(t)`, `mock-diagnostic-fix.patch`)
also checks out in the probe: `body = "FROM-REAL-SERVER", endpoint contacted = true`,
`# pass 2 / # fail 0`.

What it means:

- **Test-only.** The nesting is in test code; no production path reads it. It does **not** block
  moving deployments to upstream main, and it is not a reason to delay orders 1–5.
- **Not an upstream problem today.** `test/fileAccess.test.ts` does not exist at `d3e4f7c9`, and my
  control suite is 584/0 clean. Nothing in upstream's current suite nests two mocks of one global
  (`toolRefusals.test.ts:132-134` assigns and restores directly; `uploadSteps.test.ts:245-246`
  installs one). See L1 on wording.
- **It lands with A, not with #31.** #31's 12 files do not include `test/fileAccess.test.ts`; the
  file travels with A (the ledger assigns it "A … ; P final raw-path/oversized-Buffer test"). So
  orders 2, 3 and 4 are unaffected, and order 6 (A+H) must carry the fix. The document already
  places it there ("A/H follows with the mock-isolation fix as part of its tests") — correct.
- **For any PR touching those tests:** restore before re-mocking rather than nesting, in any test
  file that will run in the one-process suite. The general rule is stronger than the one-line
  diagnostic: never install a second mock of the same property in one `TestContext`. The committed
  fix should also not be labelled "diagnostic", and the document is right that 22 passing targeted
  tests do not qualify the composed suite.

I did not re-run the composed two-file hang; the document labels it "not established" and does not
claim a pass, and the mechanism is now confirmed independently at the source level.

### 4. #50's upstream review

One review, state `COMMENTED`, `author_association: NONE`, self-described automated
(it reviewed `7fc1aca` "by reading the code. It did not run the code or look at the checks"), plus one inline comment, no issue conversation. Verdict line, verbatim:

> **Recommendation: merge and fast-follow.** 1 medium severity finding can be fixed after the merge.

The one medium finding (inline on `changelog.d/channel-label-framing.fixed.md`, discussion
`r4404439456`), verbatim title and ask:

> **Medium severity, documentation. Changelog leaves out that a host keeps the old label while
> `to` shows the new one.**
> … "It should say that conversations already known to a host keep their old label, and that
> non-plain workspace names change for every conversation, so the `to` value no longer matches the
> host-held label."

Its reasoning: the host keeps the label a conversation was first announced with and a refresh never
re-announces a known conversation, so after upgrade a host holds `#general (Acme, Inc)` while a
write's `to`, built from the server's fresh `ChannelManager`, returns `#general ("Acme, Inc")`.

Two further low findings: *test coverage* — "End-to-end tests never exercise a hostile workspace
name or the other paths the changelog lists" (the harness always uses the plain name `acme`), ask:
"Make the harness's team name configurable and add a case with a hostile workspace name, plus one
through `refresh_channels`"; and *maintainability* — "Test name mentions only DMs and group DMs but
also asserts an ordinary channel's label", ask: the name should mention channels too.

The document's summary of all of this is accurate and complete. The only omission is provenance
(M2).

### 5. Is the revised order sound?

**Yes — sound, and the revision is an improvement.** Smallest-and-most-independent-first holds
on measured sizes (#50 exact +66/-8 → 25 → 49 → #31 → #12 → A+H …), and the two swaps the
document makes are both justified by evidence I confirmed:

- **#31 ahead of #12.** #31's conflict is localised to `src/index.ts` startup parsing and a minimal
  reconciliation passes 661/0 (the worker's `pr31-driver.log` shows `# pass 661 / # fail 0`;
  reused, not re-run here). #12 still needs R1-1, and R1-1 is a real behavioural blocker I verified
  in source (`src/grant.ts:88-92` + `src/feature-sets.ts:55-62`): landing #12 as-is disables the
  entire messaging feature set for any host whose grant predates `channels.typing`. Putting #12
  behind the small PRs is right.
- **Zero backscroll before disabled tools.** 25 vs 49 lines, and zero adds no new file. Correct.

Dependency edges check out: S needs F's test file (`test/historyMembershipFallback.test.ts` is
absent from main's index, which the apply table records precisely); E's validators cannot precede
the files they live in; H is inseparable from A's activation; the mock fix belongs with A because
that is when `test/fileAccess.test.ts` arrives.

Nothing is missing from the order. All 60 ledger paths are accounted for: 15 are U49 inverse
deltas (no PR), K and D are the two declared fork-only rows, U is already upstream, E folds into
its introducing PRs, Q is #50, and the rest map to orders 2–11. Two notes rather than gaps:

- S should be a commit *inside* F, not a follow-up PR, so no intermediate release ships a stale
  pin that hides other conversations. The document says this in two places (row S "preferably
  included before F merges", order 8 "can be a separate review commit within F") but still numbers
  it as its own step — worth collapsing.
- There is no separate step for the `t.mock` fix, correctly, since the file it fixes does not exist
  upstream until A. Flagging it so it is not read as an oversight.

## Verification gates

| Gate | Command | Result | Log |
|---|---|---|---|
| `control-upstream-main` | typecheck + build + `npm test` at `d3e4f7c9` | **exit 0** — 584/0/0 | `gate-control-upstream-main-01M621B3RHCRN78MS8K65KR8YH.log` |
| `pr1-label-50` | same, #50 exact patch on `d3e4f7c9` | **exit 0** — 602/0/0 | `gate-pr1-label-50-01M621QA171HPX6BQ7TN67RH8S.log` |
| `pr2-zero-backscroll` | same, zero-backscroll extraction | **exit 0** — 585/0/0 | `gate-pr2-zero-backscroll-01M621C2KDV387JM8JCAZT8XA0.log` |
| `pr3-disabled-tools` | same, disabled-tools extraction | **exit 0** — 587/0/0 | `gate-pr3-disabled-tools-01M621E0NDB29SJZP6N4V3YJZW.log` |
| reusable receipt read, not re-run | `final-consistency` at `a2295638` | exit 0 | reviewed run's `gate-final-consistency-01M620YHMYD5Z4C98SHZC2VXPA.log` |

Unwrapped scoped probes (no receipts, commands in this report): the Node mock-restore probes
(`probes/*.mjs`), six red/mutation runs across the two PRs, the two startup-refusal CLI runs, and
the git/API fact checks. Environment: Linux, Node **22.23.3**, npm 10.9.9, Python 3.12.3,
`npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org` with
`NPM_CONFIG_USERCONFIG`/`NPM_CONFIG_GLOBALCONFIG` pointing at two empty files and update notifiers
off. 51 packages, no lockfile change.

## Unmet criteria and test gaps

No unmet acceptance criterion. The round-1 criteria all hold at this commit: the 45-path
`439a81b5..685b2deb` delta is fully mapped (0 unmapped), #12 and #31 both have "what the fork
carries beyond the head" plus landing work, every needs-PR row states scope/base/size/tests/risk
and its companion requirement, recipient routing is flagged as the critical path with a required
companion-interface table, TASK-9YJZP is recorded as a bug present upstream (verified), the order
is smallest-first, and I found no agent, host or private name in the document.

Test gaps, all in the proposed future work rather than in this document's claims:

- L2: the disabled-tools `src/index.ts` wiring is uncovered.
- Neither new switch gets a refusal/garbage-value test (`SLACK_BACKSCROLL_LIMIT=abc` silently
  becomes 50 — pre-existing upstream behaviour, not introduced here; `SLACK_DISABLED_TOOLS=bogus`
  throws). Under M1's fix both would be covered by `test/config.test.ts`'s existing pattern.
- The composed full suite remains unestablished, as the document states.
- No A/H/F/G/R/B stack has ever been built standalone; eight of the thirteen apply rows have no
  suite, which the document marks "not run" in every case.

## Residual risk

- **Shape churn on PR 3** (M1): expect one review round-trip; the band holds but the artifact does not.
- **#50 has had no human review** (M2): order 1 is less finished than "only review follow-through" suggests.
- **PR state is a snapshot.** Both mains and all four PR heads are unmoved as of this review, but
  #31 went `mergeable:true → dirty` between audits; recompute before any PR work, as the document says.
- **The one-process runner will surface more isolation bugs during A/H/F/G/R/B extraction.** The
  `fileAccess.test.ts` nesting is one instance found by inspecting one file; the document's list of
  real-`setTimeout` yields in `accessPolicy.test.ts`, `historyMembershipFallback.test.ts`,
  `recipientIntegration.test.ts` and `threadStatus.test.ts` is a reasonable watch list, and it
  correctly declines to claim their composition was established.
- **Companion integration is unverified by construction.** No agent-framework or connectome-host
  checkout was inspected, so order 11 remains the real migration risk; the document says so.

## Fix directions

1. M1: move `disabledTools` into `StartupSettings` / `startupSettings` returning a refusal that
   names the bad value; delete `src/configuration.ts` and the duplicate constructor check; move
   the cases into `test/config.test.ts` and `test/operatorControls.test.ts`; re-measure order 3.
   Consider the same for `SLACK_BACKSCROLL_LIMIT` as a note, not a requirement for PR 2.
2. M2: add one clause on #50's review provenance and apply the #31 "lack of objections is not
   approval" sentence to it; soften order 1's "only review follow-through remains".
3. L1: scope the exposure sentence to "once A's `fileAccess.test.ts` joins a one-process suite";
   optionally name `toolRefusals.test.ts` and `uploadSteps.test.ts` as the files that would be hit.
4. L2: either fold the wiring into `startupSettings` (which removes the gap) or add one case that
   drives the env var through `main`'s parse into `offeredTools`.
5. Collapse order 8 (S) into order 7 (F) as a reviewed commit, matching what the row already advises.
6. Carry the mock fix as a non-"diagnostic" change inside A+H, stated as "never nest two mocks of
   one property in a `TestContext`", not only as the one-line `restoreAll()`.

## What I could not check

- **GitHub REST rate limit (60/hr, unauthenticated) was exhausted** partway through, and did not
  reset inside the review window (I polled it to the end; ~6 minutes short). I fetched the PR
  objects for #12/#31/#50/#20/#49 and the open-PR list **fresh and independently**, and those are
  the facts I assert above. For **#50's and #12's review *bodies*** — the verbatim quotes in
  answer 4 and the provenance claim in M2 — I read the reviewed run's captured
  `pulls-50-reviews.json`, `pulls-50-comments.json`, `pulls-12-reviews.json` and
  `issues-50-comments.json` rather than re-fetching. Their *counts* and *states* are corroborated
  by my fresh PR-object GETs (#50: `review_comments:1, comments:0`; #31: `0 reviews / 3 issue
  comments`; #12: `8/8`), and the inline-comment id `r4404439456` that #50's review body cites
  matches the captured comment's own `id`, so the residual risk is limited to body text being
  altered in the capture. **M2 is the one finding resting on captured rather than re-fetched
  text** — re-read `GET /repos/anima-research/slack-mcpl/pulls/50/reviews` to confirm
  `author_association: NONE` and the "did not run the code" sentence before acting on it. Nothing
  in answers 1, 2, 3 or 5, and neither M1 nor L1 nor L2, depends on that capture.
- **#31's reconciliation and 661/0** — reused from the worker's `pr31-driver.log`; I did not rebuild
  it (the brief scoped rebuilds to the next two PRs).
- **The composed two-file hang** — not re-run; the mechanism is confirmed independently instead.
- **Non-Linux / non-Node-22.23.3 behaviour**, live Slack, filesystem-security qualification for P,
  and any agent-framework or connectome-host checkout — out of scope and out of reach here.
