# TASK-2XGBG

## Step 0 — before coding

Fetched upstream main: `ca8f6b1193154384e4626921255f86923fc5edf3`.
Public PR #12 remains open, head `21a7ebcb38ab901c2e721b325c63fe8407ae7a7a`,
merge base `4c50eefa85c853c5ab0827c985b613b2e7c4305b`.
Read its complete description, diff, two reviews, eight inline comments,
and eight discussion comments. Raw evidence: pr.json, reviews.json,
review-comments.json, comments.json, pr.diff, merge-tree.txt.
The October 21 Anarchid review says CHANGES_REQUESTED in its body;
GitHub records the event as COMMENTED, not a formal changes-requested event.
No rate limit encountered. Public reads only.

### Review inventory and plan

| Point (closely quoted) | Raised by | Plan |
|---|---|---|
| R1-1: channels.typing in messaging uses makes optional status required for all messaging | Anarchid; github-actions bot high finding; nissa-seru #1 | Separate slack.typing declaration and grant/selection gate; retain old harness grant. |
| R1-2: status follows newest forwarded message, not one being answered | Anarchid; bot high/medium findings | Record only accepted addressed threaded messages in taken(); forget on shown-turn stop, confirmed post, peer change. Test ambient, refused, answered and idle contexts. |
| R1-3: top-level status is on a thread the reply does not go to | Anarchid; bot; nissa-seru #3 | Choose review's no-status-for-top-level option; preserve existing publish routing and test publish. Avoid expanding into #6 routing work. |
| R1-4: lasting refusal retried every refresh | Anarchid; nissa-seru #2 | Use refusedForGood; suppress per conversation until peer changes; transient failures remain retryable. Test real Slack client against fake API. |
| R1-5: statuses outlive owner; overlapping calls lose ownership | Anarchid; bot inline race and shutdown finding | Serialize per conversation, identity-safe ownership, cleanup on peer change and stop within existing shutdown budget; no new starts while stopping. Deferred-call tests. |
| R1-6: tests cannot see R1-1 through R1-5 | Anarchid; bot grant, failure, DM, alias coverage comments | Regression tests in upstream test homes, old grant with push and publish and no status; alias, missing client, DM and failure coverage. |
| R1-7: conflicts with main | Anarchid | Rebuild on fetched main; retain reads/dms plus statuses in fakeWeb. |
| R1-8: stale prose | Anarchid; bot low findings | Correct ack comment, server-clears wording, exact measured test counts, method successor note. |
| Weaker duplicated DM heuristic than assertNotDm | bot low finding; Anarchid verified currently unreachable | Reuse assertNotDm for defense in depth; test unknown group DM. |
| Changelog claims message being answered, unlike actual behavior | bot low finding | Describe accepted addressed pending threaded-message rule explicitly. |
| PR says six tests/110 vs actual eight/488 | bot; Anarchid R1-8 | Supply updated PR-body draft with measured counts; no public edit. |

Author discussion comments record prior live observations, rebases/merges,
post-then-stop ownership and peer-context fixes. These are evidence, not
new review demands; preserve explicit clear-after-post and peer isolation.
Do not claim to reproduce their live Slack observations.

### Conflict analysis, file by file

`git merge-tree --write-tree upstream/main <PR head>`:
- README.md: merges textually; replace stale newest-message/status-clear prose.
- changelog.d/feat-slack-thread-status.added.md: new, no textual conflict;
  rewrite for optional typing and accepted addressed threaded messages.
- src/feature-sets.ts: clean textual merge, semantic fail-closed regression.
- src/server.ts: clean textual merge; upstream framing/delivery changes must
  be retained; move typing context into current taken() path.
- src/slack-adapter.ts: clean textual merge; preserve current write validation,
  DM checks, acknowledgement behavior and shutdown budget.
- test/harness.ts: sole textual conflict: fakeWeb parameters and construction
  combine upstream reads/dms with PR statuses. Preserve old FULL_GRANT.
