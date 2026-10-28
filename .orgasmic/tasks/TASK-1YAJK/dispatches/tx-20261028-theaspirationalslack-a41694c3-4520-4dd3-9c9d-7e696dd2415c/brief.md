# Implement fix round — Dispatch Brief
```brief
Round 2. Same rules as round 1 (local commits only; no push, GitHub comment or merge; tests only, no production change; public facts only in the report; gates through `orgasmic dispatch gate`, fresh at the final commit).

Preflight: `git rev-parse HEAD` must print eb204f8a3450943d1a6d6f6c8e2ec49ea0800f6e. If not, stop.

Correction to case (d). Round 1 stopped because I wrote 'refused before any Slack call'. That went beyond the owner's requirement, which is: a group-DM send or reply without the write scope, or to an unlisted destination, is refused BEFORE malformed-text validation. Your finding is accepted as a finding, not a failure: the merged code does a metadata lookup (conversations.info) before it refuses. Do not change production code for it.

New case (d), tests only. For both sub-cases (missing chat:write scope; unlisted destination), send a group-DM reply with malformed text (e.g. a lone surrogate) and assert: (1) the error is the scope or unsupported-destination refusal, NOT the malformed-text error; (2) no write or post call is made (no chat.postMessage or other mutating Slack method); (3) the only Slack call allowed, if any, is the single read-only metadata lookup. Do not assert an empty call list. In a comment inside the test, say plainly that the metadata lookup before refusal is current behaviour and is not pinned as a requirement.

Red evidence for (d), same method as before (one temporary production edit, run the targeted test through a gate, restore bytes in a finally block, verify `git diff --exit-code -- src`, rerun green; never commit a mutant): (i) swap the order so text validation runs before the authorization call at src/slack-adapter.ts around lines 1438-1439: the malformed-text error must appear and the test must fail; (ii) remove the write-scope requirement in the group-DM write policy (src/access-policy.ts, near lines 107-110): the scope case must fail; (iii) remove the destination check for an unlisted group: the destination case must fail. If one of these cannot be made red with a single-line edit, say so and describe what you did.

Final verification at the final commit, fresh: `npm ci --ignore-scripts`, build, typecheck and the full suite on Node 22.23.3; the full suite and the routing files on Node 24 (reuse the verified Node 24.22.1 installation from round 1 if it is still on disk and its checksum still matches; otherwise download and verify again). Re-run the baseline suite on b956350d only if round 1's confirmed baseline gate is not recorded as complete; otherwise cite it. Report the base-vs-final table again with the new counts.

Report: the final commit sha, the new (d) tests with line numbers, red and green evidence for (i)-(iii), counts per engine, the base-vs-final table, and what you could not run. Also state in one sentence what exactly the production code does between the authorization call and the refusal (which Slack method, in which function) so the owner can decide separately whether it needs a code change. Finalize with that report and a local commit.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-8c3bac8f-4445-4ec7-918e-6afa4cc0c5c4, run run-01M61BNAV1TM73KGTQEED5GNYY, in your own native session and the same worktree.
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