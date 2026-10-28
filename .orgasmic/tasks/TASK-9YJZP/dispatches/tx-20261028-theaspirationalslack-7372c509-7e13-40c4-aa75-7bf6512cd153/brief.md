# Implement fix round — Dispatch Brief
```brief
Round 3 of TASK-9YJZP: polish before an upstream PR. Same rules as before: local commits on your task branch only, no push, no GitHub comment, no merge, no credentials, public facts only, update notifiers off from the first command, `npm ci --ignore-scripts` from the public registry with two distinct empty npm config files, Node 24.22.1 from the verified scratch install outside the repository (re-verify its checksum).

Preflight: `git rev-parse HEAD` must print 13692e01c58dd65ad74496afda351ed96c72d9e6, else stop.

The round-2 review approved 13692e01 with two LOWs (treat each as a claim and check it):
1. changelog.d/channel-label-framing.fixed.md lists reach points as if exhaustive but omits `channels/list` (src/server.ts ~507-513 returns descriptors verbatim). Add it, or reword so the list is clearly illustrative. Keep one bullet, no heading.
2. The harness test at test/senderFraming.test.ts ~325-337 uses one modest hostile name and the narrow /[<>\r\n]/ assertion. Make it use the widened leak class already in test/channels.test.ts (share it rather than copy it, if that stays small), and add at least one exotic hostile name (e.g. containing U+2028, U+202E, U+00A0, U+2800) through channels/register and a write's `to`, with a JSON round-trip check. Red/green: one temporary production edit that lets only an exotic character through, targeted test red, restore byte-for-byte, `git diff --exit-code -- src`, green. Never commit a mutant.

No production change is expected this round. If you think one is needed, stop and report.

3. Squash for the PR: create ONE commit on top of 685b2debff12ed5cfdcae9070ddb131842c5a6d0 holding the whole task (rounds 1-3), with a plain descriptive title (e.g. "fix: quote channel and workspace names in conversation labels") and a short body. Do this on a NEW local branch `pr/channel-label-framing`, and keep `task-9yjzp-impl` as is (append your round-3 commit there first, then build the squashed branch so its tree is byte-identical: `git diff task-9yjzp-impl pr/channel-label-framing` empty). Then verify in a scratch clone outside the worktree that this single commit cherry-picks onto upstream main anima-research/slack-mcpl 439a81b502388ab3a77b4bbb0e62a380e1b50605 (fetch read-only from https://github.com/anima-research/slack-mcpl.git) with no conflicts, and run npm ci, build, typecheck and the full suite there on both Node versions. Leave the cherry-picked result in the scratch clone only, and report its sha and tree.

Final gates, fresh at the round-3 commit on task-9yjzp-impl through `orgasmic dispatch gate`: npm ci, build, typecheck, full suite on Node 22.23.3; full suite on Node 24.22.1. Base (13692e01) vs final counts.

Report: final sha on task-9yjzp-impl, the squashed commit sha and message on pr/channel-label-framing, the tree-identity check, the upstream cherry-pick result (sha, counts per engine), the fragment verbatim, red/green evidence, counts per engine, what you could not run. Finalize with that report.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-886e00be-f32c-47c3-8865-eadb39969e77, run run-01M61QMVBJMQ6ZBJYHTJ5D8TKX, in your own native session and the same worktree.
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