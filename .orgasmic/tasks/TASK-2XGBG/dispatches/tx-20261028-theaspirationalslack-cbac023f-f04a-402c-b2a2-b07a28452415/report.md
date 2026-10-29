# TASK-2XGBG — Round 4

## Changed

Final local commit: `2e2eff1ac40838b7566feb13f0ae4f4ecfd632b8` (one commit on
`ca8f6b1193154384e4626921255f86923fc5edf3`). Preflight was clean at
`85c41a5ca5f1f18e57e75e9a8fbd07b9d4e70f51`; read-only fetch confirmed upstream
main unchanged. No rebase, push, PR edit or GitHub comment.

This round changes only `README.md` (+1 line) and
`test/threadStatus.test.ts` (+41 lines). Production `src/` is byte-identical
to the approved commit: `git diff 85c41a5c -- src` produces **empty output**
(saved as `src-unchanged.diff`, verified again by `final-source-identity`).
Production net change this round: **0 lines**. Entire feature versus upstream:
**+109 net production lines across 3 src files**; 11 files, +671/-25 overall.
Default author retained; commit trailer remains
`Co-Authored-By: GPT-6-Astra <noreply@openai.com>`.

### Fix → test

| Finding | Resolution and evidence |
|---|---|
| Uncertain failures must retain ownership | Added `an uncertain set failure keeps ownership for the teardown clear`: `ratelimited` retains thread `1.0`, no refusal suppression, reset sends exactly `C1:1.0:`, both maps empty. Exact reviewer M12 fails with `undefined !== '1.0'`; restored source passes. |
| Suppression reset ordering | Added `a refused old-peer set cannot suppress a new peer while another clear is pending`: C1 set refusal, held C2 clear, new C1 peer attempt completes before release. Exact reviewer M7 fails the attempt assertion; restored source passes. Uses promises, not timing sleeps. |
| Failed-clear documentation | README explicitly says a failed clear is not retried and status stays until Slack expiry. No behavior changed. |
| Public draft references/attribution/template | Drafts below use “first version of this branch” / “previous draft”, no inaccessible probe labels or unpushed SHAs; committed test names retained. Linked Codex footer names GPT-6-Astra; PR checklist wording and separator restored verbatim (checkbox checked). Counts updated. |

Mutation scripts copied to `mutations/M12.py` and `mutations/M7.py`. They were
applied one at a time, each produced an assertion failure (not an environment
error), and source was restored byte-for-byte before amendment. Both new tests
first passed together, both corresponding mutants failed individually, and the
restored entire thread-status file passed 32/32. No nested same-property mocks.

### Full diff stat

```
 README.md                                     |  20 +-
 changelog.d/feat-slack-thread-status.added.md |  14 +
 src/feature-sets.ts                           |  11 +-
 src/server.ts                                 |  33 +-
 src/slack-adapter.ts                          |  95 ++++-
 test/forwardingLifecycle.test.ts              |   2 +
 test/handshake.test.ts                        |   8 +-
 test/harness.ts                               |  17 +-
 test/registrationRecovery.test.ts             |   2 +
 test/serverVersion.test.ts                    |   2 +-
 test/threadStatus.test.ts                     | 492 ++++++++++++++++++++++++++
 11 files changed, 671 insertions(+), 25 deletions(-)
```

### Changelog fragment (unchanged, verbatim)

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

All final gates ran at `2e2eff1ac40838b7566feb13f0ae4f4ecfd632b8` with `clean=yes`. Each command was wrapped as
`orgasmic dispatch gate <name> -- timeout 900 <command>`.
Logs below are relative to this report's evidence directory; each contains
the exact durable `gate-<name>-<id>.log` receipt path.

