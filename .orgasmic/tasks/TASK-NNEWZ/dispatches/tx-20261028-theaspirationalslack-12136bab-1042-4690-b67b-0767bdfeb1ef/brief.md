# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-NNEWZ: refresh `docs/FORK-VS-UPSTREAM.md` against current upstream. Same rules as round 1: edit only that one file, commit locally on your task branch, no push, no PR, no GitHub comment, no credentials, public-safe text only (no agent, host or private names), update notifiers off from the first command. Network: `git fetch` from https://github.com/anima-research/slack-mcpl.git and https://github.com/theaspirational/slack-mcpl.git, and unauthenticated GET calls to the public GitHub REST API only.

Preflight: `git rev-parse HEAD` must print d63db80fb5998a1d10ddc3e294a2d9391278d828, else stop.

What changed since round 1 (check each):
- Upstream main moved from 439a81b502388ab3a77b4bbb0e62a380e1b50605 to d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34 (their PR #49: whole suite in one process with `--experimental-test-isolation=none`, test waits on a virtual clock). If it has moved again, use the new head and say so.
- PR 1 of your plan (descriptor-label quoting) is now open upstream as https://github.com/anima-research/slack-mcpl/pull/50 (one commit 7fc1acade0c089d491d77fcf3c182fc88aaa877f on d3e4f7c9, from fork branch `channel-label-framing`). Fork main is still 685b2debff12ed5cfdcae9070ddb131842c5a6d0 and does not contain it.
- Re-check states of our upstream PRs #12 and #31 and any other open PR of ours.

Do:
1. Recompute ancestry and the diff (fork main vs current upstream main). Update every row whose status, files or base changed; mark the label-quoting row as open PR #50.
2. For each proposed PR, in a scratch clone outside the worktree, check whether its commits (or the fork's version of its files) still apply to current upstream main; record clean / conflicts (with paths) / not checked. Note in particular any test file that relies on per-file process isolation or real timers and would break under #49's runner. You may run `npm ci --ignore-scripts` and `npm test` in the scratch clone for a candidate if that is the quickest way to answer; say which ones you ran.
3. Revise the PR order if the new facts change it, and say why. Name the next one or two PRs to start, with scope, size and the tests they carry.
4. Add a short "changes since d63db80f" section at the top.

Finalize: one local commit, then the report: final sha, what changed in the table, apply results per PR, the revised order, what you could not establish. Gate your own consistency check through `orgasmic dispatch gate` at the final commit.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-68fb0565-9162-4afc-9b8c-03ae91584af8, run run-01M61PHEHT1Z1RWG76C7NEVSAP, in your own native session and the same worktree.
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