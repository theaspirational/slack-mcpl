# Implement fix round — Dispatch Brief
```brief
Round 2 of TASK-E40F7: polish and squash. Your c1c09cd8 was approved by opus review, which raised one MEDIUM and several LOWs. Same rules as round 1: local only, no push/PR/comment, public-safe, notifiers off, npm ci with empty configs, Node 24.22.1 scratch verified, loopback guard, `timeout 900` gates.

Preflight: HEAD = c1c09cd8, clean. Fetch upstream main read-only. If it moved past d3e4f7c9, rebase onto it and say so.

Do:
1. MEDIUM, docs. The README row (README.md:332), the changelog fragment and the PR body list only automatic backscroll and MCPL `channels/publish` as unaffected. Replace that with the general rule: only the agent's tool surface is affected; server-initiated and host-driven Slack calls (automatic backscroll, ack reactions, MCPL `channels/publish`, `state/rollback`) are not. Add one small test that pins it: with `add_reaction`/`delete_message` disabled, the ack reaction still posts and a host rollback still deletes. Use the existing fakes, with no nested same-property mocks.
2. `src/server.ts:259`: the constructor's throw names the tool, `Unknown disabled tool: ${JSON.stringify(name)}`. Update its test.
3. `src/index.ts` startup log line: append the effective disabled set, e.g. `; tools off: a, b` or `none`. Match the existing line's style.
4. Tests: move the CLI refusal test next to its sibling in `test/cli.test.ts`, reusing or extending its `startWith()` helper. Hermetic Slack mocking is fine if the helper gains an option. Collapse the duplicated child bootstraps into one shared helper. Use the house 30 s spawn timeout.
5. README: an example value, e.g. `SLACK_DISABLED_TOOLS=subscribe_channel,unsubscribe_channel`.
6. Optional, your call with reasons: report all unknown names in one refusal instead of only the first.
7. Squash onto upstream main as ONE commit on a new local branch `pr/disabled-tools`. Leave `task-e40f7-impl` with the polish commit on top. Tree equality between the two. Title "Add operator setting to disable tools" or similar plain title, body wrapped at 72, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`, default author.
8. PR body draft in the report: the general exemption rule, the CONTRIBUTING AI footer "🤖 Generated with GPT-6-Astra" or the equivalent CONTRIBUTING asks for (quote the rule you followed), and drop the Node 22.12.0 caveat if you run the new tests on 22.12.0 (checksum-verified scratch, like 24.22.1).

Evidence: red/green for the new exemption test and the constructor message; fresh full suite at the squash on Node 22.23.3 and 24.22.1 (expect 593 + new); 22.12.0 for config/operatorControls/cli; release dry fold; changelog CI regex. Report the shas, tree equality, diff stat, fragment verbatim, gates and the PR body.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-ddd2d6b1-92c3-4c44-95d8-031126b1ea11, run run-01M6252D4HQDRXSYTPBZWKD5SF, in your own native session and the same worktree.
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