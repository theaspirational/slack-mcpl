# TASK-XH3RC review — merge upstream main ca8f6b11 into fork main

## Verdict

**Approve — HIGH confidence.**

Merge commit `3152457a48eb3ffe637c657f2f1d2fcf1db8c42c` satisfies every acceptance criterion.
I re-derived the merge mechanically rather than trusting the implementer's
`merge-integrity.py`: of the 21 upstream-side and 45 fork-side files changed since the
merge base `439a81b502388ab3a77b4bbb0e62a380e1b50605`, exactly three overlap
(`src/index.ts`, `src/server.ts`, `src/slack-adapter.ts`), and every non-overlapping file's
merged blob is byte-identical to its owning parent. No file is deleted relative to either
parent. No fork test disappeared (823 → 833 by name-set comparison, zero removals). No
findings at HIGH or MEDIUM.

## Findings

No HIGH or MEDIUM findings.

**LOW (docs/convention) — commit has no `Co-Authored-By:` trailer.**
`CONTRIBUTING.md:79` asks for a `Co-Authored-By:` trailer naming the model on AI-assisted
commits; `git log -1 --format=%b 3152457a` is empty. The assignment pinned the exact message
`Merge upstream main ca8f6b11 into fork main`, so the task spec overrides the guide and the
implementer flagged this. Recorded only so a later maintainer is not surprised.
Fix direction: none needed unless the manager wants the trailer, which would require amending
the pinned message.

**LOW (docs) — src/ changed with no new changelog fragment.**
`CONTRIBUTING.md:49,107-110` require a fragment when `src/` changes.
`.github/workflows/changelog.yml:14` only runs `on: pull_request`, so a merge commit landing
on `main` is not gated, and the merge introduces no behavior of its own (upstream's own
`changelog.d/engines-node-22-12.breaking.md` is carried in). Correct call; noted for
completeness.

**LOW (test, pre-existing/upstream) — fork timing paths are not virtualizable.**
`test/virtualClock.ts` mocks the `clock` singleton's `now`/`sleep`. Fork-only code still reads
wall time directly: `src/slack-adapter.ts:1332` and `:1339` (`STATUS_REFRESH_MS` thread-status
throttle), `src/slack-adapter.ts:1290` and `src/server.ts:1732` (ack/typing timers),
`src/upload-path.ts:248`. Upstream never touched those lines, so this is not a merge
regression, but after the merge the repo has two time sources and upstream's virtual-clock
tests cannot reach the fork's. Fix direction: a follow-up task routing fork timing through
`clock` from `src/clock.ts`.

## What I verified, concretely

**Conflict resolution — `src/index.ts`.** `git diff 685b2deb 3152457a -- src/index.ts` is
exactly upstream's refactor (drop the local `flag()` helper and inline parsing, call
`startupSettings(process.argv.slice(2), process.env)`) laid over fork main, with every fork
element intact: `optionalConfiguration(process.env)` and the `SLACK_PATH_UPLOADS`
JSON/`validatePathUploadPolicy` block both still run **before** `connectSlack`;
`accessPolicy` and `recipientRouting` still reach `connectSlack` (`src/index.ts:68-69`);
`disabledTools` and `pathUploads` still reach `SlackMcplServer` (`:70-74`); the fork's
writes/DMs/group-DMs startup diagnostic is unchanged (`:79-83`). Field-by-field,
`startupSettings` (`src/config.ts:28-54`) reproduces the fork's parsing of `SLACK_DM_USERS`,
`SLACK_SEND_CHANNELS` (including the set-but-empty refusal, same string), `SLACK_DISABLE_DMS`,
`SLACK_SUBSCRIBE_MEMBER_CHANNELS` and `SLACK_ACK_REACTION`. The only semantic change is
diagnostic ordering: base-setting refusals now precede `optionalConfiguration` errors, where
fork main ran `optionalConfiguration` first. Both orders exit 1 before any Slack contact, so
only which of two messages prints when two settings are wrong at once differs. Correctly
documented by the implementer.

**Conflict resolution — `src/slack-adapter.ts`.** `git diff 685b2deb 3152457a` on that file is
upstream's three hunks verbatim (`clock` import, `clock.now()` in `assertRequestFits`,
`clock.now()` + `clock.sleep()` in `SlackWebClient.send`). The dropped `NOTHING_RETURNED`
import is correct: `grep -rn NOTHING_RETURNED src/ test/` shows zero uses in
`slack-adapter.ts`, and the symbol is still exported from `src/history-read.ts:37` and used by
`src/slack-errors.ts` and `src/server.ts`. All ~400 lines of fork group-DM authorization,
framing, conversation IDs/recipients, uploads and thread status are untouched.

**`src/server.ts` was a genuine clean auto-merge.** `git merge-tree --write-tree 685b2deb
ca8f6b11` produced tree `d5ac2400f6f8be47d634f8771cdaf927f2a9070c`; the merged
`src/server.ts` blob is **identical** to that tree's, and the file's diff vs the fork parent is
exactly upstream's three clock hunks. The same command confirms the conflict set was only
`src/index.ts` and `src/slack-adapter.ts`, as the task stated.

