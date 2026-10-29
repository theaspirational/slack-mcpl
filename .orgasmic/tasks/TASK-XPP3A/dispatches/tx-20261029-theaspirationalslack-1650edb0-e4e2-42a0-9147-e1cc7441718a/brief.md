# Implement fix round — Dispatch Brief
```brief
TASK-XPP3A round 3: wording only, on your 9f03ef92. The opus re-review approved it; its LOW-1 is on reviewer dispatch tx-20261029-theaspirationalslack-c8d169b4-c023-40bd-92a4-e34ef72a98c8.

Replace the internal chain labels in the committed diff with plain language:
- `src/slack-adapter.ts:1588` and `:1668`: "a later PR adds attachment enforcement";
- the test name at `test/adapterAccess.test.ts:220` ("…until A3…"): "…until attachment enforcement…";
- `test/adapterAccessFixture.ts:11` ("A2 provides…"): "this change provides…".
Then grep the whole diff for `\b(A1|A2|A3|A4|G|F)\b` used as chain labels and fix any others. Show the grep output.

Rules:
- No behaviour change: the `src` diff against 9f03ef92 is comments only.
- Amend into ONE commit on 62a77616.
- Same environment rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.

Gates:
- typecheck on 22.23.3;
- full suite on 22.23.3, 24.22.1 and 22.12.0 (expect 672);
- the new tests once.

Report:
- the sha
- `git diff 9f03ef92` stat and content
- gates
- the PR body last: unchanged unless a label appears in it
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-bd0f5edc-b814-452d-bf3c-48a84dc82ee6, run run-01M63BQ6N1W8PTSRV1XD32WJ3Z, in your own native session and the same worktree.
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