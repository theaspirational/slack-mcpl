# Changed

**Partial implementation; blocked on case (d).**

- Final local commit: `eb204f8a3450943d1a6d6f6c8e2ec49ea0800f6e`.
- Merge commit: `b5675782c16eb4a496f664cbda1dcb0896ba848e`.
- Preflight verified base `b956350d4e77f09df76240439b3d35d512061899` and fetched PR head `6a1946d072bfcc99d67a837d2fcc6132e677fcf7` using `git fetch origin pull/1/head:pr1-head`.
- Non-fast-forward merge had exactly one conflict: the expected end-of-file hunk in `test/accessPolicy.test.ts`. Kept the complete HEAD block, then the complete PR block, without internal changes. Both were subsequently checked byte-for-byte against their original commits (`scope-check.log`). No production conflict or compilation adjustment.
- Beyond the requested merge, only `test/accessPolicy.test.ts` changed: 73 insertions, 4 deletions, net 69 lines. The fixture gained display-name and readJoinedChannels options. No lockfile changes. Worktree clean; no push, shared-branch merge, GitHub comment, global installation, or Git identity change.

New committed tests (all in `test/accessPolicy.test.ts`):

1. Line 446: hostile group-DM body, display name, attachment name/type cannot forge model-facing sender/role framing under explicit policy. Checks the real server's final push text, including newlines, fake timestamp/sender frames, forged “this bot” label, and system/backscroll tags.
2. Line 485, parameterized: incoming group DM missing `mpim:read` delivers nothing and makes no history/replies call.
3. Line 485, parameterized: the same refusal for missing `mpim:history`.
4. Line 497: recipient routing refuses a listed group DM with `readJoinedChannels:false`. Runs on Node 24; intentionally skipped on Node 22, like the existing routing test.

# Verification Gates

All commands below ran through `orgasmic dispatch gate <name> -- <command>`. Logs named below are relative to `$ORGASMIC_EVIDENCE_DIR`; each wrapper log also identifies its native gate receipt log. Final gates ran afresh at the final commit with a clean worktree.

Update notifiers were disabled from the first command. Both dependency installations used `npm ci --ignore-scripts`, empty separate user/global npm config files, and `https://registry.npmjs.org`; lockfile package URLs use that registry. Neither installation refused.

| Gate | Command | Result | Log |
|---|---|---|---|
| baseline-ci | `npm ci --ignore-scripts` | Pass | `baseline-ci.log` |
| baseline-build | `npm run build` | Pass | `baseline-build.log` |
| baseline-typecheck | `npm run typecheck` | Pass | `baseline-typecheck.log` |
| baseline-test-confirmed | `npm test` | Pass | `baseline-test-confirmed.log` |
| final-ci-22 | `npm ci --ignore-scripts` | Pass | `final-ci-22.log` |
| final-build-22 | `npm run build` | Pass | `final-build-22.log` |
| final-typecheck-22 | `npm run typecheck` | Pass | `final-typecheck-22.log` |
| final-test-22 | `npm run test` | Pass | `final-test-22.log` |
| final-routing-24 | `$NODE24 --import tsx --test --test-reporter=tap test/accessPolicy.test.ts test/recipientRouting.test.ts` | Pass | `final-routing-24.log` |
| final-test-24 | `$NODE24 --import tsx --test --test-reporter=tap test/*.test.ts` | Pass | `final-test-24.log` |

`$NODE24` denotes the verified scratch installation's executable, not a global installation. No Node 24 executable was on PATH. Downloaded official **Node v24.22.1 Linux x64** from `https://nodejs.org/dist/latest-v24.x/`, outside the repository, and checked its tarball against the published `SHASUMS256.txt`:

`6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`

Evidence: `node24-checksum.txt`.

## Base versus final

| Revision / engine / scope | Total | Pass | Fail | Skip |
|---|---:|---:|---:|---:|
| Base / Node 22.23.3 / full suite | 793 | 768 | 0 | 25 |
| Final / Node 22.23.3 / full suite | 816 | 789 | 0 | 27 |
| Difference on Node 22 | +23 | +21 | 0 | +2 |
| Final / Node 24.22.1 / routing files | 73 | 73 | 0 | 0 |
| Final / Node 24.22.1 / full suite | 816 | 816 | 0 | 0 |

