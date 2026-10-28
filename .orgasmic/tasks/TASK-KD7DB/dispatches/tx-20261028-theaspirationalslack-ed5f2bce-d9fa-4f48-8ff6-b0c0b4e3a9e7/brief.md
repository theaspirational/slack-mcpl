# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-KD7DB. Same rules as round 1: local commits on your task branch only, no push, no GitHub comment, no merge, no credentials, public facts only, update notifiers off from the first command, `npm ci --ignore-scripts` from the public registry with two distinct empty user and global npm config files, Node 24.22.1 from the verified scratch install outside the repository (re-verify its checksum).

Preflight: `git rev-parse HEAD` must print ea7a63dfca2d91304072bae5ab3a596fba10ae4e, else stop.

The approving review of ea7a63df found one LOW (treat it as a claim and check it in the source): the auto-subscribe system note at src/server.ts ~1843 still renders a group DM as `#mpdm-…` via channelShown, in the same delivered message that now says `Group DM: …` in the header.

Work, two commits:
1. Production (src/server.ts only, rendering only): give the auto-subscribe note the same kind-aware label as the location header, i.e. for meta.kind === 'group_dm' use `Group DM: ${nameShown(meta.name)}`; keep every other case byte-identical. Factor the three-way label into one small helper shared by the note and the location header if that is clean; if it would change any non-group output, don't. Extend the test at test/accessPolicy.test.ts:547 to assert the note's label for a group DM, and assert that an ordinary channel's auto-subscribe note is unchanged. Show red by reverting the production change (temporary, restored byte-for-byte, `git diff --exit-code -- src`), then green.
2. Tests and README (no production change): add to the test at test/accessPolicy.test.ts:536 the control assertion that an ordinary joined channel is refused in that same readJoinedChannels:false fixture (for example `assert.rejects(h.adapter.fetchHistory('CREAD'), /not a confirmed joined channel/)`, adapting to the fixture). In the README: remove the redundancy between the new LOW-2 sentence and the sentence before it, and say in the fallback paragraph that startup refuses an ID listed in both groupDms and historyMembershipFallbackChannels.

Limits: production changes only in src/server.ts, net about 15 lines at most; stop and report otherwise.

Final gates, fresh at the final commit through `orgasmic dispatch gate`: npm ci, build, typecheck, full suite on Node 22.23.3; full suite on Node 24.22.1. Base (ea7a63df) vs final counts.

Report: final sha, commits, the production diff with file:line, the README text verbatim, red/green evidence, counts per engine, what you could not run. Finalize with that report and a local commit.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-956e7bf7-5eb6-4515-a40f-eb6c2ec4153b, run run-01M61J49Y60E5XJP4HP7Z9N846, in your own native session and the same worktree.
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