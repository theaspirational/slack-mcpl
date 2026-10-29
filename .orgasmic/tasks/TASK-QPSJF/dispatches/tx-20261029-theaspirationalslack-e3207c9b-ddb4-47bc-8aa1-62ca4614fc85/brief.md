# Implement fix round — Dispatch Brief
```brief
TASK-QPSJF polish round. The opus review approved `dc0ad3c7`. The owner chose the small polish below (caps:polish:small, as relayed). Amend the single commit on `81657f195e734c1a43ab5bed9ddffe741630e15d` (parent unchanged, trailer `Co-Authored-By: GPT-6-Astra` kept).

1. **README:** add three rows for `SLACK_CONVERSATION_PAGE_LIMIT`, `SLACK_USER_PAGE_LIMIT` and `SLACK_BACKSCROLL_PAGE_LIMIT` to the canonical `## Environment` table (~`README.md:321-338`). Each row gives the default, the range 1–10000, notes that an invalid value stops startup, and links to the "Bounded pagination" section.
2. **`find_user` zero-match partial** (`src/server.ts` ~881-893): the note becomes the truncation sentence plus the existing matching guidance (the query echo, substring rules, bots and deactivated users excluded, the shorter-part hint). Make the zero-match shapes consistent: `users: []` on both zero-match branches, or on neither. Choose the option that keeps the complete-branch bytes identical to `81657f19`, and state which you chose.
3. **`refresh_channels` order** (`src/server.ts` ~1338-1343): put the truncation arm after the `unnamed.length > 0` arm, as the plan specified. Adjust the test.
4. **Connection-closed refresh branch** (~1313-1321): add a test that pins its current registration-status behaviour. Change nothing unless you find a visible defect.
5. **The PR body:**
   - drop the RSS, memory-scope, old-space and preload sentence (the bullet becomes "Changelog validation passes.");
   - replace the footer with "AI-assisted implementation with GPT-6-Astra.";
   - add the README table note;
   - update the counts.

**Gates:**
- full suites on Node 22.12.0, 22.23.3 and 24.22.1;
- typecheck and build on all three;
- the targeted tests 3×;
- the legacy byte corpus against `81657f19` (must stay exact);
- the changelog check;
- ≥4 mutations on the changed code.

**Safety (mandatory):** run every node/npm/test/mutation command inside `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 orgasmic dispatch gate <name> -- <cmd>`, with `--max-old-space-size=768`. Also:
- notifiers off (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`, audit and fund false);
- `npm ci --ignore-scripts --offline`;
- a loopback-only guard is in force (your own preload, proven);
- `SLACK_*` unset; no push or PR; no private names.

**Report:** sha, diff stat, gates, and the final PR body LAST.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-a27db905-c9db-4eee-9607-45aec8477c72, run run-01M64K55EW133WTY5HH3SERAKR, in your own native session and the same worktree.
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