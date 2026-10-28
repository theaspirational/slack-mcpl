# Implement fix round — Dispatch Brief
```brief
Round 3 of TASK-38EPN: docs polish and squash. e8c6fe530b71ff4b3778ac5fd10256dfb408f32c was approved. Same rules as before: local only, no push, PR or comment, public-safe text, notifiers off, npm ci with empty config files, Node 24.22.1 scratch verified, loopback guard, `timeout 900` gates.

Preflight: HEAD = e8c6fe53, clean. Fetch upstream main read-only. If it moved past d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34, stop and report.

Do:
1. Operator release note. The reviewer found that `SLACK_BACKSCROLL_LIMIT=0`, or any value whose leading base-10 integer is 0 (`0junk`, `0.5`), used to fall back to 50 and now disables automatic backscroll. Follow upstream's rules in changelog.d/README.md and CONTRIBUTING.md (breaking bullets open with `- **Operators:**` and cover who acts, the migration, and what is unchanged; precedent `changelog.d/15-empty-switches.breaking.md`). Either reclassify the fragment as `zero-backscroll.breaking.md`, or keep `.added.md` and add a sibling `.changed.md`. Choose by the rules, and say which rule decided it. Mention that non-zero values, the default 50 and explicit fetch_history/fetch_thread are unchanged.
2. Update the `SLACK_BACKSCROLL_LIMIT` line in the `src/index.ts` (~:28) env docblock to match README.md:335, with a 0–1000 range and 0 = off. Comment only.
3. README row: "Unset or empty values …" to match the tested behaviour.
4. Squash d3e4f7c9..HEAD into ONE commit on d3e4f7c9 on a new local branch `pr/zero-backscroll`, and leave `task-38epn-impl` as is with the polish commit on top. Commit title "Allow zero automatic backscroll" (or conventional `feat:` if the repo's recent history prefers it; check). Body wrapped at 72: problem, change, the operator note, what is unchanged. Trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`. Default author (it will be re-authored at push). Confirm the tree of `pr/zero-backscroll` equals the tree of task-38epn-impl HEAD.
5. Also draft a PR body (title + body, plain markdown, public-safe) in the report, not in the repo. Mention as a deliberate choice, for the maintainer to decide, that unparseable values still fall back to 50 rather than refusing at startup.

Gates at the squash commit: npm ci, typecheck, build, full suite on Node 22.23.3 and 24.22.1 (expect 588/0); `scripts/release-changelog.mjs` dry fold in scratch; the changelog CI regex check. Report: the shas (polish commit, squash), the tree equality, diff stat, fragment(s) verbatim, gates and the PR body draft.
```

## Round context
Resume round contract: 2. Continues dispatch tx-20261028-theaspirationalslack-01b3e9f4-54e8-4246-887c-b43a40e3be6f, run run-01M623834Z41831GXWAHDEFMQ4, in your own native session and the same worktree.
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