# TASK-R4THE — A1 internal access-policy model

## Changed

- Commit: **`8030d418cbaed0f55f015c2516eb5e7132b4cd35`**; exactly one commit over freshly fetched upstream main **`7274283fa719a17328ef8e085336ce25f6f22b08`**. Upstream was fetched again after the gates and remained unchanged. Default author retained; required `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer included.
- Diff: **2 files, 297 insertions**: `src/access-policy.ts` **+88** production lines; `test/accessPolicy.test.ts` **+209** lines. `change.patch` holds the complete patch. Working tree clean.
- Pure, internal model only. No adapter/server/config/index imports, installation surface, README row, settings, package/lockfile changes, generated tracked files, group admission, or fallback.
- New tests are fresh and use no mocks, avoiding nested mock ownership entirely.

### Port versus fork

Source: fork `685b2debff12ed5cfdcae9070ddb131842c5a6d0:src/access-policy.ts`.

Preserved: config names; snapshots into sets; readJoinedChannels; exact C/G write pins and U/W DM peers; boolean kind and membership checks; exact returned conversation identity; ordinary-channel read scopes selected by metadata rather than prefix; DM scope/peer checks; write admission requires readability plus exact non-DM pin plus effect scope; dmsWritable/mayWrite are configuration hints only. The caller must obtain fresh metadata; the model performs no I/O.

Changed intentionally:
- Removed groupDms, group admission/getter and history fallback configuration/proof/helpers. A1 rejects those keys, including null/empty values, rather than silently reserving future options.
- Added `validateAccessPolicy(unknown)` and called it from construction, establishing one strict boundary for future embedded and JSON callers. Required own core fields, non-object/array/null inputs, unknown keys, invalid types and invalid IDs are rejected. No parser/CLI wiring is introduced. There are **no optional lists in A1**; G/F must extend this same validator and retain null rejection when adding theirs.
- Exact ID matching uses an absolute end assertion instead of JavaScript `$`, which admits a final line terminator. Tests cover newline/whitespace rejection. Array iteration also rejects sparse input arrays instead of silently skipping holes in embedded callers.
- Replaced the fork's broad integrated test file with 12 pure tests covering identity/kind, scope and read/write matrices, required/empty fields, U/W IDs, malformed/unknown/null inputs, duplicates, snapshots, and inert hints.

Read references: TASK-57BTX implementer report sections 1–4 at `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/tasks/TASK-57BTX/dispatches/tx-20261028-theaspirationalslack-55772994-be7e-42a0-b0a9-dc94d673dbb9/report.md`; supplied project.org; CONTRIBUTING.md; changelog.d/README.md; CI/changelog workflows; `.github/PULL_REQUEST_TEMPLATE.md`; orgasmic skill and command-ownership page. No applicable AGENTS.md or additional conventions/gotchas were supplied/found.

### Changelog decision

No fragment: CONTRIBUTING.md exempts internal-only work, and `.github/workflows/changelog.yml` skips its job for the `no-changelog` label. The local check explicitly reproduced the **unlabelled exit 1**, then verified the exemption condition; this is **not** a claim of an unlabelled CI pass. Request the label in the future PR body. No label, PR, push, or comment was made. A scratch-only release dry fold still succeeded on the 33 existing fragments.

## Verification Gates

All dependency installs, application checks, mutation runs and final-commit checks used `orgasmic dispatch gate <name> -- timeout 900 …`. Full gate logs and executable reproduction scripts are in this evidence directory. No receipts from another dispatch were reused.

Environment: `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` set from the first command. Node 22.23.3 at `/opt/node/bin/node`; 24.22.1 and 22.12.0 downloaded to scratch and checked with `sha256sum -c` against `https://nodejs.org/dist/v<VERSION>/SHASUMS256.txt`. Copies of official checksum files are retained here. Both baseline and worktree installs used `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, empty user/global npm configs, and audit/fund disabled. `scratch-location` identifies disposable runtimes/baseline/build data outside evidence.

Every test run inherited `NODE_OPTIONS=--require=<evidence>/loopback.cjs`, including child processes that inherit NODE_OPTIONS. The guard rejects unspecified/non-loopback listen hosts; its refusal and successful explicit-loopback path were separately probed. No test changes to legacy harnesses were needed.