- test/threadStatus.test.ts: new, no textual conflict; adapt to upstream's
  one-process suite and mock discipline, replacing obsolete expectations.

No merged thread-status implementation found in current main: its handler
still ignores typing and its manifest does not advertise it. No overlap stop
condition identified. Expected production scope: three source files and
README/fragment, comfortably below approximately 300 net production lines.

### Feature-set derivation and optionality

buildFeatureSets in src/feature-sets.ts supplies uses declarations, not grants.
CapabilityGrant uses the host effectiveCapabilities as the sole authority;
missing/initial grants deny. isFeatureSetActive requires readiness, selection,
and zero missing uses. deriveFeatureSets reports any missing use as disabling
the entire set. There is no optional-use handling in this wrapper: putting
channels.typing in messaging disables tools, delivery and publish without it.
Choose slack.typing with uses: ['channels.typing'], as R1-1 explicitly proposes;
keep messaging unchanged, and gate typing on its grant and selected set.
History/subscriptions already demonstrate separate feature sets.

Other coupled capabilities: channels.incoming and pushEvents are alternate
open/unopened delivery paths, but both are mandatory for messaging; tools,
register, lifecycle and publish are also bundled. Withholding any disables
all messaging, including independently usable paths. Streaming and acknowledge
are deliberately absent, not optional uses. Report these existing couplings;
change only typing as requested, not the established messaging contract.

Instructions read: orgasmic skill, supplied project.org (no extra constraints),
CONTRIBUTING.md, changelog.d/README.md, command-ownership worker page.
No applicable AGENTS.md found; supplied conventions/gotchas: none.

## Changed

Final local commit: `be7c3af18f95ae14e01dc917a145381ea5fa5896`.
Parent: `ca8f6b1193154384e4626921255f86923fc5edf3` (one commit).
Title: Show optional typing status on pending addressed threads.
Default configured author retained; requested GPT-6-Astra trailer present;
body wrapped below 72 columns. Worktree clean. No push, PR edit, GitHub
comment, release commit or tag was made.

Three production source files, +100 net lines. Including README and the
fragment, five production/documentation files, +122 net lines. Six test
files changed, including harness and the new 23-test thread-status home.
Additional test-file edits only extend minimal adapter doubles for cleanup
and update the old-grant handshake's optional-feature degradation receipt.
No dependency/lockfile changes. Builds generated ignored dist/; installs
created ignored node_modules/. No generated files committed.

The installed mcpl-core 0.4.0 FeatureSetDeclaration confirms that uses has
no optional-use field. The existing fail-closed derivation is unchanged.
The old FULL_GRANT intentionally remains without channels.typing: its
receipt now reports only slack.typing disabled, while messaging operates.

### Diff stat

```text
 README.md                                     |  15 +-
 changelog.d/feat-slack-thread-status.added.md |   9 +
 src/feature-sets.ts                           |  11 +-
 src/server.ts                                 |  31 ++-
 src/slack-adapter.ts                          |  88 ++++++++-
 test/forwardingLifecycle.test.ts              |   2 +
 test/handshake.test.ts                        |   8 +-
 test/harness.ts                               |  17 +-
 test/registrationRecovery.test.ts             |   2 +
 test/serverVersion.test.ts                    |   2 +-
 test/threadStatus.test.ts                     | 275 ++++++++++++++++++++++++++
 11 files changed, 435 insertions(+), 25 deletions(-)
```

### Fragment verbatim

`changelog.d/feat-slack-thread-status.added.md`:

```markdown
- Optional `slack.typing` maps `channels/typing` (and `notifications/typing`)
  to "is thinking…" on the latest accepted, addressed thread still waiting
  for an answer. Hosts without `channels.typing` keep messaging. Ambient,
  refused and top-level messages get no new status. Only writable
  conversations are eligible, respecting `SLACK_DISABLE_DMS`. The server
  clears status on stop, a confirmed post, peer disconnect or shutdown,
  best-effort; Slack expires it after 2 minutes. Calls are ordered per
  conversation, successful refreshes are limited to once a minute, and
  lasting API refusals suppress further attempts until the peer changes.
```

