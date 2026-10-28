# TASK-2XGBG — round 3, final polish

## Changed

Final local SHA: **`85c41a5ca5f1f18e57e75e9a8fbd07b9d4e70f51`**.
One amended commit directly on upstream
`ca8f6b1193154384e4626921255f86923fc5edf3`.

Preflight: requested `17275b846dfb4ce7abec93d9c17514de026d03e0`, clean.
Read-only upstream fetch found no movement; no rebase needed. Default author
and `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` retained; commit body
wrapped below 72 columns. Final worktree clean. No push, PR edit, GitHub
comment, tag or release commit. The drafts below target existing upstream
PR #12; they were not posted.

This round changes three files: adapter, thread-status tests and fragment.
Relative to 17275b84: **59 insertions / 25 deletions**, including **+3 net
production source lines**. The complete feature versus upstream changes
three source files, **+109 net production lines**; including README and
fragment, five non-test files and **+140 net lines**. No dependency or
lockfile changes. Installs/builds only affected ignored node_modules/dist;
the floor baseline export also lives under ignored dist, not evidence.

### Full diff stat versus upstream

```text
 README.md                                     |  19 +-
 changelog.d/feat-slack-thread-status.added.md |  14 +
 src/feature-sets.ts                           |  11 +-
 src/server.ts                                 |  33 +-
 src/slack-adapter.ts                          |  95 +++++-
 test/forwardingLifecycle.test.ts              |   2 +
 test/handshake.test.ts                        |   8 +-
 test/harness.ts                               |  17 +-
 test/registrationRecovery.test.ts             |   2 +
 test/serverVersion.test.ts                    |   2 +-
 test/threadStatus.test.ts                     | 451 ++++++++++++++++++++++++++
 11 files changed, 629 insertions(+), 25 deletions(-)
```

### Fix → test

| Finding | Fix / evidence |
|---|---|
| LOW 1: teardown clear refusal re-suppresses the next peer | Record suppression only for a nonempty-status **set** in the current epoch. New `R3-P2` proves a successful set followed by a refused teardown clear does not prevent the next peer's set. The existing late-old-peer test now refuses both its old set and clear, matching P7's realistic shape. Both cases fail on 17275b84 and pass after repair. |
| LOW 1: pointless clear for a definitively refused old set | **Yes, removed.** callStatus returns an explicit ok/refused/uncertain outcome, independent of per-peer suppression. A definitive refusal releases statusOn ownership even after its epoch retires. The widened P7-shaped test asserts the exact call list: old set, new set, with **no old teardown clear**. Uncertain failures retain ownership and remain retryable. |
| LOW 2: safe non-Error message read was unpinned | New `R3-P1` rejects with null, then retries the **same thread without advancing the clock**. Green: two set attempts. Restoring `(err as Error).message` only in callStatus makes it fail with one attempt: the terminal catch still prevents a crash, but retryability is lost. This pins the safe read separately from the terminal catch. |
| LOW 3: draft undercounts regressions / conflates test with mutation | Re-ran all **five** round-2 regression cases against exact be7c3af server/adapter: 0/5 pass; repaired sources: 5/5 pass. Draft now says five, distinguishes the two new polish tests, and describes the epoch-guard mutation separately. Total thread-status tests: **30**, full suite **614**, upstream **584**. |
| Optional fragment wrap | Rewrapped continuation lines evenly, preserving the fragment's content. Release fold and CI regex pass. |

### Fragment verbatim

`changelog.d/feat-slack-thread-status.added.md`:

```markdown
- Optional `slack.typing` maps `channels/typing` (and
  `notifications/typing`) to "is thinking…" on the latest accepted,
  addressed thread still waiting for an answer. Hosts without
  `channels.typing` keep messaging, with `mode: 'degraded'` naming
  `slack.typing`; hosts pinning `enabledFeatureSets` must add that set to
  enable status. Ambient, refused and top-level messages get no new
  status. Only writable conversations are eligible, respecting
  `SLACK_DISABLE_DMS`. The server clears status on the `op: 'stop'`
  extension, a confirmed post, peer disconnect or shutdown, best-effort;
  Slack expires it after 2 minutes. The declared `ChannelsTypingParams`
  has only `{channelId}`, so hosts without the extension clear via post,
  disconnect, shutdown or expiry. Calls are ordered per conversation,
  successful refreshes are limited to once a minute, and lasting API
  refusals suppress further attempts until the peer changes.
```