| Gate(s) | Command / result |
| --- | --- |
| runtime-install | Official runtime checksums pass; restricted `npm ci` succeeds in both trees (51 packages each). |
| baseline-22.23.3 / baseline-24.22.1 / baseline-22.12.0 | `bash <evidence>/run-suite.sh baseline <version>` → `npm test`: **583 pass / 0 fail** each; 0 skip/cancel. Baseline is a `git archive` of the upstream SHA; final-provenance verified all 115 tracked files still match it byte-for-byte. |
| red-policy | `node --import tsx --test --experimental-test-isolation=none test/accessPolicy.test.ts`: expected **0 pass / 1 fail**, missing module before implementation. This is import-level red, not a behavioral failure claim. |
| green-policy / restored-green | Same command: **12 pass / 0 fail** before/after mutations. |
| mutation-identity | `python3 <evidence>/mutate.py identity`: remove metadata-ID comparison → **10 pass / 2 fail**, identity tests catch it. Wrapper succeeds only when mutant tests exit 1. |
| mutation-live-dm-list | `python3 <evidence>/mutate.py live-dm-list`: replace copied DM set with live array view → **11 pass / 1 fail**, snapshot test catches it. Both mutants restored in finally blocks; neither committed. |
| final-typecheck-22.23.3 / final-typecheck-24.22.1 | `npm run typecheck` with respective Node on PATH: pass. |
| final-build-22.23.3 / final-build-24.22.1 | `npm run build` with respective Node on PATH: pass. |
| final-suite-22.23.3 / final-suite-24.22.1 / final-suite-22.12.0 | `bash <evidence>/run-suite.sh final <version>` → `npm test`: **595 pass / 0 fail** each; 0 skip/cancel. Uses unchanged `--experimental-test-isolation=none` package script. |
| final-policy-1 through final-policy-5 | New test file on 22.23.3 with one-process flag: **12 pass / 0 fail each**. |
| final-changelog-policy | `python3 <evidence>/changelog-check.py`: exact workflow shell (base/head substituted) fails unlabelled as expected; workflow contains the documented `no-changelog` exemption. Publication must apply that label. |
| final-release-dry-fold | `bash <evidence>/release-dry-fold.sh`: production release helper in archived final-commit scratch copy, synthetic 0.1.1 version; all **33** existing fragments folded/deleted there and correct heading verified. No source worktree release changes. |
| final-inertness-and-guard / final-provenance / final-results | Clean tree, whitespace, one-commit ancestry, no runtime import references, explicit loopback guard probe, fresh upstream fetch, baseline content equality, SHA/diff and numeric outcomes. |

Final-* gates ran at the reported final commit with a clean worktree. Earlier red/green/mutation receipts correctly record a dirty development tree; baseline gates ran from the immutable upstream archive, not the modified source tree. Build outputs remain ignored under dist/ and *.tsbuildinfo.

## Unmet Criteria

No implementation or requested final-commit test deliverables are missing. No remote publication was attempted, as required. The `no-changelog` label is a future publication-time action, explicitly documented rather than silently assumed.

Procedural deviation: initial read-only orientation (instruction/report/source reads, status/version probes, first upstream fetch) ran outside the gate wrapper. Subsequent dependency/test/verification execution was gated; final-provenance repeated upstream/base verification under the wrapper. The initial inspections are not claimed as reusable gate receipts.

## Residual Risk

- No live Slack/MCPL-host or macOS testing; tests qualify only this pure model and unchanged Linux runtime paths.
- A1 provides no operational access protection. A2/A3 must remain dormant until A4 exposes a completely enforced opt-in path; G follows later. F remains optional. The approved DM precedence and early no-D-ID veto are deferred to their assigned integration PRs.
- Fresh metadata, scope observation and check/effect races are caller responsibilities. Synchronous hints must never replace admission checks. CLI/embedded installation equivalence is prepared by shared validation, not yet tested through nonexistent operator wiring.
- Strict unknown-key/null-list behavior differs from the fork; later configuration docs must explain that migration. Trailing-line-terminator IDs and sparse embedded arrays are also deliberately rejected.
- Without `no-changelog`, the future PR's changelog job will fail. This report does not claim a remote CI run or applied label.

## PR body

The following is also saved separately in `pr-body.md`.

## Problem

This is **part 1 (A1) of the access-policy chain**. The connector needs a small, independently tested policy model before enforcement and opt-in configuration can be introduced safely.

## Changes

- Add a pure internal model for ordinary channels and one-to-one DMs: exact identities and kinds, membership, read/effect scopes, write pins, U/W peers, and copied allow-lists.
- Share strict unversioned validation with construction: all three core fields are required; unknown keys and null values are rejected; empty lists deny access and duplicates are harmless.
- Keep this preparation **inert until a later PR exposes configuration**. Nothing imports it from the adapter, server, config, or index. There is no operator setting or behavior change.
- No README setting row or changelog fragment. This is internal-only; please apply **`no-changelog`** as permitted by CONTRIBUTING.md and the changelog workflow. Without that label, the fragment check intentionally fails for any `src/` change.

### Companion PRs / merge order

A1 → **A2 (adapter gates)** → **A3 (attachments)** → **A4 (opt-in setting)** → **G (group DMs)**. A1–A3 remain dormant; A4 must wait for complete enforcement. No companion PR has been opened by this change. Public-pin fallback F is optional later work. Legacy DM precedence and the early no-D-ID `send_dm` veto belong to A2/A4, not this model-only PR.

