# TASK-2XGBG — round 2

## Changed

Final local commit: **`17275b846dfb4ce7abec93d9c17514de026d03e0`**.
It replaces `be7c3af18f95ae14e01dc917a145381ea5fa5896` and remains **one
commit** directly on `ca8f6b1193154384e4626921255f86923fc5edf3`.

Preflight found the requested be7c3af1 HEAD clean. A read-only fetch confirmed
upstream main had not moved; no rebase was needed. Amended the local commit,
retaining the default author and the requested
`Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer. Commit body is
wrapped below 72 columns. Worktree is clean. Nothing was pushed, commented,
published, merged, or edited on GitHub.

Round 2 changes five files: README, fragment, server, adapter and
threadStatus tests. Relative to be7c3af: 195 insertions / 35 deletions;
production source delta **+6 net lines in two files**. The complete rebuilt
feature versus upstream changes three source files, **+106 net production
lines**. Including README and fragment: five non-test files, **+136 net
lines**, below the original scope ceiling. No lockfile or dependency edits;
ignored node_modules/dist are install/build side effects only.

### Complete diff stat versus upstream

```text
 README.md                                     |  19 +-
 changelog.d/feat-slack-thread-status.added.md |  13 +
 src/feature-sets.ts                           |  11 +-
 src/server.ts                                 |  33 +-
 src/slack-adapter.ts                          |  92 +++++-
 test/forwardingLifecycle.test.ts              |   2 +
 test/handshake.test.ts                        |   8 +-
 test/harness.ts                               |  17 +-
 test/registrationRecovery.test.ts             |   2 +
 test/serverVersion.test.ts                    |   2 +-
 test/threadStatus.test.ts                     | 421 ++++++++++++++++++++++++++
 11 files changed, 595 insertions(+), 25 deletions(-)
```

### Finding → fix/test

| Finding | Fix and evidence |
|---|---|
| MEDIUM 1: teardown acknowledges a message without a receiving peer | `this.conn = null` is now the first statement of `serve()`'s finally. `R2-M1` holds the disconnect clear open, delivers a mention, and asserts no acknowledgement and no retained peer. The final test fails on be7c3af with `no false received reaction`. |
| MEDIUM 2: awaited cleanup occupies serveTcp's single-client slot | Chose **non-awaited cleanup**, not a time-bounded wait. The reset synchronously retires old starts and queues clears; per-conversation ordering puts those clears before a new peer's set. `R2-M2` uses real loopback TCP, holds the old clear, reconnects and initializes a second host, and proves its new set waits behind the old clear. Red: second handshake gets ConnectionClosedError. Green: accepted, then clear-before-set order. `SlackAdapter.stop()` still awaits reset alongside ack cleanup under index.ts's existing five-second process cap. |
| MEDIUM 3: non-Error rejection crashes/poisons/leaks queue | Status logging handles non-Error values without dereferencing `.message`. Every turn has a terminal, non-throwing catch before it is stored in the queue. Normal tail cleanup therefore runs on success and failure. Two subprocess regressions cover fire-and-forget `throw null` from Slack and `throw undefined` from an unexpected local failure; they assert normal exit, a later set and clear, and empty statusQueue/statusOn maps. Both crash on be7c3af. |
| LOW: migration URL | README now links directly to `https://docs.slack.dev/reference/methods/agents.sessions.setStatus/`. |
| LOW: duplicate post-clear and redundant identity guards | Removed the adapter sendMessage post-clear; server markOutbound remains the common post hook, including uploads. Removed both statusOn identity guards: serialization prevents another turn from replacing that entry across the await. Retained the **queue-tail** identity check, which is necessary when a newer turn is already queued. Existing publish/tool/failed-post lifecycle tests stay green. |
| LOW: stop extension and host policy compatibility | README and fragment say `ChannelsTypingParams` declares only `{channelId}`; `op: 'stop'` is an extension. Base-shape hosts clear via post, disconnect, shutdown or expiry. Both document the degraded slack.typing receipt and the need to add slack.typing when pinning enabledFeatureSets; updated PR draft below does too. Checked against installed mcpl-core 0.4.0 declarations and selection code. |
| LOW optional: fixed 25 ms negative waits | Removed all fixed 25 ms waits in threadStatus tests. Delivery joins the forwarding promise (taken/notTaken), notification checks use a tools/list response as a protocol barrier followed by joining queued status work, and controlled held-promise tests use an event-loop turn. Until deadlines remain only as failure bounds while awaiting observable progress. Five final repetitions pass. |