## Verification Gates

All final gates were freshly run at clean
`85c41a5ca5f1f18e57e75e9a8fbd07b9d4e70f51` through
`orgasmic dispatch gate <name> -- timeout 900 <command>`.
No earlier implementation pass was reused. Exact matrix script:
`final-gates.sh`; process owner PID/PGID and summaries: `final-gates.log`.
Each named log records its immutable gate receipt path. All final gates
passed; zero skipped/cancelled tests.

| Gate(s) | Command after timeout 900 | Result | Logs relative to this report |
|---|---|---|---|
| final-22.23.3-install; final-24.22.1-install | npm ci --ignore-scripts --registry=https://registry.npmjs.org | both pass | final-22.23.3-install.log; final-24.22.1-install.log |
| final-22.23.3-typecheck; final-24.22.1-typecheck | npm run typecheck | both pass | final-22.23.3-typecheck.log; final-24.22.1-typecheck.log |
| final-22.23.3-build; final-24.22.1-build | npm run build | both pass | final-22.23.3-build.log; final-24.22.1-build.log |
| final-22.23.3-suite | npm test | **614 pass / 0 fail**, baseline 584 | final-22.23.3-suite.log |
| final-24.22.1-suite | npm test | **614 pass / 0 fail**, baseline 584 | final-24.22.1-suite.log |
| final-22.12.0-suite | npm test | **614 pass / 0 fail**, fresh floor baseline 584 | final-22.12.0-suite.log |
| final-thread-repeat-1 through final-thread-repeat-5 | node --import tsx --test --experimental-test-isolation=none test/threadStatus.test.ts | **30/30, five consecutive runs**, Node 22.23.3 | final-thread-repeat-1.log through final-thread-repeat-5.log |
| final-release-fold | bash /tmp/task-2xgbg/release-check.sh | pass; actual fold in scratch consumes fragment | final-release-fold.log; release-check.sh |
| final-changelog-regex | bash /tmp/task-2xgbg/changelog-check.sh | pass; exact CI added-fragment regex, diff-check, parent SHA, clean merge-tree | final-changelog-regex.log; changelog-check.sh |
| final-runtime | bash /tmp/task-2xgbg/r3-runtime.sh | pass; versions, official checksums, extracted binaries, configs and guard | final-runtime.log; runtime-check.sh |
| r3-baseline-floor | bash /tmp/task-2xgbg/r3-baseline-floor.sh | upstream Node 22.12.0: **584 pass / 0 fail** | r3-baseline-floor.log; baseline-floor.sh |