## Tests

At `8030d418cbaed0f55f015c2516eb5e7132b4cd35`, compared with upstream `7274283fa719a17328ef8e085336ce25f6f22b08`:

| Node | Main baseline (`npm test`) | This commit (`npm test`) | Typecheck / build |
| --- | --- | --- | --- |
| 22.23.3 | 583 pass / 0 fail | 595 pass / 0 fail | Pass / pass |
| 24.22.1 | 583 pass / 0 fail | 595 pass / 0 fail | Pass / pass |
| 22.12.0 | 583 pass / 0 fail | 595 pass / 0 fail | Not requested |

All full suites use the repository's one-process runner, with zero skips or cancellations. The fresh policy test file passes 12/12 five times. Red first: missing model fails; after implementation: 12/12 pass. Removing exact metadata identity causes two failures; retaining a live DM input array causes one failure. Both mutations were reverted. No mocks are needed by the new tests.

Node 24.22.1 and 22.12.0 archives were verified against official SHASUMS256.txt. Test listeners were guarded to allow only explicit loopback binds. The release script dry-folded the 33 existing fragments successfully in a scratch copy. The unlabelled changelog check was reproduced; the documented internal-only label exemption is required.

## Not verified

No live Slack workspace, live MCPL host, or macOS execution. This does not test or enable adapter/attachment enforcement, CLI installation, group-DM authorization, or history fallback; those are follow-up work. The synchronous write hint is not an authorization decision, and the pure model cannot itself guarantee freshness of caller-supplied metadata.

---

- [ ] Changelog fragment added — or internal-only: **apply `no-changelog`**. No label has been applied by this local-only work.

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)

## Evidence log index

- `gate-baseline-22.12.0-01M636KPY5EJS8K6V0YPEV1Q72.log`
- `gate-baseline-22.23.3-01M636JSGDPZ8DESZ2VW73JP2E.log`
- `gate-baseline-24.22.1-01M636K7XYVHTQFZ0DS4EBJHQJ.log`
- `gate-baseline-summary-01M636MEQVK7VEC2QYSA014T7R.log`
- `gate-final-build-22.23.3-01M636PH69Q4YPGC5MRZHTQY4W.log`
- `gate-final-build-24.22.1-01M636PHPG41YZXDNE8VBGMT4J.log`
- `gate-final-changelog-policy-01M636R0GYRBG8JKH5D2TEBG8K.log`
- `gate-final-inertness-and-guard-01M636R0V9QT6WN6ZN5BT14PJ2.log`
- `gate-final-policy-1-01M636QZAN3VDNYA1G2TZF98Y1.log`
- `gate-final-policy-2-01M636QZFS41WSAMFQ37R837F9.log`
- `gate-final-policy-3-01M636QZN5PHMK7VD5KBGDSR9A.log`
- `gate-final-policy-4-01M636QZTJRCADZWWQ8TKYCFTY.log`
- `gate-final-policy-5-01M636QZZR0SJ6Z3B6MZWBMK65.log`
- `gate-final-provenance-01M636SBAF2EE86BG08MRA5D2F.log`
- `gate-final-release-dry-fold-01M636R0NQAYKKZ9AV6H44YMFS.log`
- `gate-final-results-01M636R5VB6XHG0GYKE07DXH37.log`
- `gate-final-suite-22.12.0-01M636QGDE50QYZXXKGWQ3XEPK.log`
- `gate-final-suite-22.23.3-01M636PHYJ3D654V9PZ98B3K21.log`
- `gate-final-suite-24.22.1-01M636Q0SVAFVGCVV2ZHBYWZNA.log`
- `gate-final-typecheck-22.23.3-01M636PGY865E6XBDH4705BFM4.log`
- `gate-final-typecheck-24.22.1-01M636PHECGCQDPK37X60ACQ0H.log`
- `gate-green-policy-01M636KGVX3CPY2VGYW8GPCVKB.log`
- `gate-inspect-tests-01M636FAHJSNV9JWMZESDRWVPA.log`
- `gate-mutation-identity-01M636NDRQZAA1WP6FGMBA3J48.log`
- `gate-mutation-live-dm-list-01M636NE0PHFZ6C4F15Z29HPK3.log`
- `gate-narrow-typecheck-01M636KH257N6Q1P1RQPX6S51E.log`
- `gate-precommit-01M636P9H7T3QPPECC4G0G8T29.log`
- `gate-red-policy-01M636JSBFRJ951EYK1SD4HTX4.log`
- `gate-report-01M636X8YW68Y0TRX8C11CZBAS.log`
- `gate-restored-green-01M636NE8M0DM4TYTSZ248TTK0.log`
- `gate-runtime-install-01M636F2DRVHAPEGT6NZM34J1Q.log`
- `gate-setup-01M636EJ9RP1GRTR61RZMK0Z6Y.log`