## Verification Gates

All suites used `orgasmic dispatch gate <name> -- timeout 900 ...`.
Final gates ran on the clean final commit, not reused dirty receipts.
Scripts and raw logs are beside this report. Each named log includes the
CLI's immutable `gate-<name>-<id>.log` receipt path. `final-gates.sh` records
the exact matrix commands; `final-gates.log` records its PID/PGID and results.

Environment: Node 22.23.3 at /opt/node/bin; scratch Node 24.22.1 and 22.12.0
archives checked against their official nodejs.org SHASUMS256.txt files.
Checksums and repeated verification are retained in evidence. Every shell
command started with notifier variables set or sourced test-env.sh; both
npm configs are zero-byte files outside the repository. Audit and fund off.
All installs: `npm ci --ignore-scripts --registry=https://registry.npmjs.org`.
Every suite inherited `NODE_OPTIONS=--require=/tmp/task-2xgbg/loopback.cjs`.
The runtime gate verifies wildcard binding is refused and default TCP
binding is restricted to 127.0.0.1. No nested mocks of a property were used.

| Gate | Command after timeout 900 | Result | Log |
|---|---|---|---|
| baseline-install | npm ci --ignore-scripts --registry=https://registry.npmjs.org | pass, upstream ca8f6b1 | baseline-install.log |
| baseline-node22 | npm test | 584 pass / 0 fail, Node 22.23.3 | baseline-node22.log |
| baseline-node24 | npm test | 584 pass / 0 fail, Node 24.22.1 | baseline-node24.log |
| final-22.23.3-install | npm ci --ignore-scripts --registry=https://registry.npmjs.org | pass | final-22.23.3-install.log |
| final-22.23.3-typecheck | npm run typecheck | pass | final-22.23.3-typecheck.log |
| final-22.23.3-build | npm run build | pass | final-22.23.3-build.log |
| final-22.23.3-suite | npm test | 607 pass / 0 fail (+23 vs baseline) | final-22.23.3-suite.log |
| final-24.22.1-install | npm ci --ignore-scripts --registry=https://registry.npmjs.org | pass | final-24.22.1-install.log |
| final-24.22.1-typecheck | npm run typecheck | pass | final-24.22.1-typecheck.log |
| final-24.22.1-build | npm run build | pass | final-24.22.1-build.log |
| final-24.22.1-suite | npm test | 607 pass / 0 fail (+23 vs baseline) | final-24.22.1-suite.log |
| final-floor-touched | node --import tsx --test --experimental-test-isolation=none test/threadStatus.test.ts test/forwardingLifecycle.test.ts test/handshake.test.ts test/registrationRecovery.test.ts test/serverVersion.test.ts | 117 pass / 0 fail, Node 22.12.0; harness imported by these tests | final-floor-touched.log |
| final-release-fold | bash /tmp/task-2xgbg/release-check.sh | pass; release folded in scratch, fragment consumed | final-release-fold.log |
| final-changelog-regex | bash /tmp/task-2xgbg/changelog-check.sh | pass; exact CI added-fragment regex, parent SHA, diff-check and merge-tree | final-changelog-regex.log |
| final-runtime-verification | bash script (see log and test-env.sh) | versions/checksums/empty configs/loopback guard pass | final-runtime-verification.log |
| final-prose-green | python3 prose-check.py HEAD | 4/4 checks pass | final-prose-green.log |

