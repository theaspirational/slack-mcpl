# Implement fix round — Dispatch Brief
```brief
TASK-R4THE round 2: a small polish of your 8030d418. The opus review approved it; its report is on this task's reviewer dispatch tx-20261029-theaspirationalslack-83b8644b-68ca-4381-a7ff-540bae047a7b. Fix:

1. MEDIUM-1, `src/access-policy.ts:17`. The comment is false: in JS, `$` without the `m` flag already rejects a trailing newline. Switch the three regexes to plain `$`, and delete the claim. The newline tests stay and must still pass.
2. LOW-1. Replace the `asserts` validator with `parseAccessPolicy(value: unknown): SlackAccessPolicyConfig`:
   - read each field exactly once;
   - validate;
   - return a normalized frozen copy with fresh arrays;
   - the constructor consumes the result.
   Add a test with a getter or Proxy config whose values change between reads, proving the stored policy equals the validated values. Show it red on the old code.
3. LOW-2 prep. Express the key check as an explicit required and allowed key-set pair, not `keys.length !== 3`. Behaviour must not change.
4. Add a test pinning `mayWrite('D…')` as a deliberate hint (the reviewer's gap 3), if it is not already pinned.
5. PR body:
   - add one line to Changes: unknown keys and null lists are now rejected, where the fork accepted them;
   - add a note that `dist/src/access-policy.js` is imported by nothing and the package is not published;
   - keep the request for the `no-changelog` label;
   - do not repeat the regex claim.
   - Propose the branch name `feat/access-policy-model`. Don't rename anything locally.

Then:
- Amend into ONE commit on the same parent 7274283f. Rebase if upstream main moved, and say so.
- Default author, same trailer.
- Same rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.
- Gates: typecheck and build on 22.23.3 and 24.22.1, full suite on all three Node versions, the new test file 5×, the changelog check showing the label exemption, and a release dry fold.

Report:
- the sha and diff
- a fix → evidence table
- gates
- the final PR body verbatim
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-b13724e9-fc29-48d8-9307-39cd128e3439, run run-01M636D69JABSMCE913DYDRTZC, in your own native session and the same worktree.
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