# TASK-R4THE — round 2

## Changed

- Amended commit: **`95916c48ef8110d1089e92df11f7fee30bdeb0ad`**, exactly one commit on **`7274283fa719a17328ef8e085336ce25f6f22b08`**. Fresh upstream fetch still names that parent; **no rebase was needed**. Default author and required GPT-6-Astra co-author trailer retained. Local branch remains `task-r4the-impl`; proposed publication branch is `feat/access-policy-model`.
- Final diff against upstream: **2 files, 359 insertions** — `src/access-policy.ts` **95 lines**; `test/accessPolicy.test.ts` **264 lines**. Round-2 diff against `8030d418`: **86 insertions / 24 deletions** in the same two files. Full and incremental patches: `change.patch`, `round-2.patch`.
- No runtime imports, operator configuration, README/changelog row, lockfile change, push, PR, comment or branch rename. Ignored build outputs are under `dist/` and `*.tsbuildinfo`, not evidence.

### Fix → evidence

| Fix | Evidence |
| --- | --- |
| MEDIUM-1 | All three ID regexes now use plain `$`; inaccurate comment removed. Existing newline-rejection rows remain unchanged and pass in `r2-green`, all final suites and all five policy runs. The earlier report's regex rationale is withdrawn; this report supersedes it. |
| LOW-1 | `parseAccessPolicy(value: unknown): SlackAccessPolicyConfig` captures each field exactly once, snapshots arrays, validates, and freezes the returned object and both fresh arrays. Constructor uses the parsed result. Readonly config types describe this contract. Getter regression on unchanged `8030d418` production code: **13 pass / 1 fail** (`r2-getter-red`), failing because the stored read flag differed from its validated value. With the fix: **16 pass / 0 fail**, including read counts of one per field, retained allowed IDs, rejected replacement IDs, deep-frozen copies and input-mutation isolation. |
| LOW-2 prep | Explicit `REQUIRED_KEYS` and `ALLOWED_KEYS` sets replace key-count logic. Existing missing/unknown/null cases still pass; new own-key test rejects inherited-only fields and hidden/symbol extras while accepting valid non-enumerable own fields. No optional fields or group support added. |
| Hint gap | New test pins `mayWrite('D')`, `mayWrite('D…')`, and `mayWrite('Dnot-an-id')` as true when peers exist, false when empty, while `requireWritable` rejects their invalid DM metadata. |
| PR body | Verbatim body below and `pr-body.md`: fork strictness migration, inert built artifact/unpublished package, `no-changelog` request, all chain follow-ups and proposed publication branch. |

Reviewed findings were read from this task's reviewer report: `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/tasks/TASK-R4THE/dispatches/tx-20261029-theaspirationalslack-83b8644b-68ca-4381-a7ff-540bae047a7b/report.md`. Claims were verified against current source and fresh gates rather than treating its approval as test proof.

## Verification Gates

