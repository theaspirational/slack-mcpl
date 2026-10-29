# Implement fix round — Dispatch Brief
```brief
TASK-V08EN round 3: one fix on your d9fa8ab5, from the opus re-review on this task's reviewer dispatch tx-20261029-theaspirationalslack-a53c8adf-fa06-49c0-bd4c-a94bb73d107b. Read its MEDIUM; it includes probe5.

The bug is at `src/slack-adapter.ts:1444`. The short-circuit treats "the entry left the map" as "the reaction is gone". But `removeAck` also drops the entry on terminal failure (refused-for-good, stopping, tries exhausted). So a manual removal joining a FAILED cleanup returns "Nothing changed" while the reaction is still there, and Slack's refusal is swallowed.

Fix:
- Make the short-circuit depend on the joined cleanup's outcome. Record success on the entry: a `gone` flag set where `removeAck` succeeds, and on `no_reaction`. Return the "Nothing changed" result only when it is set; otherwise fall through to a real `reactions.remove` and report Slack's answer.
- Red test first: a manual removal that joins a cleanup refused for good (`is_archived`, or `missing_scope`) must surface the refusal.
- Keep the success-join test green.
- Fix the README (`:86-88`) and changelog fragment (`:12-13`) wording, and the PR body if it describes this.

Then:
- Amend to ONE commit on 7274283f (refetch upstream main; rebase if it moved and report).
- Same rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.
- Gates: typecheck and build on 22.23.3 and 24.22.1, full suite on all three Node versions, the reaction tests 5×, the changelog check, and one mutation of your own on the new flag.

Report:
- the sha
- fix → evidence
- gates
- the PR body LAST, from `pr-body.md`, with nothing after it
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-a1946606-369c-4b8a-bf30-e8f5274c1261, run run-01M63K6V25E568QV8Z5CGZDP5C, in your own native session and the same worktree.
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