**`test/fileAccess.test.ts` mock change weakens nothing.** The diff adds `fetchMock` to the
fixture's return value and swaps `t.mock.method(globalThis, 'fetch', …)` for
`h.fetchMock.mock.mockImplementation(…)` in the redirect test (`:114`). Every assertion is
unchanged and all still present: `isError`, `sent.length === 1`, `redirect === 'error'`,
host `files.slack.com`, `Authorization: Bearer <token>`, and the two leak assertions that the
refusal text contains neither the token nor `evil.example` (`:121-127`). Behaviourally the two
forms are equivalent inside the test (the inner stub shadowed the fixture's either way); the
change only stops the stacked mock from being restored over the real `fetch` and leaking the
fixture stub into later files under upstream's new single-process runner
(`package.json:13`, `--experimental-test-isolation=none`). I grepped for the same hazard
elsewhere: `grep -rn "mock.method(globalThis" test/` shows every other `fetch` mock is a single
per-test install, and `mockImplementation` appears only at this one site. No other stacking
exists.

**`test/cli.test.ts` is upstream's file plus a pure addition.** `git diff ca8f6b11 3152457a` on
that file is additive only — no upstream parser test removed or edited. The added test is a
real production-path regression: `startWith()` (`:16-23`) spawns `src/index.ts --stdio` as a
subprocess with all `SLACK_*` variables stripped, and asserts status 1, empty stdout, the
expected diagnostic, and `doesNotMatch(/invalid_auth|Slack connected/)` — i.e. the refusal
happened before Slack was contacted. It covers access-policy JSON, the group-DM /
history-fallback overlap, routing-without-policy, unknown disabled tool, the removed
`SLACK_ALLOW_FILE_PATHS` switch, and both path-upload failure shapes.

**No fork feature or upstream change lost.** Beyond the blob-identity sweep: `README.md` (+231),
`docs/HOST-COMPATIBILITY.md`, all 16 fork `changelog.d/` fragments, `src/access-policy.ts`,
`src/configuration.ts`, `src/recipient-routing.ts`, `src/upload-path.ts`,
`src/host-compatibility.ts`, `src/tools.ts`, `src/feature-sets.ts`, `src/tool-classes.ts` and
the 15 fork test files are all byte-identical to `685b2deb`. Upstream's `ci.yml`,
`CONTRIBUTING.md`, `package.json` (`engines: >=22.12.0`), `scripts/release-changelog.*`,
`src/clock.ts`, `src/config.ts`, `test/virtualClock.ts` and the eight changed upstream test
files are byte-identical to `ca8f6b11`. `grep` for conflict markers across `src/ test/ scripts/
*.md *.json` returns nothing.

**Commit identity.** Parents `685b2debff12ed5cfdcae9070ddb131842c5a6d0`,
`ca8f6b1193154384e4626921255f86923fc5edf3`. Author and committer
`Vasyl Dovhanchyn <48733736+theaspirational@users.noreply.github.com>`. Subject exactly
`Merge upstream main ca8f6b11 into fork main`, empty body. No push performed.

## Verification Gates

Rerun from scratch at `3152457a` in my own worktree, no receipt reuse, as the brief required.

| Gate | Command | Result | Log |
|---|---|---|---|
| `review-node22.23.3` | `bash -c 'export PATH=/opt/node/bin:$PATH; node --version; npm --version; npm ci && npm run build && npm run typecheck && npm test'` | **exit 0** — node v22.23.3, npm 10.9.9; `tsc` build and `tsc --noEmit` typecheck clean; **833 tests, 805 pass, 0 fail, 0 cancelled, 28 skipped, 0 todo**, zero `not ok` lines, 18.2 s | `gate-review-node22.23.3-01M6296JHTHE5H7JGK6QYKHZWX.log` (console copy: `review-node22.23.3.console.log`) |

My counts match the implementer's `merged-node22.23.3` claim exactly. Delta vs their fork-main
baseline log: 823 → 833 tests, 0 → 0 failures, 28 → 28 skips. By name-set comparison the 10
additions are nine upstream tests (clock/sleep/call-time, `startupSettings` parsing, CLI
release and import behaviour) plus the one new fork-feature CLI regression; **no test was
removed**. The 28 skips are the identical set before and after (`diff` of the normalized skip
name lists is empty modulo test numbering) — all Node-24-only recipient-routing, typing-context
and tool-switch cases, so no fork coverage was silently skipped into passing.

Scoped probes (unwrapped — **no reusable receipt**, reproducible from the commands below):

- **Built-artifact startup probe** against `dist/src/index.js` on Node 22.23.3 with `env -i`
  and valid-shaped fake tokens. All ten fork and upstream refusals fire with exit 1 and zero
  bytes on stdout: bad `SLACK_DISABLE_DMS`, empty `SLACK_SEND_CHANNELS`, invalid
  `SLACK_ACCESS_POLICY` JSON, the `groupDms`/`historyMembershipFallbackChannels` overlap,
  routing without a policy, unknown `SLACK_DISABLED_TOOLS`, removed `SLACK_ALLOW_FILE_PATHS`,
  and both `SLACK_PATH_UPLOADS` shapes. This proves the fork's validations survive on the
  **built** path, which `test/cli.test.ts` does not cover (it runs `tsx src/index.ts`).
- **Upstream's new CI "Start without credentials" step, reproduced locally.**
  `env -i node dist/src/index.js --stdio </dev/null` → status 1, stdout 0 bytes, stderr an
  **exact** `cmp` match for the single line
  `SLACK_BOT_TOKEN and SLACK_APP_TOKEN environment variables are required`. Worth calling out:
  this new upstream gate (`.github/workflows/ci.yml:51-61`) asserts that line is *all* of
  stderr, and the fork adds extra startup diagnostics — the merge still passes because the
  token refusal precedes them.
- **Mechanical merge reconstruction:** `git merge-base`, `git merge-tree --write-tree`, and
  per-file `git rev-parse <rev>:<path>` blob comparison across all 66 parent-changed paths.

Reused implementer evidence: `baseline-node22.23.3.console.log` (fork-main baseline test name
set), `merge-diff.patch`, `report.md`. I did **not** rely on `merge-integrity.py`'s verdict,
`merged-node22.12.0`, or `recipient-node24`; I re-derived the preservation claim independently
and it holds.

Worktree left as found: `git status --porcelain` empty, HEAD still `3152457a`, no commits, no
tracked-file edits. Only ignored `node_modules/` and `dist/` were produced.

## Unmet criteria / test gaps

No unmet acceptance criteria.

- **Node 22.12.0 floor not rerun by me.** The brief named only 22.23.3 for the rerun. The
  implementer's `merged-node22.12.0` receipt (exit 0, same 833/805/0/28) covers it; the two Node
  versions exercise the same sources, so the marginal risk is low.
- **Diagnostic-ordering change is untested.** No test pins which message appears when a base
  setting *and* an optional profile are both invalid. The behaviour is deliberate and
  documented, and every individual refusal is covered by the new CLI test, so this is a gap in
  pinning intent, not in coverage of the criterion.
- **Node-24-only paths rest on the implementer's probe.** Durable SQLite recipient receipts,
  routed group DMs, frozen typing context and tool switches are skipped on Node 22; I did not
  rerun their Node 24 probe. The merge does not touch `src/recipient-routing.ts` or
  `src/access-policy.ts` (byte-identical to the fork parent), so the exposure is confined to
  the three merged files, all of which I read line by line.
- **No live Slack workspace verification**, as the implementer stated. Out of scope for a merge.

## Residual risk

- **Single-process test runner is a new, upstream-chosen fragility.** `package.json:13` now
  carries `--experimental-test-isolation=none`, so module-level state is shared across all test
  files — exactly the hazard that produced the 12 upload failures the implementer hit and fixed.
  `test/virtualClock.ts` mocks the shared `clock` singleton, and several fork tests mutate
  `process.env.SLACK_BOT_TOKEN`. The suite is green across three independent runs (my 22.23.3,
  their 22.23.3 and their 22.12.0), but ordering-dependent flakiness is more likely than before
  the merge. Attributable to upstream, not to the resolution.
- **Two time sources** in the merged tree (LOW finding above), which will matter if upstream
  extends the clock refactor.
- **`npm ci` reports 2 high-severity advisories**, identically before and after the merge. No
  lockfile or dependency change here; out of scope.
- **CI matrix unverified in-situ.** `ci.yml` is upstream's verbatim and five legs (ubuntu
  22.12.0/latest/24, macos 22.12.0/latest) have never run on this merged tree. I reproduced the
  one genuinely new leg-wide assertion locally (the no-credentials start), but macOS and
  `node: latest` remain unexercised.
- Nothing was pushed; the merge is local to `task-xh3rc-impl`. `main` still points at
  `685b2deb`.

## Fix directions

Nothing blocking. Optional follow-ups, in priority order:

1. Route fork timing (`src/slack-adapter.ts:1290,1332,1339`, `src/server.ts:1732`,
   `src/upload-path.ts:248`) through `clock` from `src/clock.ts`, so one time source exists and
   upstream's virtual-clock harness reaches fork paths.
2. Add a two-bad-settings case to `test/cli.test.ts` pinning the intended precedence (base
   settings refuse before optional profiles), so the ordering change is a decision with a test
   rather than an incidental consequence of the refactor.
3. Consider normalizing the diagnostic shape: upstream's `startupSettings` refusals print a bare
   line, while the fork's optional-profile and path-upload failures throw and surface through
   `main().catch` as `[slack-mcpl] Fatal error: Error: …`. Pre-existing in fork main, not caused
   by this merge, but the two styles now sit three lines apart in `main()`.