Every round-2 check ran as `orgasmic dispatch gate <name> -- timeout 900 …`. Final gates ran at the amended SHA with a clean worktree. All shell launches disabled both update notifiers. Worktree dependencies were freshly installed with `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, verified-empty user/global npm configs, audit/fund off. Node 22.23.3 remained on the default PATH; scratch Node 24.22.1 and 22.12.0 archives were rehashed against the retained official SHASUMS256.txt files. All test commands set `NODE_OPTIONS=--require=<evidence>/loopback.cjs`.

| Gates | Commands / fresh results |
| --- | --- |
| `r2-inspect`, `r2-setup`, `r2-diff` | Read reviewer/current source; fetch upstream; runtime checksum/version probes; restricted npm ci (51 packages); baseline byte comparison; whitespace/diff checks. |
| `r2-getter-red` | `node --import tsx --test --experimental-test-isolation=none test/accessPolicy.test.ts`: **13 pass / 1 fail**, expected behavioral failure on old code, not an import error. |
| `r2-green` | Same test command: **16 pass / 0 fail**; `npm run typecheck` passes; model is 95 lines. |
| `r2-final-typecheck-22.23.3`, `r2-final-typecheck-24.22.1` | `npm run typecheck` with named Node on PATH: pass. |
| `r2-final-build-22.23.3`, `r2-final-build-24.22.1` | `npm run build` with named Node on PATH: pass. |
| `r2-baseline-suite-22.23.3`, `-24.22.1`, `-22.12.0` | `bash <evidence>/run-suite.sh baseline <version>` → `npm test`: **583 pass / 0 fail** each, zero skipped/cancelled. |
| `r2-final-suite-22.23.3`, `-24.22.1`, `-22.12.0` | `bash <evidence>/run-suite.sh final <version>` → `npm test`: **599 pass / 0 fail** each, zero skipped/cancelled. |
| `r2-final-policy-1` through `-5` | New policy file, Node 22.23.3, one-process flag: **16 pass / 0 fail each**. |
| `r2-final-changelog-policy` | `python3 <evidence>/changelog-check.py`: exact workflow shell reproduces **unlabelled exit 1**; job condition verifies `no-changelog` exemption. The wrapper succeeds for that expected result, not because unlabelled CI passes. |
| `r2-final-release-dry-fold` | `bash <evidence>/release-dry-fold.sh`: scratch archive of amended SHA, synthetic 0.1.1 release, **33 existing fragments** folded/deleted there; released heading asserted. Source worktree unchanged. |
| `r2-final-inertness`, `r2-final-results` | Clean tree; source and built module reference scans find no importers; whitespace; explicit-loopback allow/non-loopback refuse probe; commit/diff and numeric summaries; upstream/base provenance. |

### Inherited evidence and scope

- The unchanged original task plan/project/contribution instructions remain applicable; no startup scan was replayed. No previous application/test gate pass is counted as a final-commit pass.
- Reused artifacts: official checksum documents and scratch runtime archives, the upstream baseline archive/dependency installation, and evidence-only helper scripts/loopback guard from round 1. Runtime archive digests were **rechecked this round**. All **115 baseline tracked files** were compared byte-for-byte with the unchanged upstream SHA. Both baseline and final suites were **rerun**, not inferred from earlier results.
- Prior two mutation experiments and reviewer probes remain historical evidence about `8030d418`, not new proof of this amended commit. This round adds a concrete getter red/green test and reruns every assigned gate.
- `scratch-location` identifies reusable scratch data. This run's report, logs, patches and helper scripts are exclusively in the current evidence directory, not the earlier round's destination.

## Unmet Criteria

None in the narrowed implementation/gate assignment. The future PR must receive `no-changelog`; no public label/application action was authorized or performed. The job without that label intentionally fails and is not misreported as passing.

## Residual Risk

A1 is still dormant and protects no operational path until later PRs integrate it. The pure model relies on callers for fresh metadata and observed scopes. No live Slack/MCPL-host or macOS test was performed. A4 must document the deliberate strict-format migration and fully enforce every path before exposing configuration; G/F remain out of scope. The parser snapshots ordinary config values but is not a sandbox for arbitrary code executed by malicious in-process getters/proxies.

## Final PR body (verbatim)

## Problem

This is **part 1 (A1) of the access-policy chain**: independently test a small policy model before adding enforcement and opt-in configuration.

## Changes

- Add a pure internal ordinary-channel/one-to-one-DM policy: exact identities and kinds, membership, read/effect scopes, channel write pins, U/W peers and copied allow-lists.
- Add `parseAccessPolicy(unknown)`: read each field once, validate against explicit required/allowed keys, and return a frozen normalized object with fresh frozen arrays. Construction consumes those validated snapshots.
- Unknown keys and null lists are now rejected where the fork accepted them (embedded unknown keys and null optional lists).
- Keep this **inert until a later PR exposes configuration**. Nothing imports it from the adapter, server, config or index; there is no operator setting or README row. Built `dist/src/access-policy.js` is imported by nothing, and the package is not published to npm.
- Please apply **`no-changelog`** for this internal-only preparation, as permitted by CONTRIBUTING.md and the changelog workflow. Without that label the fragment check fails; no label has been applied by this local-only work.
- Proposed publication branch: **`feat/access-policy-model`**. The local branch has not been renamed.

### Companion PRs / merge order

A1 → **A2 (adapter gates)** → **A3 (attachments)** → **A4 (opt-in setting)** → **G (group DMs)**. A1–A3 remain dormant; A4 waits for complete enforcement. Public-pin fallback F is optional later work. No companion PR was created by this change. Legacy DM precedence and early no-D-ID `send_dm` veto remain A2/A4 integration work.

## Tests

At `95916c48ef8110d1089e92df11f7fee30bdeb0ad`, compared with upstream `7274283fa719a17328ef8e085336ce25f6f22b08`:

| Node | Main baseline (`npm test`) | This commit (`npm test`) | Typecheck / build |
| --- | --- | --- | --- |
| 22.23.3 | 583 pass / 0 fail | 599 pass / 0 fail | Pass / pass |
| 24.22.1 | 583 pass / 0 fail | 599 pass / 0 fail | Pass / pass |
| 22.12.0 | 583 pass / 0 fail | 599 pass / 0 fail | Not requested |

All six suites were freshly run with the repository's one-process runner; no skips or cancellations. The policy file passes **16/16 five times**. Its getter regression first failed on the previous implementation (**13 pass / 1 fail**), then passed after the parser fix. Coverage includes unchanged newline rejection, required/unknown/null fields, own/non-enumerable/symbol keys, frozen copies, changing getters and deliberate permissive D-prefix hints that cannot authorize invalid DM IDs. No mocks are used by these tests.

Tests ran with an explicit-loopback listener guard. Node 24.22.1 and 22.12.0 archive checksums were rechecked against official SHASUMS256.txt files. The unlabelled changelog failure and documented label exemption were reproduced. The release script dry-folded the 33 existing fragments in a scratch copy.

## Not verified

No live Slack workspace, live MCPL host or macOS execution. This does not enable or qualify adapter/attachment enforcement, CLI configuration, group-DM authorization or fallback. The pure model cannot establish freshness of caller-supplied metadata; synchronous write hints are not authorization decisions.

---

- [ ] Changelog fragment added — or internal-only: **apply `no-changelog`** before requiring a green changelog job.

🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)

## Evidence log index

- `gate-r2-amend-01M637V50NCH93Z7P39QSTK2V2.log`
- `gate-r2-baseline-suite-22.12.0-01M637W2T28PB445BGJSCGV93R.log`
- `gate-r2-baseline-suite-22.23.3-01M637V659G7KECVYMK5Z7TKQZ.log`
- `gate-r2-baseline-suite-24.22.1-01M637VMCD0JHHJ91RVM8RKJ3P.log`
- `gate-r2-diff-01M637TF3NJVN8ZSMMHC8SATK6.log`
- `gate-r2-final-build-22.23.3-01M637V5DB0RR7Y6E2VVSJ3C6S.log`
- `gate-r2-final-build-24.22.1-01M637V5X9NXVQ50130PXY2WZA.log`
- `gate-r2-final-changelog-policy-01M637VXM33YS7M0K7CYKSV199.log`
- `gate-r2-final-inertness-01M637VXY8VGRVC2RNB2KTTXDM.log`
- `gate-r2-final-policy-1-01M637XXQ3BAWC7CGZ8EZA55BE.log`
- `gate-r2-final-policy-2-01M637XXWDRXC7DSF4TMW2ZVZ1.log`
- `gate-r2-final-policy-3-01M637XY1AJ6N21V5314J19R1C.log`
- `gate-r2-final-policy-4-01M637XY7AQX5SMSWRJWKCJBBS.log`
- `gate-r2-final-policy-5-01M637XYD550TQNRY8R93XJAJT.log`
- `gate-r2-final-release-dry-fold-01M637VXS3KJ55AF7GFPJBNG82.log`
- `gate-r2-final-results-01M638AA7XVBE5G75104VEJFDV.log`
- `gate-r2-final-suite-22.12.0-01M637XEWMZ852B10ES2PEPTR1.log`
- `gate-r2-final-suite-22.23.3-01M637WH8710RVWH1T8T24VATZ.log`
- `gate-r2-final-suite-24.22.1-01M637X0J5W3WHZZ9E23F2934X.log`
- `gate-r2-final-typecheck-22.23.3-01M637V55DSGJYWQ4V2RC41H6A.log`
- `gate-r2-final-typecheck-24.22.1-01M637V5N9MKJA53TE8RQCMM24.log`
- `gate-r2-getter-red-01M637QPDZHDEC99CSG8F62A0Q.log`
- `gate-r2-green-01M637S3ZZ6CXGYSQGHGPMB83X.log`
- `gate-r2-inspect-01M637P2WSAH8TJC1JXRMXE1JB.log`
- `gate-r2-report-01M638AY5TD02P9HVSRQ6GX20W.log`
- `gate-r2-setup-01M637QNSK9MXRT4WHXNCYA9N5.log`