`npm test` is upstream's full one-process invocation:
`node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.
Zero skipped/cancelled tests in both final full suites and the floor run.

### Red/green and mutation evidence

- `red-final-tests-pr-approach.log`: final 23 regression tests against the
  mechanically merged PR production approach: 4 pass / 19 fail. Source
  snapshots are in pr-approach/. This is deliberately PR semantics ported
  onto current main (not a claim of running the old dependency tree).
  `green-final-tests.log`: identical tests with the repaired implementation,
  23 pass / 0 fail. Final full/floor gates repeat the green checks.
- Old-grant test fails at messaging degradation on the PR approach; green
  verifies mention delivery, successful publish and zero Slack status calls.
- R1-2 red cases: ambient movement, refused delivery, stopped/answered thread
  recurrence, and tool-post cleanup. R1-3 red: top-level publish mismatch.
- R1-4 red: real WebClient against test/slackApi.ts returns permanent errors,
  causing repeated calls/logs; green suppresses these and retains transient
  retries. This exercises the production Slack client error classification.
- R1-5 red: peer-close cleanup before another peer types, shutdown, queued
  starts during shutdown, and deferred success/failure ordering. Green
  verifies set/move/clear order and final ownership.
- R1-6 existing-correct paths (alias, missing assistant client, allow-list,
  transient failure) also have explicit passing coverage; DM defense is red
  on the PR's weaker heuristic. No claim that every coverage addition fixes
  previously incorrect behavior.
- R1-7 red evidence is merge-tree.txt's harness conflict; green is linear
  parentage and final-changelog-regex.log's clean merge-tree.
- R1-8 `review-prose-red.log`: 4 prose checks fail against exact PR head;
  final-prose-green.log: all pass. Counts are measured and supplied in the
  draft below; the public PR body was deliberately not edited.
- Independent mutation: change the refresh comparison from `<` to `<=`
  STATUS_REFRESH_MS. `mutation-refresh-boundary.log` fails 0/1 at exactly
  sixty seconds; restoring it passes 1/1 in restored-refresh-boundary.log.
  Mutation removed before commit. The deterministic test uses upstream's
  virtualClock helper, without nesting mocks.

An earlier full precommit run failed 87 tests (520/607 passed): minimal
adapter doubles lacked the newly required cleanup methods and the old-grant
handshake expected no degraded sets. These were implementation integration
failures, not baseline failures or flakes. Minimal doubles and the receipt
assertion were corrected; precommit-suite-repaired.log and both clean final
suite gates pass 607/607. All failure logs are retained, including the
intentional red/mutation runs. No environment-blocked or skipped gate.

## Review disposition

All changes below are in `be7c3af18f95ae14e01dc917a145381ea5fa5896`.

| Review point | Addressed by / evidence |
|---|---|
| R1-1; bot required-use high; nissa-seru #1 | Separate slack.typing; selected-set and grant check; original harness grant test and handshake receipt. |
| R1-2; bot ambient high and pre-acceptance medium | Only isAddressed in taken(); stop/post/peer retirement; ambient, refused, answered, tool-post and failed-post tests. |
| R1-3; bot placement medium; nissa-seru #3 | No new top-level status; publish routing unchanged; test runs through publish and checks top-level post. Threaded publish also checks thread_ts. |
| R1-4; nissa-seru #2 | refusedForGood suppression per conversation until peer reset; real WebClient permanent/transient tests, log counts, reset test. |
| R1-5; bot race and shutdown | Per-conversation promise chain, identity-safe ownership, queued-start epoch, peer cleanup and parallel ack/status shutdown within index.ts's existing five-second deadline; deferred race and lifecycle tests. |
| R1-6; bot old-grant, DM/failure/missing-client and alias/ambient coverage | 23 tests; FULL_GRANT unchanged; safety and failure cases above. |
| R1-7 | One commit directly on fetched ca8f6b1; preserve upstream reads/dms/displayNames/history/scopes in harness. |
| R1-8; bot stale ack and count prose | README, ack comment, fragment and accurate draft counts; prose red/green. Successor named without implementing migration. |
| Bot weak DM heuristic | Reuse assertNotDm; test uncached C-prefixed group DM as well as D-prefixed ID. |
| Bot inaccurate changelog claim | Explicit latest accepted addressed pending-thread semantics; no claim of knowing the host's actual inference target. |

### Draft reply to reviewers (not posted)

Addressed in `be7c3af` on `ca8f6b1`:

- R1-1: typing now has its own `slack.typing` set. The unchanged old grant
  still delivers mentions and publishes, without any status call.
- R1-2: context is recorded only after an addressed delivery is accepted,
  and retired on stop, confirmed post or peer disconnect. Ambient and
  refused messages cannot move it.
- R1-3: chose no status for top-level messages; publish routing is unchanged.
- R1-4: lasting refusals are suppressed until peer change; transient failures
  remain retryable. Tested through the real Slack client and local fake API.
- R1-5: calls are serialized per conversation; shutdown/peer cleanup clears
  owned statuses and rejects queued starts. Slow success/failure tests pass.
- R1-6: added the regression and safety cases, including DM checks and alias.
- R1-7: rebuilt on current main, retaining the harness's reads and DM support.
- R1-8: corrected prose, documented the successor, and refreshed evidence:
  607/607 on Node 22.23.3 and 24.22.1, versus 584/584 on the same main SHA.

Thanks also for the weaker-DM-check finding: status now uses assertNotDm.
No live Slack rendering or host end-to-end claim is made.

### PR body draft (not applied)

## Problem

Slack typing notifications currently do nothing. The previous version of
this PR made typing required for all messaging, guessed from ambient or
refused messages, and left status ownership vulnerable to lifecycle races.

## Changes

- Add optional `slack.typing` using `channels.typing`. Hosts withholding it
  retain messaging; the shared test grant is unchanged.
- Show status only for the latest accepted addressed thread still awaiting
  an answer. Ambient/refused messages do not retarget it. Top-level messages
  have no status, preserving existing publish routing.
- Clear on stop, confirmed post, peer disconnect or shutdown, best-effort.
  Serialize Slack calls, refresh successful status once per minute, and
  suppress lasting refusals until peer change. Respect write and DM policy.
- Update README and `changelog.d/feat-slack-thread-status.added.md`.

Rebuilt on `ca8f6b1193154384e4626921255f86923fc5edf3`.

## Tests

- Full one-process `npm test`: 607 pass / 0 fail on Node 22.23.3 and 24.22.1.
  Same-main baseline: 584 pass / 0 fail on each.
- Install, typecheck and build pass on both versions. Node 22.12.0 touched
  tests: 117 pass / 0 fail.
- 23 thread-status tests; repaired suite passes all, whereas the ported
  prior PR approach fails 19. Independent refresh-boundary mutation fails.
- Release dry fold and changelog CI check pass. Real Slack WebClient tested
  against a loopback fake API; no live token needed.

## Not verified

Live Slack rendering, private channels/DMs in a live workspace, and live
host end-to-end behavior were not exercised. Cleanup is best-effort; Slack's
expiry remains the fallback when calls fail or the process is killed.

## Out of scope

Changing publish routing after ambient messages (#6), migrating to
`agents.sessions.setStatus`, and splitting other existing messaging uses.
No companion PR is required.

- [x] Changelog fragment included.

AI-assisted implementation with Codex; model co-author recorded in commit.

## Unmet Criteria

None for local implementation and requested verification. Publishing this
commit or editing/replying to the PR is explicitly outside this assignment
and was not performed.

## Residual Risk

- A channel-only typing signal cannot identify the host's actual reasoning
  target. Latest accepted addressed pending thread is a conservative proxy,
  as requested by the review; multiple pending addressed threads remain
  ambiguous. Existing publish routing after ambient delivery is unchanged.
- Slack API cleanup is best-effort. Failed clears, a request that reaches
  Slack after its client timeout, forced termination or the five-second
  shutdown cap can leave status until Slack's expiry. Peer retirement waits
  for in-flight status work; a slow Slack response can delay reconnect.
- Top-level mentions intentionally have no typing status. This is the
  review's conservative option, not a routing redesign.
- The current Slack method is documented as superseded; migration is not
  included. The README links the current method documentation. Slack's
  documented scope and expiry were checked against its
  [method reference](https://docs.slack.dev/reference/methods/assistant.threads.setStatus/)
  and [scope update](https://docs.slack.dev/changelog/2026/03/05/set-status-scope-update/).
- Existing mandatory messaging capability coupling remains unchanged, as
  described in Step 0. No live workspace or production host was exercised.