The PR adds 19 tests; the follow-up adds four test instances covering cases (a), (b), and (c). The two additional Node 22 skips are the PR's group-DM routing test and the new routing denial test. No base failures or final-suite failures. No cancelled or todo tests.

## Red/green evidence

Each row used one temporary production edit, ran the targeted test through a gate, restored the original bytes in a `finally` block, verified `git diff --exit-code -- src`, then reran the test green. No mutant was committed. Each red result was **0 pass / 1 fail**, exit 1; each restored green result was **1 pass / 0 fail**, exit 0, with no skips.

| Case / engine | Temporary weakening | Observed failure | Logs |
|---|---|---|---|
| (a) body / 22 | `src/framing.ts:24`: return raw text instead of indenting/escaping | Forged sender and role frames reached the margin | `red-body.log`, `green-body.log` |
| (a) names / 22 | `src/framing.ts:50`: return raw name instead of guarded quoting | Author no longer safely quoted | `red-name.log`, `green-name.log` |
| (a) MIME / 22 | `src/framing.ts:58`: return raw MIME instead of guarded quoting | Attachment note gained a forged third line | `red-mime.log`, `green-mime.log` |
| (b) read / 22 | Remove `mpim:read` check at `src/access-policy.ts:83` | Received `['CGROUP']`, expected `[]` | `red-mpim-read.log`, `green-mpim-read.log` |
| (b) history / 22 | `src/slack-adapter.ts:1172`: require granted `groups:history` instead of missing `mpim:history` | Received `['CGROUP']`, expected `[]` | `red-mpim-history.log`, `green-mpim-history.log` |
| (c) routing / 24 | Remove readJoinedChannels condition at `src/recipient-routing.ts:169` | Received `['CGROUP']`, expected `[]` | `red-routing.log`, `green-routing.log` |

Case (a) spans several framing guards rather than one guard for every field; three independent one-line bypasses were tested. Commands were `node --import tsx --test --test-reporter=tap --test-name-pattern=<target> test/accessPolicy.test.ts`, using the verified Node 24 executable for routing. Exact patterns and edits are retained in `mutations.py`; restoration results are in `mutations.log`. Gate names match the red/green log stems.

# Unmet Criteria

**Case (d): refusal before EVERY Slack call is not implemented by the merged production code.** Two temporary tests on unmodified production confirmed this, using malformed `\ud800x` in a group-DM reply:

- Missing `chat:write`: the expected scope refusal occurs, but calls are `[{method:'info', args:{channel:'CGROUP'}}]`, not `[]`.
- Unlisted destination: the expected unsupported-destination refusal occurs, but calls are `[{method:'info', args:{channel:'COTHERGROUP'}}]`, not `[]`.

Both refuse before malformed-text validation and before posting; neither refuses before the metadata lookup. `sendMessage` invokes authorization at `src/slack-adapter.ts:1438`, before text validation at line 1439. However, `requireWritableConversation` calls `readAccessConversation` at line 1187, and that performs `conversations.info` at line 1152 before checking the policy/scope.

Gate `write-preflight-finding`: **2 tests, 0 pass, 2 fail, 0 skip**, exit 1. Evidence: `write-preflight-finding.log`; reproducer suffix: `write-preflight-cases.ts` (append temporarily to the committed test file and use `--test-name-pattern='group DM write preflight'`). These failing cases were removed from the commit as required. No production fix or mutation experiment for case (d) was attempted after this finding. Meeting that criterion would require an out-of-scope production change or a revised requirement.

All requested engine checks were feasible and ran. Node 24 baseline, build, and typecheck were not requested and were not run. The final Node 24 full suite did run.

# Residual Risk

- Assignment remains blocked on case (d), despite green committed suites. A green suite does not establish the missing no-Slack-call preflight property.
- Both npm installations reported two high-severity dependency vulnerabilities. No dependency remediation was attempted because it is outside scope; the lockfile remains unchanged.
- An initial baseline test overlapped a preliminary merge attempt and therefore produced a dirty receipt. That merge was aborted and the full baseline test rerun at the clean base; only `baseline-test-confirmed` supports the baseline claim. The subsequent merge was completed after that rerun.
- Required merge source/documentation changes are inherited from PR #1; the follow-up commit is tests-only. No matching additional conventions/gotchas were supplied, and no repository AGENTS.md was present.
