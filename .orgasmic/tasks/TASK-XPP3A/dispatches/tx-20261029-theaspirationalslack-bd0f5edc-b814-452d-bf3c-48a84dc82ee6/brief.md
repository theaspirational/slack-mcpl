# Implement fix round — Dispatch Brief
```brief
TASK-XPP3A round 2: polish your 8296d58e. The opus review approved it with no HIGH. Its report is on this task's reviewer dispatch tx-20261029-theaspirationalslack-92579a00-d54a-460f-bedb-d7bad5e5e94e. Fix:

1. M1 (no code change). In the PR body, state plainly that `fetch_attachment` is NOT gated by the policy yet. Activation must not land before attachment enforcement; say that in plain words, not chain labels.
2. M2 (docs, no behaviour change). In the `SlackAccessPolicy` doc comment and the PR body, state that `find_user` is gated only on `users:read` and returns the whole workspace directory, so the user directory is outside the policy's confinement. Leave the filtering decision to the later activation PR. Mention it as an open question in the PR body.
3. M3 (no code change). Add one line to the PR body's Not verified or Out of scope section: fresh admission adds one `conversations.info` per listing candidate, inbound event and read or write, with no cache. Whether a short TTL cache or a call budget is needed is open, for activation.
4. L4. Under a policy, `dmsDisabled` should follow the fork: return `!dmsWritable`, so the tool description at `server.ts:1345` stays correct. Add a test.
5. L5. Mock `console.error` in the new tests, so there is no stderr noise. In the PR body, note that activation should pass the policy at construction, so the startup scope diagnostic is policy-aware.
6. L7. Add a comment at the `deleteFile` gate recording that it relies on the caller's `(channelId, fileId)` pairing from its own upload.
7. L6 and L8. Reword the PR body:
   - "make the ID-list predicate hole-safe for future callers (behaviour-neutral today)";
   - replace A3, A4 and G with plain language: "a later PR adds attachment enforcement", "a later PR adds the opt-in setting", "group DMs come later";
   - keep "depends on #55".

Then:
- Amend into ONE commit on 62a77616.
- Same rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.
- Gates: typecheck and build on 22.23.3 and 24.22.1, full suite on all three Node versions, the new tests 5×, changelog check, release fold.

Report:
- the sha
- a fix → evidence table
- gates
- the final PR body, last in the report, from `pr-body.md`, with nothing after it
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-71b232d8-77c5-41b6-8ce8-a515bdbd9ddf, run run-01M639D46CVXRPX3G7GZYWM6X7, in your own native session and the same worktree.
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