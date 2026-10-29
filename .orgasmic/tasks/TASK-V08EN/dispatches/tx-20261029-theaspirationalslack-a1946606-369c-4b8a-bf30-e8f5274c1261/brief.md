# Implement fix round — Dispatch Brief
```brief
TASK-V08EN round 2: fix your 9b43671e per the opus review on this task's reviewer dispatch tx-20261029-theaspirationalslack-a0e6c4da-dbc9-4593-80e4-2a873c5d4dfe. Read all of it; it has probes, line numbers and fix directions.

Fix all of these:
1. MEDIUM-1: a manual `remove_reaction` that joins an already-running automatic ACK cleanup must not report `no_reaction` as an error. After `await entry.removing`, re-read the map. If the cleanup removed it, return a success-shaped "Nothing changed: …", like `add_reaction`'s `already_reacted`, with no second Slack call. Red test first: automatic cleanup starts first, then manual removal joins.
2. MEDIUM-2: `own`. Emit `own: true` only when found. When the bot isn't in a truncated list (`users.length < count`), don't assert false: omit `own` or mark it unknown. Pick one and document it. Fix the fixture at `test/reactions.test.ts:26/:35`.
3. MEDIUM-3: tests that kill the reviewer's three surviving mutants: the join await, `clearTimeout`, and the re-arm after failure. Use timer-driven cleanup, not only an explicit `clearAck`.
4. MEDIUM-4:
   - Extend the `fetch_history` and `fetch_thread` tool descriptions with one sentence on the `reactions`, `reactionsOmitted` and `own` fields and the caveat.
   - Fix `remove_reaction`'s `messageId` wording ("to remove the reaction from").
   - Relax the schema-equality test to compare `required` and property names.
5. LOW-5: validate Slack's shape. `Array.isArray(reactions)`; skip non-object entries; string `name`; safe-integer `count`, otherwise omit it; `Array.isArray(users)` before `includes`. Add tests, including a string `users`.
6. LOW-6: the manual failure path follows `removeAck`'s rules: increment `tries`, and drop instead of re-arming on refused-for-good, stopping, or `tries >= ACK_MAX_TRIES`. Add tests.

Then:
- Update the PR body and the changelog fragment where the behaviour changed.
- Amend to ONE commit on 7274283f (refetch upstream main; if it moved, rebase and report).
- Same rules: notifiers off, `npm ci --ignore-scripts` with empty configs, a loopback-only guard in force, `orgasmic dispatch gate` under `timeout 900`.
- Gates: typecheck and build on 22.23.3 and 24.22.1, full suite on all three Node versions, the new tests 5×, the changelog check, plus your re-run of the reviewer's 3 surviving mutants, now killed.

Report:
- the sha
- a fix → evidence table
- gates
- the PR body LAST, from `pr-body.md`, with nothing after it
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-81d2583e-1316-4320-ac57-0cf245baec94, run run-01M63HJ2QJP0J6AYD9X5XRP1DD, in your own native session and the same worktree.
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