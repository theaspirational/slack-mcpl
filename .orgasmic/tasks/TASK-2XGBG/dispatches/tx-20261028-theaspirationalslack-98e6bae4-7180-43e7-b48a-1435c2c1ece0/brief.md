# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-2XGBG: fix the review findings. Your be7c3af1 got "approve with changes" from opus review, with three MEDIUMs. Same rules as round 1:
- Local only, public-safe, notifiers off.
- npm ci with empty configs; Node 24.22.1 and 22.12.0 in scratch, verified.
- A loopback-only guard is in force for test listeners.
- Run gates with `timeout 900`.
- No nested same-property mocks.

Preflight: HEAD = be7c3af1, clean. Fetch upstream main read-only. If it moved past ca8f6b11, rebase onto it and say so.

The reviewer's probes are in its evidence directory: `probes/zz-rev.test.ts` (PROBE A–F), `probes/crash.ts` and `probes/zz-sec.test.ts`. Find them under this task's reviewer dispatch, tx-20261028-theaspirationalslack-23bfa087-d24f-45b1-88e7-09b2ea290da8. Adapt them into real tests where named below.

Fix:
1. MEDIUM, `src/server.ts:329-333`. `this.conn = null` now runs after `await resetThreadStatuses()`, so a message arriving during teardown gets the ack reaction and is then dropped. Make `this.conn = null;` the first statement of the `finally`.
2. MEDIUM, same block. The awaited reset keeps serveTcp's single slot busy, so a reconnecting host is refused for a time bounded only by the status-call backlog (PROBE C, PROBE D). Don't await the reset on connection teardown; the per-conversation queue already orders the clear before the next peer's set. Or bound the wait, and say which you chose and why. Keep the await in `SlackAdapter.stop()` under index.ts's 5 s cap.
3. MEDIUM, `src/slack-adapter.ts:1196` in `callStatus`. `(err as Error).message` throws on a non-object rejection, which exits the process (`crash.ts`), poisons the conversation's queue (PROBE F) and leaks the `statusQueue` entry. Make the error message safe, and give the turn a terminal catch so `setThreadStatus` can never reject and the queue entry is always deleted.
4. Tests for all three: a status call held open across a disconnect (no ack, and reconnect accepted), and a non-Error rejection (no exit, the queue keeps working, the map empties). Red before, green after. Plus one mutation of your own.
5. LOW, `README.md:43`: point the migration link at https://docs.slack.dev/reference/methods/agents.sessions.setStatus/.
6. LOW: drop the duplicate post-clear at `src/slack-adapter.ts:1310`; `markOutbound` covers it, including `upload_file`. Remove or comment the two unreachable identity guards (`:1157`, `:1168`); say which.
7. LOW, docs. README/fragment: the `op:'stop'` clear relies on a field `ChannelsTypingParams` doesn't declare, so hosts that send only `{channelId}` clear via post, disconnect, shutdown or expiry. The PR body draft must say that hosts withholding `channels.typing` now get `mode:'degraded'` naming `slack.typing`, and that `enabledFeatureSets` pinners must add the set.
8. LOW, optional: replace the fixed 25 ms "nothing happened" waits with something deterministic where that's cheap. Say what you did.

Keep it ONE commit on upstream main: amend or squash, then report the new sha. The branch `task-2xgbg-impl` may be rewritten since nothing is pushed. Keep the trailer and default author.

Gates at the final commit:
- npm ci, typecheck and build on Node 22.23.3 and 24.22.1
- full suite on both (baseline 584 at the same upstream sha)
- 22.12.0 on the touched test files
- threadStatus tests repeated at least 5 times
- release dry fold and changelog CI regex

Report: the sha, diff stat (production net lines), fragment verbatim, a finding → fix/test table, gates, an updated draft reviewer reply and PR body.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-396e89c8-1eac-442f-99b9-12010febf0de, run run-01M6279QRCAG8H91NXVQPV7FF7, in your own native session and the same worktree.
Changed this round: the brief above narrows the assignment; use this run's evidence directory and report, not the earlier round's destination.
Original instructions are history, not missing context. Original scope, security and read-only-ledger boundaries still apply, narrowed by this brief. Do not replay startup reads unless changed facts or this brief require them. Do not merge or close the dispatch.

## Evidence and verification
Earlier reads/code/reports remain context, not new proof. Identify valid inherited evidence and its unchanged inputs/scope in this round's report. No earlier gate pass is implied by resuming. Verify findings against current source. Run assigned checks and scoped probes through `orgasmic dispatch gate <name> -- <cmd> [args...]`; missing receipts do not assign a full suite. Keep builds outside evidence.

## Completion for this round
Report Changed, Verification Gates (commands/results/logs and inherited evidence), Unmet Criteria, and Residual Risk in `$ORGASMIC_EVIDENCE_DIR/report.md`. If unset, substitute a scratch path outside the worktree below.
For done, satisfy the narrowed brief and make a local commit in this worktree; stage explicit paths and do not bypass hooks. Then run:
`orgasmic dispatch finalize --status done --summary-file "$ORGASMIC_EVIDENCE_DIR/report.md"`
If blocked, report the exact unmet criteria and run:
`orgasmic dispatch finalize --status blocked --reason "<why>" --summary-file "$ORGASMIC_EVIDENCE_DIR/report.md"`
Blocking decision: `orgasmic dispatch ask "<question>"`; keep it alive for the stdout answer. A timeout is not permission. With `--no-wait`, answers/messages arrive at turn boundaries, not between tool calls. If finalize refuses for pending messages, handle their full text and retry. Successful finalize is terminal; no work follows it. Never disclose credentials or the run token.