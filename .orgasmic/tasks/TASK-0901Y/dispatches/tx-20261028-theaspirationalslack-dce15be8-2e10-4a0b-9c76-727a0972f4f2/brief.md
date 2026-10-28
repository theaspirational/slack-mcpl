# Implement fix round — Dispatch Brief
```brief
Fix round 2 for TASK-0901Y (public repo/ledger: public technical facts only).
Review 1 REJECTED e616fe861d14c73618d3bb7513183ec6ffa9ec01 with one MEDIUM:
src/slack-adapter.ts:1616-1621 - explicit-policy sendDM checks only im:write before assertSendable; chat:write (and the im:read prerequisite) are checked later via requireWritableConversation after conversations.open. With an allowed peer, im:read/im:write granted and chat:write missing, malformed text returns the lone-surrogate refusal instead of the fork parent's "Slack access requires granted scope chat:write". Reviewer probes: run-01M61925GNJ8PDCXW7614NMTMJ evidence adversarial-probe.mjs (4th test) and dm-parent-comparison.mjs.

Fix: preflight all locally knowable required explicit-DM scopes (chat:write, im:write, im:read prerequisite) before assertSendable and before conversations.open, matching the fork parent's refusal text; keep the post-open fresh access/exact-peer checks. Add regression tests: missing-scope + malformed text for explicit-policy DMs (each missing scope), asserting the scope refusal and zero open/post calls. Show red on e616fe86 and green after.
Make this a NEW commit on top of the merge commit (do not amend the merge). Rerun: build, full npm test (Node 22) and the Node 24 full suite, plus the reviewer's two probes. Report counts. No push.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-a8006b2c-bc7d-4eaf-9a22-f7299233bc01, run run-01M618AXR5KZJTWNW7HNHPNF0Z, in your own native session and the same worktree.
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