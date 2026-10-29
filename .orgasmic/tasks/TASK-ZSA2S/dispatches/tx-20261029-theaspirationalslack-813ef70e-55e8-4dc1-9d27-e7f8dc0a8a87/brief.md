# Implement fix round — Dispatch Brief
```brief
TASK-ZSA2S, round 2: IMPLEMENT your plan. Owner decision: button `a3:recs:keepdelete` (taken as the owner's go). That means all your ⭐ choices EXCEPT decision 4. Deletion is kept, using your alternative.

Start from the same base `f6e628352013751a8d89b76f93486ff4ac2931fe` (#56). Preflight with `git rev-parse`, and fetch upstream main (report if it moved).

Decisions:
1. Policy mode takes conversation ID + file ID. URL-only is refused before any network call. Legacy stays URL-only and byte-identical.
2. A file shared in several places is readable through one freshly proven admitted share.
3. Refs show only the metadata already in the admitted message. Verify only at download, with no per-ref `files.info`.
4. **Deletion is kept** in policy mode. Gate it with:
   - server-recorded upload provenance;
   - a fresh writable target plus `files:write`;
   - a fresh `files:read` `files.info` showing the exact file identity and positive current association with the recorded target.
   Deny unshared, orphaned, mismatched or unknown files. No caller-pair-only exception. Document plainly that a delete still affects other shares.
5. External files and every redirect are refused. Use only the exact `files.slack.com` URL from `files.info`.
6. Fresh checks before each download, with no cache. State the residual race.
7. Recheck the upload target before `files.completeUploadExternal`.

Everything else follows your plan: sections A–C, D-alternative, the matrix, red-before-green through the real server path, legacy byte-identity A/B, and a changelog fragment describing dormant preparation.
- Don't edit `access-policy.ts` or the group-DM areas. A parallel group-DM change on #56 owns those, so keep `slack-adapter.ts` hunks separate.
- No setting or activation.

Rules:
- notifiers off from the first command;
- `npm ci --ignore-scripts` with empty configs;
- a loopback-only guard in force;
- gates via `timeout 900 orgasmic dispatch gate`:
  - typecheck and build on 22.23.3 and 24.22.1;
  - the full suite on 22.23.3, 24.22.1 and 22.12.0;
  - the new tests 5×;
  - ≥4 caught mutations of your own;
  - the changelog check.
- One commit on f6e62835, with the trailer `Co-Authored-By: GPT-6-Astra`.
- No push, PR or comment. No private names.

Report:
- the sha
- the diff stat
- decision → evidence
- gates
- residual risk
- a PR body LAST that says it depends on #56. Nothing after it.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-d4144377-7d7f-43fc-bde7-bd3da9d0606d, run run-01M63Y0S2P0ZC4FWP75HXK8KDZ, in your own native session and the same worktree.
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