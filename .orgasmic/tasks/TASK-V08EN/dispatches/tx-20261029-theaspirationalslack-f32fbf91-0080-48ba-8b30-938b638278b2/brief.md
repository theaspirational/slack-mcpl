# Implement fix round — Dispatch Brief
```brief
TASK-V08EN round 4: polish only, on your 8130e873. Opus approved it; its two LOWs are on this task's reviewer dispatch tx-20261029-theaspirationalslack-1e1a6484-8287-43e8-a349-13511699ee6a.

1. LOW-1: add one adapter-level test shaped like the reviewer's probe8. Two overlapping `removeReaction` calls on a pending ACK: the second resolves false ("Nothing changed"), and `reactions.remove` is called exactly once. It must kill mutation M18 (delete `entry.gone = true` in `removeReaction`'s success branch, `src/slack-adapter.ts:1458`). Show M18 killed.
2. LOW-2: re-wrap `README.md:88` and that paragraph at the file's prose width; same for the changelog fragment's short line. Text unchanged.

Rules:
- No production code change.
- Amend to ONE commit on 7274283f; refetch upstream main and rebase if it moved.
- Same rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.

Gates:
- full suite on all three Node versions;
- reaction tests 5×;
- typecheck;
- changelog check.

Report:
- the sha
- `git diff 8130e873` stat
- gates
- the final PR body LAST, from `pr-body.md`, with nothing after it
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-4ec8a9e0-4a49-4525-a94f-ef79ff5f97c5, run run-01M63MGE24QSBSSE833DFGNQD2, in your own native session and the same worktree.
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