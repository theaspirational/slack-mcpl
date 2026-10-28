# Implement fix round — Dispatch Brief
```brief
PUBLIC repo/ledger: public technical facts only; no private names.
Edit round on TASK-1735W (doc approved for accuracy at b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8). One owner-direction change, publicly stated by the fork's maintainer: fork PR #1 (theaspirational/slack-mcpl, branch feat/group-dms, extends the explicit access policy to group DMs) will be merged into the fork and the access policy will then be proposed upstream together with it.
Change in docs/FORK-VS-UPSTREAM.md:
- Access group rows (explicit policy and the rows that only exist with it: pinned membership, stale pin, listing cost, bounded-history integration, explicit DM scope preflight): recommendation becomes "Send upstream, later, as one reconciled PR together with fork PR #1 (group DMs)", reason: the policy is planned to go upstream as one contract; it is opt-in and leaves defaults unchanged. Keep the attachment rows as they are unless consistency requires mentioning the same reconciled PR.
- The explicit-policy row currently says group DMs are denied; add that this is the state at b956350d and that fork PR #1 (open, not merged) proposes group-DM support.
- Adjust 'Which should I use' only where it contradicts this.
New commit on top of b77a1b02 (do not amend). Gates: the existing markdown-only gate adapted to the new base (only that file changed vs b956350d, diff --check, <250 lines). Report new doc bytes, sha256, commit, and the changed rows verbatim.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-83ce68af-273b-47fd-a443-5b6437418bc9, run run-01M619PS2SZM4Y7PD430H2RJ21, in your own native session and the same worktree.
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