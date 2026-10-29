# Implement fix round — Dispatch Brief
```brief
TASK-SYJYQ round 3: a small polish of your f1f9eee9. The opus review approved it, with no containment escape, but asked for these fixes. The review report is on this task's latest reviewer dispatch (tx-20261029-theaspirationalslack-c02055bc-769e-47e0-bc6b-29ee39184283); its probes are in that run's evidence.

1. MEDIUM, test. At `test/pathUploads.test.ts:61`, assert the hidden-path refusal text (`/doesn't take file paths/`). Show that deleting the guard at `src/server.ts:716` now fails (the reviewer's M5).
2. MEDIUM, docs. README:208, the unrestricted bullet of the fragment, and the PR body: unrestricted mode can read the connector's own `/proc/self/environ`, and so its Slack tokens and any other secret in its environment. Enable it only where the agent is already trusted with those credentials.
3. LOW. README:184: an explicitly empty `filename` is refused, not defaulted. Document it; don't change the behaviour.
4. LOW. Sanitize `readUnrestricted`'s `open` failures (`src/upload-path.ts:277`) to a constant such as `'Upload path is unreadable'`, matching restricted mode, and update `test/uploadPath.test.ts:160`.
   - Note: this changes `src/upload-path.ts`, so it is no longer byte-identical to #31's. Say that in the PR body.
   - If you judge the errno detail important, keep it and explain why instead.
5. PR body: say explicitly that no concurrency bound exists over path reads, so N parallel reads can each hold a whole file. Leave the code as is.

Then:
- Amend into ONE commit on the same parent 7274283f. Rebase if upstream main moved, and say so.
- Default author, same trailer.
- Same rules and gates as round 2: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`. Typecheck and build on 22.23.3 and 24.22.1, full suite on all three Node versions, the new files 5×, release fold, changelog regex.

Report:
- the sha
- a fix → evidence table
- gates
- the final fragment, PR body and #31 comment verbatim
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-eb1c964d-e3c4-4a58-91aa-45506b35cec2, run run-01M632CC8AV6R82YC81M26399V, in your own native session and the same worktree.
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