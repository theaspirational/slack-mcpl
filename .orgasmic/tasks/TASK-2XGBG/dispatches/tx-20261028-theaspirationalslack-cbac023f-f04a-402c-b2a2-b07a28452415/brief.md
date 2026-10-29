# Implement fix round — Dispatch Brief
```brief
Round 4 of TASK-2XGBG: tests and docs only. Your 85c41a5c was APPROVED by the final opus review, with no blockers. Close its LOWs, change no production behaviour. Same rules as before:
- Local only, public-safe, notifiers off.
- Empty npm configs; Node 24.22.1 and 22.12.0 in scratch, verified.
- A loopback-only guard is in force for test listeners.
- Run gates with `timeout 900`.
- No nested same-property mocks.

Preflight: HEAD = 85c41a5c, clean. Fetch upstream main read-only. If it moved past ca8f6b11, rebase onto it and say so.

The reviewer's probes are under dispatch tx-20261028-theaspirationalslack-e4f97100-7fa2-4012-860c-54fe6620a174, in evidence/probes/ (`zz-r3-new.test.ts`, `zz-r3-m7.test.ts`) and evidence/mutations/ (M7.py, M12.py).

1. Add a test that an uncertain failure keeps ownership: set, reject with `ratelimited`, `statusOn` still holds 1.0, then `resetThreadStatuses()` issues the `'C1:1.0:'` clear. Use the ratelimited row of the reviewer's P9. Show that M12 is now caught.
2. Add the reviewer's P14 (the `statusRefused.clear()` ordering in `resetThreadStatuses`). Show that M7 is now caught.
3. README:43-44: append that a failed clear is not retried, so that status stays until Slack expires it.
4. Draft reviewer reply and PR body:
   - Drop the internal probe labels P1, P2 and P7, and the unpushed shas be7c3af1 and 17275b84. Use the reviewer's replacement wording, which refers to "the first version of this branch" and "the previous draft".
   - Committed test names are fine.
   - The footer is `🤖 Generated with [Codex](https://openai.com/codex)`, and must name the same model as the commit trailer (GPT-6-Astra), e.g. "…with Codex (GPT-6-Astra)".
   - Restore the PR template's checklist wording and `---` separator from `.github/PULL_REQUEST_TEMPLATE.md`.
   - Update all counts.

Amend into ONE commit, default author, same trailer. Production `src/` must stay byte-identical to 85c41a5c; show `git diff 85c41a5c -- src` as empty.

Gates at the final commit:
- typecheck on Node 22.23.3 and 24.22.1
- full suite on 22.23.3, 24.22.1 and 22.12.0
- threadStatus ×5
- changelog CI regex and release fold

Report: the sha, a fix → test table, gates, and the final reply and PR body verbatim.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-3c0c0453-461a-4c1f-839d-bdd05bf22043, run run-01M62B248SGPT8XN16P3E6YWMZ, in your own native session and the same worktree.
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