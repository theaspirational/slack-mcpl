# Implement fix round — Dispatch Brief
```brief
TASK-ER984, round 2: IMPLEMENT your plan. Owner decision: button `a4:recs:all` (taken as the owner's go), so EVERY ⭐ recommendation in your plan, sections 1–6, including 3a–3g and the section 4 placements.

Base: `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf` (published as #59 with an identical tree), stacked on #58, #56 and #55.
- Preflight: `git rev-parse HEAD`, and fetch upstream main (report if it moved).
- One commit on 3b1a97ac, with the trailer `Co-Authored-By: GPT-6-Astra`.

Also include:
- the review LOW from #59: the download-hint predicate reuses the same file-state check as the gate (deleted, tombstoned, external, unsupported or absent mode, non-visible access), so no hint is offered for a file the gate refuses;
- documentation that policy rollback deletion needs `files:read`.

Keep:
- the pinned-channel fallback out of this change;
- no hot reload;
- #53 independent.

Follow your red/green sequence, the real-server startup matrix (both transports) and the legacy byte-identity comparison against 3b1a97ac with the setting absent. Add the changelog fragment, README, `.env.example` and `docs/access-policy-migration.md`.

If the size clearly exceeds ~400 production lines or forces a broad rewrite, STOP and report a split proposal instead (for example, the admission fixes first).

Rules:
- notifiers off from the first command;
- `npm ci --ignore-scripts` with empty configs;
- a loopback-only Node preload guard in force, inherited by children;
- strip SLACK_* credentials;
- gates via `timeout 900 orgasmic dispatch gate`:
  - typecheck and build on 22.23.3 and 24.22.1;
  - the full suite on 22.23.3, 24.22.1 and 22.12.0;
  - the targeted tests 5×;
  - ≥6 caught mutations;
  - the changelog check;
  - red and green receipts;
- no push, PR or comment;
- no private names.

Report:
- the sha
- the diff stat
- decision → evidence
- gates
- residual risk
- the PR body LAST, saying it depends on #59. Nothing after it.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-251cfd87-8631-4836-b5ed-cb36a25c7eae, run run-01M642VVF02NTS369VADW8N1QG, in your own native session and the same worktree.
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