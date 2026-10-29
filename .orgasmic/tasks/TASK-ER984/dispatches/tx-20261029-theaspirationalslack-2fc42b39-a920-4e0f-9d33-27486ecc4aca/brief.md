# Implement fix round — Dispatch Brief
```brief
TASK-ER984 round 3: fix the review findings. The review is the latest reviewer dispatch on this task (tx …80d185dc…); read it in full. Amend into ONE commit on 3b1a97ac, keeping the trailer.

**Fixes:**
- **H1** (`slack-adapter.ts:1170`): REMOVE the `inARow < 5` DM-name lookup cap. Restore the base give-up-once behaviour exactly. Add a test that uses the real `REGISTRATION_TRIES` waiter semantics: 3 always-failing DMs, ~10 waits in total, one "Gave up" log, the rest labelled immediately.
- **H2** (`:1056`): the candidate admission retry gets its own per-candidate counter and no longer increments the page-level `limited`. Add a regression test: ≥ `REGISTRATION_TRIES` (use 25) candidates that each fail once and then succeed, with all registered and no GaveUp.
- **MEDIUM, scope:** REMOVE the three 1000-request/page COUNT caps (`listConversations`, `findUsers`, `fetchSlackHistory`) from this PR, along with their docs and changelog claims. KEEP the three cursor-cycle guards, and add LEGACY-mode (no policy) tests for each. Disclose them in the PR body and changelog as a legacy fix ("a repeated pagination cursor now fails instead of looping forever"). Keep the 5-attempt admission bound and the 5-page MPIM members cap (both policy-only).
- **MEDIUM, test:** restore `writeChannels: ['G1']` in `test/fileAccess.test.ts` "real group file upload requires mpim:write…".
- **MEDIUM, PR body:** delete the host OOM and memory-scope sentence. It must not mention OOM, memory scopes, internal tools or private names.

**LOWs:**
- the `index.ts` header notes that the legacy vars are ignored under the policy;
- truncate the echoed bad `SLACK_ACCESS_POLICY` value in refusals (e.g. 200 chars plus a "…(N chars)" note);
- add tests killing the surviving config/entry-layer mutants M2 and M13 if cheap (otherwise say why not);
- fix the docs wording on retry bounds;
- the G-prefix dead config is documentation only.

**MEMORY SAFETY (mandatory):** run every node/npm/test/mutation command inside `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900 orgasmic dispatch gate …`, with `--max-old-space-size=768`. If the scope fails, stop and ask.

**Rules:**
- notifiers off;
- `npm ci --ignore-scripts` with empty configs;
- your loopback guard, proven;
- unset `SLACK_*`.

**Gates:**
- typecheck and build on 22.23.3 and 24.22.1;
- the full suite on 3 Nodes;
- the targeted tests 5×;
- the mutations, including new ones for H1, H2 and the cycle guards;
- legacy byte identity against 3b1a97ac, extended to exercise listing, directory and history paging and the DM-name give-up path;
- the changelog check;
- peak RSS.

**Report:** the sha, the diff stat, fix → evidence, gates, and the PR body LAST.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-d0bdcd1c-5f8e-415b-9414-6d7274dc16a4, run run-01M6450DHWM77JBSNH0X1ZQHBX, in your own native session and the same worktree.
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