# Implement fix round — Dispatch Brief
```brief
TASK-QPSJF implementation. The owner chose ALL ⭐ recommendations of your plan (caps:recs:all, as relayed). That includes labelling the existing 25-match `find_user` stop and the message-limit backscroll truncation as incomplete.

Base: exactly `81657f195e734c1a43ab5bed9ddffe741630e15d` (#60). Preflight with `git rev-parse HEAD`. Make one commit with the trailer `Co-Authored-By: GPT-6-Astra`.

Implement the plan as written:
- the three page settings (1000/1000/100, strict 1–10000 parse, refusal without echo);
- truncate-not-throw, with the partial-only signals on `list_channels`, `find_user`, history/backscroll, background registration status and `refresh_channels`;
- the cycle-guard precedence;
- per-candidate retries and the MPIM cap unchanged;
- incomplete-only branches, so complete results are byte-identical below all limits;
- docs and the changelog fragment `changelog.d/bounded-pagination.fixed.md`.
Run the red/green plan steps 1–10 and the mutation plan. If production code clearly exceeds ~400 lines, stop and propose a split.

**MEMORY SAFETY (mandatory):** run every node/npm/test/mutation command inside `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 orgasmic dispatch gate <name> -- <cmd>`, with `--max-old-space-size=768`. Fixtures must have hard emergency request ceilings, so that no test can page forever. If the scope fails, stop and ask.

**Rules:**
- notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`, audit and fund false);
- `npm ci --ignore-scripts` with empty npm configs;
- your own loopback-only preload guard, proven by probes;
- unset `SLACK_*`; no real credentials;
- no push or PR; no private names in public text.

**Gates:**
- typecheck and build on 22.23.3 and 24.22.1;
- the full suite on 3 Nodes (base 897);
- the targeted tests 5×;
- the mutations;
- the legacy differential byte corpus against `81657f19`;
- the changelog check;
- peak RSS.

**Report:** sha, diff stat, decision → evidence, gates, residual risk, and the public PR body LAST, saying it depends on #60.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-db4d0f8c-db10-4093-9492-cde869948821, run run-01M64J10V0A94VV0TKMQG0BJMF, in your own native session and the same worktree.
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
Blocking decision: `orgasmic dispatch ask "<question>"`; keep it alive for the stdout answer. A timeout is not permission. With `--no-wait`, Codex app-server accepts answers/messages mid-turn; other multi-turn harnesses receive them at turn boundaries or finalize. If finalize refuses for pending messages, handle their full text and retry. Successful finalize is terminal; no work follows it. Never disclose credentials or the run token.