| Gate | Command after timeout | Result | Log |
|---|---|---|---|
| final-runtime | `bash /tmp/task-2xgbg/r4-runtime.sh` | Node versions verified; scratch archives match freshly fetched official SHASUMS256.txt, extracted Node binaries match archives; configs empty, notifiers/audit/fund off; loopback guard smoke passes | `final-runtime.log` |
| final-22.23.3-typecheck | `npm run typecheck` | Pass | `final-22.23.3-typecheck.log` |
| final-24.22.1-typecheck | `npm run typecheck` | Pass | `final-24.22.1-typecheck.log` |
| final-22.23.3-suite | `npm test` | 616 pass, 0 fail; baseline 584 | `final-22.23.3-suite.log` |
| final-24.22.1-suite | `npm test` | 616 pass, 0 fail; baseline 584 | `final-24.22.1-suite.log` |
| final-22.12.0-suite | `npm test` | 616 pass, 0 fail; baseline 584 | `final-22.12.0-suite.log` |
| final-thread-repeat-1 through -5 | `node --import tsx --test --experimental-test-isolation=none test/threadStatus.test.ts` on Node 22.23.3 | 32 pass, 0 fail in each of five runs | `final-thread-repeat-{1,2,3,4,5}.log` |
| final-changelog-regex | `bash /tmp/task-2xgbg/changelog-check.sh` | Exact CI regex, diff whitespace, sole upstream parent and clean merge-tree pass | `final-changelog-regex.log` |
| final-release-fold | `bash /tmp/task-2xgbg/release-check.sh` | Real release script folds 34 fragments in scratch; typing fragment appears and is consumed; no tracked writes | `final-release-fold.log` |
| final-source-identity | `git diff --exit-code 85c41a5c -- src` plus clean-status/parent checks | Empty src diff; clean | `final-source-identity.log` |

