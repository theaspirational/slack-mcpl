# Implement fix round — Dispatch Brief
```brief
Round 3 of TASK-2XGBG: the final polish. Your 17275b84 was APPROVED by the opus re-review, with three LOWs. Same rules as before:
- Local only, public-safe, notifiers off.
- npm ci with empty configs; Node 24.22.1 and 22.12.0 in scratch, verified.
- A loopback-only guard is in force for test listeners.
- Run gates with `timeout 900`.
- No nested same-property mocks.

Preflight: HEAD = 17275b84, clean. Fetch upstream main read-only. If it moved past ca8f6b11, rebase onto it and say so.

The reviewer's probes are under its dispatch tx-20261028-theaspirationalslack-247bc265-258d-427f-b079-fdce6cac1c24, in evidence `probes/zz-r2.test.ts` (P1–P8).

Fix:
1. LOW 1, `src/slack-adapter.ts:1203`. Don't record a clear's refusal into `statusRefused`; only sets should be recorded, e.g. `if (status && epoch === this.statusEpoch && refusedForGood(err))`. That keeps README:44 and the fragment's "until the peer changes" literally true. It should also remove the pointless teardown clear for a set Slack refused; say whether it does. Widen `test/threadStatus.test.ts:386` so the injected refusal also applies to the clear, and add the reviewer's P2/P7 shape. Red before, green after.
2. LOW 2: pin `callStatus`'s `instanceof` read. Add the reviewer's P1 (a non-Error rejection, after which a retry is still allowed). Red with the old `(err as Error).message` line, green now.
3. LOW 3, draft reviewer reply: "five new regression cases fail on be7c3af1", with the epoch-guard mutation described separately. Recount after this round.
4. Optional: re-wrap the fragment evenly (line 6).

Keep ONE commit on upstream main (amend), default author, same trailer.

Gates at the final commit:
- npm ci, typecheck and build on Node 22.23.3 and 24.22.1
- full suite on 22.23.3, 24.22.1 AND 22.12.0 (CI's suite row), baseline 584
- threadStatus tests 5× repeated
- release dry fold and changelog CI regex

Report: the sha, diff stat, fragment verbatim, a fix → test table, gates, and the final draft reviewer reply and PR body (counts updated). The PR body goes into upstream PR #12 itself, which already exists, so write it as a replacement body for #12. The reply goes on #12 as a comment.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-98e6bae4-7180-43e7-b48a-1435c2c1ece0, run run-01M6295DXN3J7NVE4K128BQXK1, in your own native session and the same worktree.
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