# Implement fix round — Dispatch Brief
```brief
TASK-ZSA2S round 3: polish and restack. Opus approved dfbc6ed1. Its full report is the reviewer dispatch on this task (tx …6cb71feb…); read it.

**Restack:** the group-DM change `ccbbb766614b3c612887d79060c75fc125c9ebcc` (one commit on f6e62835) lands first.
- Rebase your commit onto ccbbb766, so A3 = ONE commit on ccbbb766.
- Preflight: verify ccbbb766's parent is f6e62835.
- Then fix M1 in the merged tree: adapt `test/groupDmAccess.test.ts`'s "real upload tool and rollback file delete" test the way you adapted `test/adapterAccess.test.ts:273-284`. That means an https `files.slack.com` ticket with a fetch mock relaying to loopback, the extra `info` in the method order, and a stubbed `files.info`.
- Also check that file gates inherit group admission: an allowed group with an associated file downloads; an unrelated file is denied; an unnamed group is denied before `files.info`; missing mpim scopes are denied.

**Fixes:**
- **M2:** add `deleteFile` denials for `mode:'tombstone'`, `file_access:'check_file_info'` and `is_external:true`. Show that the reviewer's mutation (`associatedFile` guards → false) is now killed.
- **L1:** move the `FILE_ID` check (and `policyUploads.set`) below `left`, and throw `left(new Error(...), false)`. Add a test.
- **L2:** bound `policyUploads` with insertion-ordered eviction at a fixed cap (e.g. 1000). Mention it in the PR body.
- **L3:** keep the legacy return-shape sentence in the policy `fetch_attachment` description.
- **L5:** for a message entry with `file_access !== 'visible'`, emit the non-downloadable label, not a `fileId`.
- **L6:** add one clause to the rollback reason saying a deletion removes the file from every conversation it is shared in. Legacy wording stays unchanged.
- **L4** (the mode allow-list) and the DM-delete observation: no code change. Add both under "Before activation" in the PR body.

Rules:
- legacy byte-identity A/B against ccbbb766;
- notifiers off; `npm ci --ignore-scripts` with empty configs;
- a loopback-only guard in force;
- gates via `timeout 900 orgasmic dispatch gate`: typecheck and build on two versions, the full suite on 22.23.3, 24.22.1 and 22.12.0, the new tests 5×, the mutations, and the changelog check;
- keep the trailer;
- no push or PR.

Report:
- the sha
- the diff stat against ccbbb766
- fix → evidence
- gates
- a PR body LAST, saying it depends on the group-DM PR (which is on #56). Nothing after it.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261029-theaspirationalslack-813ef70e-55e8-4dc1-9d27-e7f8dc0a8a87, run run-01M63Z04SBAVG1ASB7N77R9E77, in your own native session and the same worktree.
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