`npm test` expands to
`node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.
Runtime PATHs: `/opt/node/bin` (22.23.3),
`/tmp/task-2xgbg/node-v24.22.1-linux-x64/bin`, and
`/tmp/task-2xgbg/node-v22.12.0-linux-x64/bin`. Each test inherits
`NODE_OPTIONS=--require=/tmp/task-2xgbg/loopback.cjs`.
Empty npm configs: `/tmp/task-2xgbg/npm-user` and `npm-global`.
Scripts are preserved in `scripts/`; official checksum lists in this directory.
No npm install/build rerun was assigned in this tests/docs-only round;
`package.json` and `package-lock.json` remain identical to upstream.

Precommit focused checks use the same wrapper/timeout and Node 22.23.3:

| Gate | Selection from test/threadStatus.test.ts | Result / log |
|---|---|---|
| r4-green-new-tests | `--test-name-pattern='an uncertain set failure|a refused old-peer set'` | 2/2 pass; `r4-green-new-tests.log` |
| r4-mutation-M12 | `--test-name-pattern='an uncertain set failure'` | Expected red: 0/1; `r4-mutation-M12.log` |
| r4-mutation-M7 | `--test-name-pattern='a refused old-peer set'` | Expected red: 0/1; `r4-mutation-M7.log` |
| r4-restored-tests | Whole file | 32/32 pass; `r4-restored-tests.log` |

### Inherited evidence and scope

No previous implementation gate substitutes for any final gate above.
Baseline comparison is inherited and inspected, not newly measured this round:

- `/home/orgasmic/.orgasmic/runs/run-01M6279QRCAG8H91NXVQPV7FF7/evidence/baseline-node22.log`
  and `baseline-node24.log`: clean upstream `ca8f6b1193154384e4626921255f86923fc5edf3`,
  **584/584** on 22.23.3 and 24.22.1.
- `/home/orgasmic/.orgasmic/runs/run-01M62B248SGPT8XN16P3E6YWMZ/evidence/r3-baseline-floor.log`:
  **584/584** on 22.12.0 from a git archive of that same upstream SHA. The
  enclosing worktree was dirty, but the tested source was the separate
  upstream archive, not the worktree. Upstream SHA and dependency manifests
  are unchanged, so these remain valid baseline counts.
- The prior round's `report.md` in that latter directory records the historical
  five-case regression recount, unsafe-message/clear-refusal red-green checks
  and epoch-guard mutation cited in the drafts. Those are historical claims,
  not newly rerun checks this round. Their test and production inputs are
  unchanged; this round only adds two tests and one README sentence.
- Original Step 0 PR/review inventory remains in the first run's `report.md`.
  Reviewer directions used here: dispatch
  `tx-20261028-theaspirationalslack-e4f97100-7fa2-4012-860c-54fe6620a174`,
  `/home/orgasmic/.orgasmic/runs/run-01M62BGMQ3YB55J0J0VXP6Z2X6/evidence/`:
  `probes/zz-r3-new.test.ts` (ratelimited row), `probes/zz-r3-m7.test.ts`,
  `mutations/M7.py`, `mutations/M12.py`, and report replacement wording.

## Unmet Criteria

None for Round 4. All assigned gates passed; the two requested mutation gaps
are closed. Public drafts are local artifacts only, not posted.

## Residual Risk

No new production risk from this tests/docs-only round. Live Slack rendering,
workspace permissions and a live host end-to-end run remain unverified.
Clears are best-effort and not retried; failed clears may leave a visible status
until Slack expires it. Same-conversation status calls still queue behind an
in-flight call, but reconnect acceptance does not wait. Channel-only typing
cannot identify the exact inference target; the latest accepted addressed
thread remains a proxy. The stop operation is an extension, not a declared
ChannelsTypingParams field. Default commit author is retained as requested.

## Final reviewer reply (verbatim; draft comment on #12)

Rebuilt as one commit on current upstream main, addressing each review point:

- Typing now has its own optional `slack.typing` set. The original grant
  still delivers and publishes; only typing is reported degraded.
- Status follows the latest accepted, addressed thread still awaiting an
  answer, not ambient/refused messages. Top-level publish routing is unchanged.
- Lasting set refusals suppress attempts until peer change; refused sets need
  no teardown clear. Uncertain failures retain ownership for cleanup. Failed
  clears cannot suppress the next peer, but are not retried and leave status
  until Slack expires it.
- Per-conversation queues preserve ordering. Disconnect detaches the peer
  immediately without blocking reconnects; shutdown retains its five-second
  cap. Non-Error rejections cannot crash or poison the queue.
- Tests use upstream's harness and homes, including its original grant.
  README and the fragment document the stop extension, degraded receipt,
  feature-set pinning and successor-method link.

Five regression cases from the teardown/error follow-up are red against the
first version of this branch. The subsequent polish adds `R3-P1` and `R3-P2`
and widens `a late old-peer refusal cannot disable the new peer status`:
`R3-P2` and the widened case are red against the previous draft's teardown
behavior; `R3-P1` is red with the unsafe `(err as Error).message` read restored.
Separately, removing the epoch guard makes the widened case fail; that is a
mutation, not an additional regression test.

The final tests-only polish adds two cases: uncertain failures retain
ownership for teardown, and an old refused set cannot suppress a new peer
while another conversation's clear is pending. Both catch their respective
mutations (dropping uncertain ownership and delaying suppression reset).
Production source is unchanged by this polish.

Full suite: **616/616 on Node 22.23.3, 24.22.1 and 22.12.0**, versus upstream
**584/584**. Thread-status tests pass **32/32 in five consecutive runs**.
Typecheck on 22.23.3 and 24.22.1, release dry fold and changelog CI check pass.
No live Slack rendering or host end-to-end claim is made.

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)

## Final PR body (verbatim; replacement body for existing #12)

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
  refused sets need no teardown clear. Uncertain set failures remain retryable
  and retain ownership for cleanup. A failed clear is not retried, so that
  status stays until Slack expires it.
- Detach disconnected peers immediately and queue cleanup without delaying
  reconnects. Shutdown cleanup retains the existing five-second cap.
  Non-Error failures cannot crash the process or poison the status queue.
- Update README and include
  `changelog.d/feat-slack-thread-status.added.md`.

Rebuilt as one commit on current upstream main. Changing publish routing
following ambient messages (#6), migrating to `agents.sessions.setStatus`,
and splitting other existing mandatory messaging capabilities are out of scope.
Channel-only typing remains a conservative pending-thread proxy, not an
identifier of the host's inference target. No companion PR is required.

## Tests

- Full one-process `npm test`: **616 pass / 0 fail** on Node **22.23.3,
  24.22.1 and 22.12.0**. Same-upstream baseline: **584 pass / 0 fail**.
- Typecheck passes on Node 22.23.3 and 24.22.1.
- All **32 thread-status tests** pass in **five consecutive runs**.
- Regression coverage includes the original grant without typing, accepted
  versus refused/ambient delivery, top-level publish, DM/write restrictions,
  the typing alias, real Slack-client refusal classification against a local
  fake API, held-call disconnect/reconnect, and non-Error process/queue safety.
- Five teardown/error regression cases are red against the first version of
  this branch. The clear-refusal cases are red against the previous draft;
  restoring the unsafe `.message` read fails the same-thread retry test.
  Separately, removing the epoch guard fails the late-refusal test.
- Two additional tests pin uncertain-failure ownership and suppression reset
  before a new peer's turn. Each catches its corresponding mutation: dropping
  ownership on an uncertain failure, or clearing suppression after teardown
  calls rather than before them. This final polish changes no production code.
- Release dry fold and the changelog CI regex pass.

## Not verified

No live Slack rendering, private-channel/DM workspace run, or live host
end-to-end run. Cleanup is best-effort; failed calls, client timeouts, forced
termination or the shutdown cap can leave status until Slack's expiry.

---

- [x] Changelog fragment added — `changelog.d/<slug>.<breaking|added|changed|fixed>.md`
      (see `changelog.d/README.md`) — or this change is internal-only /
      test-only / docs-only (apply the `no-changelog` label).

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