Full suites are upstream's one-process invocation:
`node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.

Every shell command began with notifier variables or sourced test-env.sh:
NO_UPDATE_NOTIFIER=1 and npm_config_update_notifier=false. Npm installs used
two empty configs outside the repository, audit=false and fund=false.
Node 22.23.3 was on PATH by default. Scratch Node 24.22.1 and 22.12.0 were
rechecked against freshly fetched official SHASUMS256.txt files; extracted
node binaries also match the verified archives. Checksums, environment and
loopback guard are retained here. The guard was inherited by all suites via
NODE_OPTIONS; final-runtime verifies that wildcard binding is refused and
unspecified binding is forced to 127.0.0.1. No nested same-property mocks.

### Red/green and independent mutation

- `r3-red-clear-refusal.log`: widened P7-shaped case plus new P2-shaped case
  against unchanged 17275b84 production: **0 pass / 2 fail**.
- `r3-green-thread.log`: repaired complete file: **30 pass / 0 fail**;
  all final full-suite/repetition gates repeat the green result at the SHA.
- `r3-red-unsafe-message.log`: restore the unsafe message read in callStatus;
  P1 **0/1**, with one set call instead of two.
  `r3-green-safe-message.log`: restore safe read, **1/1**.
- `r3-recount-round2-red.log`: final five round-2 cases, including widened
  late refusal, against exact be7c3af server/adapter: **0/5**.
  `r3-recount-round2-green.log`: repaired production, **5/5**.
- Separate mutation: remove the epoch guard while keeping the new set-only
  guard. `r3-mutation-epoch.log`: late-refusal regression **0/1**;
  `r3-restored-epoch.log`: guard restored, **1/1**. The committed regression
  test and this temporary mutation are distinct. All mutations removed
  before amending and running final gates.

No unexpected test failures this round. Red runs and mutation failures are
intentional; no flaky, baseline-regression or environment-blocked gate.

### Inherited evidence and unchanged inputs

Reviewer probes were read from
`/home/orgasmic/.orgasmic/runs/run-01M629QCRQ7451EJ4N78XQQ93D/evidence/probes/zz-r2.test.ts`,
for reviewer dispatch
`tx-20261028-theaspirationalslack-247bc265-258d-427f-b079-fdce6cac1c24`.
The full P1–P8 file is copied under reviewer-probes/. Its findings were
claims to reproduce, not reused gate passes. P1/P2/P7 are adapted as above.

Inherited comparison evidence only: the original clean-upstream full-suite
baselines on Node 22.23.3 and 24.22.1, **584/584** each, copied to
inherited/baseline-node22.log and inherited/baseline-node24.log. They retain
the original immutable receipt paths. Upstream SHA, source, lockfile,
runtime versions and suite command are unchanged; the fresh fetch confirms
that SHA. Prior implementation gates are not reused.

For the newly required full floor comparison, this round exported
`git archive ca8f6b1193154384e4626921255f86923fc5edf3` into ignored
`dist/r3-upstream-floor`, linked the lock-identical installed dependencies,
and ran the complete suite on Node 22.12.0: 584/584. Its receipt marks the
assigned worktree dirty because uncommitted repair work existed elsewhere;
the tested source is the separately exported immutable upstream tree, not
that dirty implementation. This is baseline evidence only. All final
implementation receipts are at the clean final commit.

## Final draft reviewer reply for a comment on PR #12

Also saved as `reviewer-reply.md`. Not posted.

Addressed in `85c41a5`, rebuilt as one commit on `ca8f6b1`:

- R1-1: typing has its own `slack.typing` set. The original grant still
  delivers and publishes; only typing is reported degraded.
- R1-2: status follows an accepted addressed thread still awaiting an answer,
  not ambient/refused messages, and is retired on stop, post or peer change.
- R1-3: no status for top-level messages; publish routing is unchanged.
- R1-4: lasting **set** refusals suppress further sets until peer change.
  Clear failures cannot suppress the next peer. A definitively refused set
  releases ownership, so teardown does not issue a pointless clear.
- R1-5: per-conversation serialization preserves order. Disconnect detaches
  the peer immediately and queues cleanup without blocking reconnects;
  shutdown retains its five-second cap. Non-Error failures cannot crash or
  poison the queue and remain immediately retryable when uncertain.
- R1-6: 30 thread-status tests cover grants, delivery, aliases, write/DM
  policy, refusals, races and lifecycle; fixed negative waits were replaced
  with protocol/queue barriers.
- R1-7: current upstream structure is retained, including the harness reads.
- R1-8: README/fragment and counts are corrected, including the stop-extension
  caveat, degraded receipt, feature-set pinning and successor-method link.

Five new regression cases from the teardown/error follow-up fail on
`be7c3af1`, reproduced again. This polish adds two tests and widens the
late-refusal case: P2/P7 fail on `17275b84`; P1 fails with the old unsafe
`.message` read. Separately, removing the epoch guard fails the widened
late-refusal test; that is the mutation, not an additional regression test.

Full suite: **614/614 on Node 22.23.3, 24.22.1 and 22.12.0**, versus upstream
**584/584**. Thread-status tests passed **30/30 in five consecutive runs**.
Install/typecheck/build on 22.23.3 and 24.22.1, release dry fold and changelog
CI check pass. No live Slack rendering or host end-to-end claim is made.

## Final replacement body for existing upstream PR #12

Also saved as `pr-body.md`. This replaces #12's body, not a new PR draft.
Not applied.

## Problem

`channels/typing` currently does nothing in this server. This PR maps it to
Slack thread status without making an optional presence signal a prerequisite
for messaging, or showing it on ambient/refused messages the agent did not
accept as addressed work.

## Changes

- Add optional `slack.typing`, using `channels.typing`, separate from
  `slack.messaging`. Hosts withholding `channels.typing` retain messaging but
  now receive `mode: 'degraded'` naming `slack.typing`, with
  `missingCapabilities: ['channels.typing']` and `effect: 'disabled'`.
  Hosts pinning `enabledFeatureSets` must add `slack.typing` to enable it
  (the wire selection field is `enabled`).
- Show "is thinking…" on the latest accepted, addressed thread still awaiting
  an answer, only where the bot may write and respecting `SLACK_DISABLE_DMS`.
  Ambient/refused messages do not retarget it. Top-level messages get no
  status, preserving existing publish routing.
- Clear after a confirmed post, peer disconnect or shutdown, and on the
  `op: 'stop'` extension. `ChannelsTypingParams` declares only `{channelId}`:
  hosts sending only that shape clear via post, disconnect, shutdown or
  Slack's two-minute expiry, rather than a stop notification.
- Serialize status calls per conversation and refresh successful status at
  most once per minute. Lasting set refusals suppress further sets until the
  peer changes; failed clears cannot suppress the next peer, and definitively
  refused sets need no teardown clear. Uncertain failures remain retryable.
- Detach disconnected peers immediately and queue cleanup without delaying
  reconnects. Shutdown cleanup retains the existing five-second cap.
  Non-Error failures cannot crash the process or poison the status queue.
- Update README and include
  `changelog.d/feat-slack-thread-status.added.md`.

Rebuilt as one commit, `85c41a5ca5f1f18e57e75e9a8fbd07b9d4e70f51`, on
`ca8f6b1193154384e4626921255f86923fc5edf3`.

## Tests

- Full one-process `npm test`: **614 pass / 0 fail** on Node **22.23.3,
  24.22.1 and 22.12.0**. Same-upstream baseline: **584 pass / 0 fail**.
- Install, typecheck and build pass on Node 22.23.3 and 24.22.1.
- All **30 thread-status tests** pass in **five consecutive runs**.
- Regression coverage includes the original grant without typing, accepted
  versus refused/ambient delivery, top-level publish, DM/write restrictions,
  the typing alias, real Slack-client refusal classification against a local
  fake API, held-call disconnect/reconnect, and non-Error process/queue safety.
- Five teardown/error regression cases fail on `be7c3af1`; the clear-refusal
  cases fail on `17275b84`. Restoring the unsafe `.message` read or removing
  the epoch guard makes the corresponding regression test fail.
- Release dry fold and the changelog CI regex pass.

## Not verified

No live Slack rendering, private-channel/DM workspace run, or live host
end-to-end run. Cleanup is best-effort; failed calls, client timeouts, forced
termination or the shutdown cap can leave status until Slack's expiry.

## Out of scope

Changing publish routing after ambient messages (#6), migrating to
`agents.sessions.setStatus`, and splitting other existing mandatory messaging
capabilities. Channel-only typing remains a conservative pending-thread proxy,
not an authoritative identifier of the host's inference target. No companion
PR is required.

- [x] Changelog fragment included.

AI-assisted implementation with Codex; model co-author recorded in the commit.

## Unmet Criteria

None for local implementation and requested verification. Public posting
of the prepared replacement body/comment remains outside the local-only
contract and was not performed.

## Residual Risk

- Cleanup remains best-effort. A failed clear, request timeout, forced
  termination or the existing shutdown cap can leave status until expiry.
  A new peer can reconnect immediately, but its set in the same conversation
  still waits behind the old in-flight request/clear.
- Channel-only typing cannot identify the actual inference target. Multiple
  pending addressed threads remain ambiguous; existing publish routing after
  ambient delivery is unchanged and top-level messages intentionally receive
  no status.
- `op: 'stop'` is an extension. Base-shape hosts rely on post, disconnect,
  shutdown or expiry. Live Slack rendering and live host end-to-end behavior
  were not exercised; successor-method migration remains out of scope.
