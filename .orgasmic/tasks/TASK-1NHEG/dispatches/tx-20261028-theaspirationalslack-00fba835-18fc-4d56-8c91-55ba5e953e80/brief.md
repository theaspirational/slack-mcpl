# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-1NHEG: wording only. Your commit 7e97972721fef609383616191447e05b81cd1018 was approved; the reviewer's one actionable LOW is that the two new sentences in changelog.d/channel-label-framing.fixed.md restate each other. Same rules as before (local commit only, no push/PR/comment, public-safe text, notifiers off).

Preflight: HEAD = 7e979727, clean.

Do: AMEND 7e979727 (so the PR gets exactly one follow-up commit; it was never pushed) so the fragment's last two sentences are replaced with this wording, or a tighter equivalent that keeps every fact:

> A non-plain workspace name changes every conversation's label in that workspace, even one whose own name is plain. A host keeps the label a conversation was first announced with and a refresh doesn't re-announce a known one, so after an upgrade a host's conversations keep their old labels, raw hostile names included, while a write's `to` gives the server's new label and may no longer match.

Keep the earlier sentences of the bullet as they are; one bullet, no heading. Keep the commit message, trailer and author unchanged. No other file changes.

Gates at the amended commit: `git diff 7e979727 --stat` shows only the fragment; npm ci, typecheck, build and full suite on Node 22.23.3 (expect 605/0); run `scripts/release-changelog.mjs` in a scratch copy and confirm the bullet folds cleanly. Report: new sha, the fragment verbatim, word count before/after, gates.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-7346c67e-204c-4826-974d-f7928f6a79b4, run run-01M622GRVVG1PP0HH2KMAMY4MV, in your own native session and the same worktree.
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