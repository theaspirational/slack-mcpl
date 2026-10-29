# Implement fix round — Dispatch Brief
```brief
TASK-T71QC round 2: polish. Opus approved 9592c649. Its findings are in the reviewer dispatch report on this task (tx …02831105…). Address:

1. MEDIUM test: add a direct unit row that bypasses the adapter. With `writeChannels: []`, `policy.requireWritable('G1', <group conv>, <scopes>, 'chat:write')` throws "not allowed by the Slack access policy". Show it kills the reviewer's M6 mutation (exempt `group_dm` from the write pin in `requireWritable`). The full suite passed under that mutation before.
2. MEDIUM unverified `is_member` for mpim: change no code. Add a clear PR-body "Before activation" note saying admission requires `conversations.info` `is_member === true`, that this is unverified for MPIMs against a live workspace, and that it fails closed. Record that the activation PR must confirm it or choose another signal.
3. LOW docs: add the base comparison to the PR body: base f6e62835 = 672 pass/0 fail.
4. LOW perf: one PR-body sentence. With `groupDms` set, listing requests mpim, which costs one `conversations.info` per listed mpim, including unnamed ones.
5. LOW (the `groupDms: undefined` throw): one sentence noting that callers must omit the key, not pass undefined.

No production code change. Amend to ONE commit on f6e62835, and refetch upstream main.

Rules:
- notifiers off;
- `npm ci --ignore-scripts` with empty configs;
- a loopback-only guard in force;
- gates via `timeout 900 orgasmic dispatch gate`: typecheck, the full suite on 22.23.3, 24.22.1 and 22.12.0, the group tests 5×, and M6 killed.

Report:
- the sha
- the diff stat against 9592c649
- gates
- the PR body LAST. Nothing after it.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-a2852031-3edb-48c9-b86f-a3418370cd81, run run-01M63Y0S24ZECY2XWTDG35C40M, in your own native session and the same worktree.
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
Blocking decision: `orgasmic dispatch ask "<question>"`; keep it alive for the stdout answer. A timeout is not permission. With `--no-wait`, Codex app-server accepts answers/messages mid-turn; other multi-turn harnesses receive them at turn boundaries or finalize. If finalize refuses for pending messages, handle their full text and retry. Successful finalize is terminal; no work follows it. Never disclose credentials or the run token.