Non-blocking reset also required refusal-state ownership to remain per peer:
clear refusals synchronously at reset, and ignore an old in-flight call's
refusal if its epoch has retired. Otherwise an old call can suppress the
new peer or a late reset can erase newer refusal state. A separate test
holds an old set, retires its peer, then releases a permanent refusal and
checks that the new peer's set/clear still run.

### Fragment verbatim

`changelog.d/feat-slack-thread-status.added.md`:

```markdown
- Optional `slack.typing` maps `channels/typing` (and `notifications/typing`)
  to "is thinking…" on the latest accepted, addressed thread still waiting
  for an answer. Hosts without `channels.typing` keep messaging, with
  `mode: 'degraded'` naming `slack.typing`; hosts pinning `enabledFeatureSets`
  must add that set to enable status. Ambient, refused and top-level messages
  get no new status. Only writable
  conversations are eligible, respecting `SLACK_DISABLE_DMS`. The server
  clears status on the `op: 'stop'` extension, a confirmed post, peer disconnect
  or shutdown, best-effort; Slack expires it after 2 minutes. The declared
  `ChannelsTypingParams` has only `{channelId}`, so hosts without the extension
  clear via post, disconnect, shutdown or expiry. Calls are ordered per
  conversation, successful refreshes are limited to once a minute, and
  lasting API refusals suppress further attempts until the peer changes.
```

## Verification Gates

All final gates below were freshly run on clean
`17275b846dfb4ce7abec93d9c17514de026d03e0`; no round-1 implementation pass
was assumed or reused. Every gate uses
`orgasmic dispatch gate <name> -- timeout 900 <command>`.

Exact matrix commands are in `final-gates.sh`; owner PID/PGID and summaries
are in `final-gates.log`. Each listed log also names its immutable
`gate-<name>-<invocation>.log` receipt. No final gate failed; no tests were
skipped or cancelled.

| Gate(s) | Command after timeout 900 | Result | Log(s), relative to this report |
|---|---|---|---|
| final-22.23.3-install; final-24.22.1-install | npm ci --ignore-scripts --registry=https://registry.npmjs.org | both pass, 51 packages | final-22.23.3-install.log; final-24.22.1-install.log |
| final-22.23.3-typecheck; final-24.22.1-typecheck | npm run typecheck | both pass | final-22.23.3-typecheck.log; final-24.22.1-typecheck.log |
| final-22.23.3-build; final-24.22.1-build | npm run build | both pass | final-22.23.3-build.log; final-24.22.1-build.log |
| final-22.23.3-suite; final-24.22.1-suite | npm test | **612 pass / 0 fail on each**, +28 versus upstream 584 | final-22.23.3-suite.log; final-24.22.1-suite.log |
| final-floor-touched | node --import tsx --test --experimental-test-isolation=none test/threadStatus.test.ts test/forwardingLifecycle.test.ts test/handshake.test.ts test/registrationRecovery.test.ts test/serverVersion.test.ts | Node 22.12.0: **122 pass / 0 fail**; includes all feature-touched test files and imported harness | final-floor-touched.log |
| final-thread-repeat-1 through final-thread-repeat-5 | node --import tsx --test --experimental-test-isolation=none test/threadStatus.test.ts | Node 22.23.3: **28/28, five consecutive runs** | final-thread-repeat-1.log through final-thread-repeat-5.log |
| final-release-fold | bash /tmp/task-2xgbg/release-check.sh | pass; actual release script folds copied fragments in scratch and consumes the typing fragment | final-release-fold.log; release-check.sh |
| final-changelog-regex | bash /tmp/task-2xgbg/changelog-check.sh | pass; exact CI added-fragment regex, diff-check, parent SHA and clean merge-tree | final-changelog-regex.log; changelog-check.sh |
| final-runtime | bash /tmp/task-2xgbg/r2-runtime.sh | pass; fresh official checksums, extracted binaries match archives, Node versions, empty configs and guard verified | final-runtime.log; runtime-check.sh |

