# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-9YJZP. Same rules as round 1: local commits on your task branch only, no push, no GitHub comment, no merge, no credentials, public facts only, update notifiers off from the first command, `npm ci --ignore-scripts` from the public registry with two distinct empty user and global npm config files, Node 24.22.1 from the verified scratch install outside the repository (re-verify its checksum).

Preflight: `git rev-parse HEAD` must print 252365fe1bf991700276a9f2e0c3ff69d65c2ca1, else stop.

The review of 252365fe approved the code but found (treat each as a claim; check it):
- MEDIUM: no `changelog.d/` fragment for a behaviour-affecting `src/` change; `.github/workflows/changelog.yml` requires a newly ADDED fragment. Fix: add `changelog.d/channel-label-framing.fixed.md`, one `- …` bullet, no heading, following CONTRIBUTING.md and the style of existing fragments: an ordinary or private channel's name and the workspace's name in a conversation's label now follow the name rule (quoted when not plain, the channel's `#` inside the quotes); plain names are unchanged; the label reaches channels/register, channels/changed, channels/open, refresh_channels' added, and a write's `to`.
- LOW: an empty workspace name now renders `("")` while locationHeader (src/server.ts:156) omits the parenthesis. Fix: in toDescriptor (src/channels.ts) omit ` (…)` when teamName is empty, for all four kinds, and pin it with a test. Note in the report that this also changes the pre-existing `()` output for an empty team name.
- LOW: widen the hostile constant and leak assertion in test/channels.test.ts to the character class used at test/senderFraming.test.ts:147 (U+2028/9, U+0085, DEL/C1, format characters, U+2800, non-ASCII spaces).
- LOW: one harness test for a hostile ordinary-channel name through channels/register and a write's `to`, mirroring the DM test at test/senderFraming.test.ts:316-323.

Red/green for each new or changed test: one temporary production edit, the targeted test red, restore byte-for-byte, `git diff --exit-code -- src`, green. Never commit a mutant.

Limits: production changes in src/channels.ts only, net about 10 lines; stop and report otherwise.

Final gates, fresh at the final commit through `orgasmic dispatch gate`: npm ci, build, typecheck, full suite on Node 22.23.3; full suite on Node 24.22.1. Base (252365fe) vs final counts.

Report: final sha, commits, production diff with file:line, the changelog fragment verbatim, red/green evidence, counts per engine, what you could not run. Finalize with that report and a local commit.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-66fd2827-4147-4f04-b523-d6ffe288e6a6, run run-01M61P24AD081P3GYZTV7N38YN, in your own native session and the same worktree.
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