TASK-R4THE: PR A1 of the access-policy chain.

First read the plan: TASK-57BTX's implementer report (dispatch tx-20261028-theaspirationalslack-55772994-be7e-42a0-b0a9-dc94d673dbb9, report.md), sections 1–4. The owner approved ALL of its ⭐ recommendations:
- current JSON names
- fork precedence over SLACK_DISABLE_DMS and SLACK_DM_USERS, documented loudly (in A4)
- early no-D-ID veto for send_dm (A2/A4)
- strict unversioned JSON: required core fields, unknown keys rejected, null optional lists rejected, the same validation for embedded and CLI
- group access independent of readJoinedChannels (G)
- new group presentation only in policy mode
- F optional, later
- inert A1–A3, then A4

Build ONLY A1, on current upstream main (fetch read-only; it was 7274283fa719a17328ef8e085336ce25f6f22b08):
- A pure, internal policy model in a new `src/access-policy.ts`, ported from fork main 685b2debff12ed5cfdcae9070ddb131842c5a6d0 `src/access-policy.ts`:
  - ordinary channels and one-to-one DMs only; no groupDms and no fallback yet
  - copied sets; exact uppercase C/G channel and U/W user ids
  - readJoinedChannels, writeChannels, dmUsers
  - scope checks
  - a validation function that implements the strict format above
- Nothing imports it from the adapter, server, config or index. It must not be reachable by operators.
- No README row, since nothing is configurable yet. Add a changelog fragment only if the repo's CI requires one for any src change; otherwise apply the `no-changelog` reasoning in the PR body. Check `changelog.d/README.md` and the CI workflow.
- Tests: a new `test/accessPolicy.test.ts` (fresh, not the fork's file wholesale) covering:
  - the identity, kind, scope and read/write matrix
  - required fields and empty lists
  - U/W ids
  - unknown keys and null rejected
  - duplicates harmless
  - mutation of the input arrays after construction doesn't extend access
  - Red/green, plus two mutations of your own.
  - One mock per property per context.
- Estimated +70–100 production lines in 1 file. If it grows well past that, stop and report why.

Rules:
- Local only. No push, PR or comment. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with empty user and global configs; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners.
- Every check runs as `orgasmic dispatch gate <name> -- timeout 900 …`.
- One commit, default author, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`.

Gates at the final commit:
- typecheck and build on 22.23.3 and 24.22.1
- full suite on all three Node versions, against a baseline on the same upstream sha
- the new test file 5×
- changelog CI check and release dry fold, if applicable

Report:
- the sha and diff stat
- what was ported and what was changed versus the fork, and why
- gates
- residual risk
- a PR body using the repo template: describe the PR as part 1 of a chain, inert until a later PR exposes configuration, and name the follow-ups A2 (adapter gates), A3 (attachments), A4 (opt-in setting) and G (group DMs). Footer `🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)`.