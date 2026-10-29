TASK-XPP3A: PR A2 of the access-policy chain, the dormant adapter gates.

Context:
- A1 (the pure policy model `src/access-policy.ts` with `parseAccessPolicy`) is upstream PR #55 (head 62a77616, same patch as local 95916c48). You start from 95916c48.
- If you can fetch `62a77616` read-only from the fork remote (`feat/access-policy-model`), rebase your commit onto it and say so. Otherwise stay on 95916c48; the patch is identical.
- The plan is in TASK-57BTX's implementer report (dispatch tx-20261028-theaspirationalslack-55772994-be7e-42a0-b0a9-dc94d673dbb9), section A2 and the decisions. The owner approved all ⭐ recommendations.
- The fork reference implementation is fork main 685b2debff12ed5cfdcae9070ddb131842c5a6d0 (`src/slack-adapter.ts` and the related tests).

Build ONLY A2:
- The Slack adapter accepts an optional internal policy, built through `parseAccessPolicy`. No env var, no CLI, no `startupSettings` and no README row: that is A4.
- With the policy absent, upstream behaviour must be byte-identical. Prove it with tests that show unchanged calls and refusal text for representative paths.
- With the policy present, gate before any Slack effect, as the plan maps it:
  - reads: history, thread, conversation listing and info;
  - writes: send, reply, edit, delete, reactions;
  - channel open and join;
  - the early no-D-ID veto for `send_dm`, as approved;
  - fresh metadata, the identity check, and scope from metadata.
- Attachments are A3; group DMs are G. Leave a clear refusal or no-op for those in policy mode, as the plan says.
- Carry the A1 re-review's LOW-C: make `idList` hole-safe by itself (`Array.from` inside), or inline it, so new callers can't skip the copy. A small change to A1's file is allowed for that only.
- Tests:
  - fresh files, not the fork's `fileAccess.test.ts`;
  - one mock per property per context;
  - no nested `globalThis.fetch` mocks;
  - red/green on a deny matrix (each gated tool denied before any Slack call, counting calls with a stub);
  - at least three mutations of your own.
- Changelog: probably `no-changelog` again, since it is still unreachable. Confirm against CONTRIBUTING.
- No size limit, but report production lines and files. If a gate needs a maintainer-level decision the plan doesn't settle, stop and report the options.

Rules:
- Local only. No push, PR or comment. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with empty user and global configs; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners.
- Every check runs as `orgasmic dispatch gate <name> -- timeout 900 …`.
- One commit on top of A1, default author, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`.

Gates:
- typecheck and build on 22.23.3 and 24.22.1;
- full suite on all three Node versions, against the A1 commit as baseline;
- the new tests 5×;
- changelog check and release dry fold.

Report:
- the sha and diff stat
- a gate map: tool → check → test
- what you ported and changed versus the fork
- gates and residual risk
- a PR body using the template: part 2 of the chain, "depends on #55", inert until A4, footer `🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)`. Put it in a separate `pr-body.md` and quote it at the END of the report, with nothing after it.