Full suites use upstream's one-process command:
`node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.

Every shell command began with notifier variables or sourced test-env.sh:
NO_UPDATE_NOTIFIER=1, npm_config_update_notifier=false. Installs used two
empty external npm user/global configs, audit=false and fund=false. Node
22.23.3 was on PATH by default; scratch Node 24.22.1 and 22.12.0 were verified
again against freshly fetched official nodejs.org SHASUMS256.txt files.
Those checksum files are retained here. All test listeners inherited the
loopback-only NODE_OPTIONS require guard; the runtime gate verifies that a
wildcard listener is refused and an unspecified host binds to 127.0.0.1.
The guard and environment setup are copied here. No same-property nested
TestContext mocks were introduced.

### Red/green and mutation

- `r2-red-final-tests.log`: final four R2 tests against the **exact be7c3af
  server and adapter**, with the rest of that feature unchanged: **0 pass /
  4 fail**. Failures are the false ack, rejected TCP reconnect, null-message
  dereference/process exit, and unexpected undefined rejection/process exit.
- `r2-green-final-tests.log`: repaired implementation, **28 pass / 0 fail**.
  Final full/floor/repetition gates reproduce the green result at the commit.
- Independent mutation: remove the epoch guard from refusal recording.
  `r2-mutation-old-refusal.log` fails **0/1** because the old peer's late
  refusal suppresses the new peer. Restore the guard:
  `r2-restored-old-refusal.log` passes **1/1**. Mutation absent from commit.
- An initial green attempt exposed a test-fixture error: this server does
  not implement ping. The synchronization request was changed to supported
  tools/list, without modifying production protocol handling. Logs
  r2-green-regressions.log and r2-thread-complete.log retain those failures;
  r2-thread-green.log passes after the test correction. These are test
  construction failures, not baseline regressions, environment failures or
  flakes. The final red run uses the corrected barrier.

### Inherited evidence and scope

Read reviewer probes from
`/home/orgasmic/.orgasmic/runs/run-01M627ZXTYN8E3H2FE670FJT23/evidence/probes/`,
the reviewer run named by dispatch
`tx-20261028-theaspirationalslack-23bfa087-d24f-45b1-88e7-09b2ea290da8`.
A–C are in zz-rev.test.ts; D/E in zz-backlog.test.ts; F in zz-rej.test.ts;
crash.ts and zz-sec.test.ts were also inspected. Copies are retained under
reviewer-probes/. These were treated as claims and adapted into newly run
regressions, not reused as verification passes.

The only inherited numeric gate evidence is the **584/584 baseline on
unchanged upstream ca8f6b1193154384e4626921255f86923fc5edf3**, separately
measured on Node 22.23.3 and 24.22.1 in round 1. Logs are copied to
inherited/baseline-node22.log and inherited/baseline-node24.log; they name
the original immutable receipts and show the clean upstream HEAD. The
baseline source, lockfile, runtime versions and full-suite command are
unchanged, and the fresh fetch confirms the same upstream SHA. It is a
comparison baseline, not a pass for this new implementation. Prior Step 0
review inventory, scope analysis and repository instruction reads remain
context only; all requested final implementation gates were rerun.

## Updated draft reviewer reply (not posted)

Addressed in `17275b8`, still one local commit on `ca8f6b1`:

- MEDIUM 1: peer ownership is cleared first in finally; a held-clear test
  proves a later mention receives no false acknowledgement.
- MEDIUM 2: disconnect queues cleanup without awaiting Slack. A real TCP
  reconnect succeeds while the old clear is held; the new set follows that
  clear. Shutdown still awaits cleanup under the existing five-second cap.
- MEDIUM 3: non-Error rejections are logged safely, and a terminal catch
  keeps each turn non-rejecting. Subprocess tests prove no crash, continued
  set/clear operation and empty maps, including an unexpected local failure.
- LOWs: fixed the migration URL; removed the duplicate adapter post-clear
  and both redundant status-entry identity guards (serialization supplies
  that invariant). Documented the stop extension, degraded receipt and
  enabledFeatureSets pinning. Replaced all fixed 25 ms waits with barriers.

The four new regression cases fail on be7c3af and pass after the fixes.
An old-peer-refusal mutation also fails. Full suite: 612/612 on Node 22.23.3
and 24.22.1, versus upstream 584/584. Node 22.12.0 touched tests: 122/122;
thread-status tests pass 28/28 in five consecutive runs. Install, typecheck,
build, release dry fold and changelog check pass. No live Slack claim.

## Updated PR body draft (not applied)

### Problem

Slack typing notifications currently do nothing. The earlier PR revision
made typing a prerequisite for all messaging and could show status on
ambient, refused or already-answered messages. Review also found teardown
could block reconnects and a non-Error status failure could crash the process.

### Changes

- Declare optional `slack.typing` with `uses: ['channels.typing']`, independent
  of messaging. Hosts withholding channels.typing keep messaging but now
  receive `mode: 'degraded'` naming `slack.typing` with missing capability
  `channels.typing`. Hosts pinning `enabledFeatureSets` must add `slack.typing`
  to enable status (the wire selection field is `enabled`).
- Show status only on the latest accepted, addressed thread still awaiting
  an answer, respecting write/DM policy. Ambient/refused messages do not
  retarget it; top-level messages have no status, preserving publish routing.
- Clear after confirmed posts, peer disconnect or shutdown, and on the
  `op: 'stop'` extension. The declared ChannelsTypingParams contains only
  `{channelId}`; hosts sending only that shape clear via post, disconnect,
  shutdown or Slack's expiry rather than a stop notification.
- Serialize status work and suppress lasting refusals per peer. Disconnect
  queues cleanup without delaying reconnects; shutdown retains the existing
  five-second budget. Non-Error failures cannot reject or poison the queue.
- Correct README and add changelog.d/feat-slack-thread-status.added.md.

Rebuilt as one commit on ca8f6b1193154384e4626921255f86923fc5edf3.

### Tests

- `npm test`: **612 pass / 0 fail**, on both Node 22.23.3 and 24.22.1.
  Same-upstream baseline: **584 pass / 0 fail** on each.
- Install, typecheck and build pass on both. Node 22.12.0 touched files:
  **122 pass / 0 fail**. All 28 thread-status tests pass in five repeats.
- Original grant, routing, DM/allow-list, alias and real Slack-client refusal
  coverage; held-call disconnect/reconnect and isolated process-crash tests.
  Round-2 regressions fail on the prior commit, and the independent late
  refusal mutation fails. Release fold and changelog CI check pass.

### Not verified / out of scope

No live Slack rendering or live host end-to-end run. Cleanup remains
best-effort, with Slack expiry as fallback. Publish routing after ambient
messages and migration to agents.sessions.setStatus are unchanged/out of
scope. No companion PR is required.

- [x] Changelog fragment included.

AI-assisted implementation with Codex; model co-author recorded in commit.

## Unmet Criteria

None for this local fix round. Public push, PR edit and reviewer comments
remain owner decisions and were not performed.

## Residual Risk

- Slack cleanup remains best-effort: remote failures, timeouts, process
  termination or the five-second shutdown cap can leave status until expiry.
  Background cleanup no longer occupies the TCP peer slot, but a new set in
  the same conversation still waits behind the old in-flight call/clear.
- Channel-only typing remains a conservative pending-thread proxy, not proof
  of the host's actual inference target. Multiple pending addressed threads
  remain ambiguous, and existing publish routing after ambient delivery is
  unchanged. Top-level messages intentionally get no status.
- The stop field is an extension, not part of the pinned protocol type.
  Base-shape hosts rely on post/disconnect/shutdown/expiry cleanup.
- No live workspace was exercised; successor-method migration is deferred.
