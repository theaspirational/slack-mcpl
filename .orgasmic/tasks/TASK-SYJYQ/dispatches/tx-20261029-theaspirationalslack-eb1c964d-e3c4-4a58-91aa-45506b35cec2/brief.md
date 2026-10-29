TASK-SYJYQ round 2. You are a fresh worker. The previous run's Step 0 report is on this task's earlier dispatch (tx-20261028-theaspirationalslack-3f31ae6a-bd67-4ce9-8b6f-4ce88cc599d5, report.md); read it first.

Goal: rebuild our open upstream PR anima-research/slack-mcpl#31 (upload files by local path; head ddf92124e5f120b0576f66c9f989ca13ee9d74b4) on current upstream main. The owner chose option A: #31's own design.

Scope decisions:
- No size or file limit. ~400–440 net production lines in about 8 files is accepted.
- Keep #31's design: multi-root, aliases, the isolated Python 3.9+ reader for Linux and macOS (Windows refused), the configurable `maxBytes`.
- Keep the unrestricted mode only as #31 has it: an explicit opt-in, never a default. Document it plainly in README and the PR body, and list it as a point a maintainer may want to drop.

Required adaptations:
- Move policy parsing and refusals into upstream's `startupSettings` (`src/config.ts`), with clean refusals before any Slack contact, no raw values or outside paths echoed, and no duplicate inline env block in `src/index.ts`. The one textual conflict is there.
- Preserve upstream's newer sender framing, timing, inline validation, rollback and three-step upload.
- A new changelog fragment matching the behaviour, and README rows.
- Tests:
  - Adapt `test/uploadPath.test.ts` and `test/pathUploads.test.ts` to current startup and the one-process runner. Use only temp dirs you create: no `/dev/null` reads and no broad temp-root probes.
  - One mock per property per test context. Do NOT bring the fork's `fileAccess.test.ts`; its nested fetch mock leaks.
  - Add the startupSettings refusal tests.
  - Red/green, plus two mutations of your own (containment and the byte cap).

Rules:
- Local only. No push, no PR edit, no GitHub comment. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with two empty npm configs outside the repo; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners (`NODE_OPTIONS=--require=<guard>`).
- Gates run with `orgasmic dispatch gate <name> -- timeout 900 …`.
- Start from current upstream main (fetch read-only; it was ca8f6b1193154384e4626921255f86923fc5edf3), not the worktree's fork head.
- One commit, default author, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`.

Gates at the final commit:
- npm ci, typecheck and build on 22.23.3 and 24.22.1
- full suite on 22.23.3, 24.22.1 and 22.12.0, against a baseline on the same upstream sha
- the new test files 5×
- release dry fold and the changelog CI regex

Report:
- the sha and diff stat
- the fragment verbatim
- a #31 point → treatment table
- gates
- residual risk
- a replacement PR body for #31, using the PR template checklist and footer `🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)`
- a short comment for #31 explaining the rebuild, with no internal labels or unpushed shas.