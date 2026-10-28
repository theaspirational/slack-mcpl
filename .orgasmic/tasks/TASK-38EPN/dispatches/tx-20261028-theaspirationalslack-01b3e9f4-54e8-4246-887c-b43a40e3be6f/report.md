# Changed

- Round baseline: `d5a84bccdca69a9804df28f834616a2ea73abfd5`; preflight confirmed HEAD and a clean tree.
- Final commit: `e8c6fe530b71ff4b3778ac5fd10256dfb408f32c` — **Keep conversation lookup when backscroll is zero**.
- Exactly one new local commit on the round baseline; nothing amended. Author identity matches the parent, and the requested co-author trailer is present. No push, PR, or remote comment.
- **MEDIUM-1:** restored the original first-addressed-interaction condition around metadata lookup. The nested `backscrollLimit > 0` condition now covers only the history fetch/handling and its `isCurrent()` check. Metadata lookup and its own lifecycle check run independently of the limit.
- Added an integration regression in `test/operatorControls.test.ts`: send an outbound message first, then deliver the first addressed inbound message at limit 0. It asserts no history request and an auto-subscribe note naming `#general`.
- **LOW-2:** clarified the README's leading-base-10-integer behavior, including prefix/fraction examples. Kept `parseInt` rather than introducing strict validation, because strict validation would change established non-zero behavior.
- Added the optional getter boundary test in the same existing file, using the existing harness. It covers unset/empty values, 0, 1000, -1, 1001, abc, and the three prefix/fraction cases below. No new repository fixtures or parser changes.
- The existing single-bullet `changelog.d/zero-backscroll.added.md` remains applicable and unchanged.

Before/after here means **round baseline → final**, not pre-feature upstream:

| Input | Before | After |
|---|---:|---:|
| `0junk` | 0: no automatic history | 0: no automatic history |
| `7junk` | 7 | 7 |
| `1.5` | 1 | 1 |
| `abc` | 50 | 50 |

`abc` still parses to `NaN`, fails the finite/range check, and falls back to 50 without startup rejection. The boundary test passes both on the round baseline and the final implementation.

Diff relative to the round baseline:

```text
README.md                     |  2 +-
 src/server.ts                 | 26 +++++++++++++------------
 test/operatorControls.test.ts | 44 +++++++++++++++++++++++++++++++++++++++++++
 3 files changed, 59 insertions(+), 13 deletions(-)
```

# Verification Gates

All commands used `orgasmic dispatch gate <name> -- timeout 900 <command>`. Final gates ran at the final commit with clean trees. Evidence links are relative to this report's directory.

| Runtime | Fresh baseline suite | Final suite | Final npm ci / typecheck / build |
|---|---:|---:|---|
| Node 22.23.3 | 586 pass / 0 fail | 588 pass / 0 fail | All pass |
| Node 24.22.1 | 586 pass / 0 fail | 588 pass / 0 fail | All pass |

Every full suite has zero skipped, cancelled, or todo tests. `npm test` uses the unchanged one-process runner: `node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.

- **Red:** added both tests with production still at `d5a84bcc`; operator controls: **15 pass / 1 fail**. The new sequence received `Auto-subscribed to conversation C1` instead of `Auto-subscribed to #general`.
- **Green:** narrowed the guard; operator controls: **16 pass / 0 fail**.
- **Independent mutation:** kept the fixed guard and executed the first-interaction metadata lookup, but discarded its result instead of assigning `meta`. The new sequence again failed with the generic conversation note: **15 pass / 1 fail**. Restored the source byte-for-byte before committing. No mutant committed. See `r2-mutant-production.patch` and `r2-regression-tests.patch`.
- Every suite used `NODE_OPTIONS="--require=$ORGASMIC_EVIDENCE_DIR/loopback-only.cjs"`. The external preload rejects server listeners not explicitly bound to `127.0.0.1` or `::1`; test-server call sites were also inspected. The guard did not require repository changes.
- Installation command: `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, with distinct empty user/global npm config files in scratch outside the repository. Audit/fund requests and update notifiers were disabled. Notifiers were off from the first command.
- Node 24.22.1 was freshly extracted outside the repository from the previously downloaded official archive after rechecking it against the release's `SHASUMS256.txt`. See `node24-checksum.log` and the copied manifest. Runtime versions were checked before final gates.
- No tracked lockfile or generated-file changes. Build output remains in ignored `dist/`; dependencies and the scratch runtime are outside evidence.

## Inherited evidence and scope

The original baseline commit, its two operator-control tests, and its changelog fragment were inherited unchanged; the fresh baseline suites above requalify that exact commit on both engines. No prior gate receipt is substituted for a round-two check. The earlier Node archive and official checksum manifest were reused only as installation inputs, reverified before fresh extraction. The supplied review probe was inspected as a reproduction reference; the committed test and its red/green/mutation runs independently establish the finding and fix. Previously read repository/skill instructions remain applicable; no new conventions were introduced.

## Commands and logs

| Gate | Command after `timeout 900` | Result | Log |
|---|---|---|---|
| `r2-base-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-r2-base-npm-ci-01M6239TH2T4RYWT397FZDVKJ5.log](gate-r2-base-npm-ci-01M6239TH2T4RYWT397FZDVKJ5.log) |
| `r2-base-node22-suite` | `npm test` | 586/0 | [gate-r2-base-node22-suite-01M6239V7AG9QQ5ZWE5BYSBMJ4.log](gate-r2-base-node22-suite-01M6239V7AG9QQ5ZWE5BYSBMJ4.log) |
| `r2-base-node24-suite` | `npm test` | 586/0 | [gate-r2-base-node24-suite-01M623A9QWGT5R9K1BSR963013.log](gate-r2-base-node24-suite-01M623A9QWGT5R9K1BSR963013.log) |
| `r2-red-operator-controls` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 15/1, expected red | [gate-r2-red-operator-controls-01M623BTAE6HTK4386F02CPBFR.log](gate-r2-red-operator-controls-01M623BTAE6HTK4386F02CPBFR.log) |
| `r2-green-operator-controls` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 16/0 | [gate-r2-green-operator-controls-01M623C674R3PY1W8P52ZRF1DH.log](gate-r2-green-operator-controls-01M623C674R3PY1W8P52ZRF1DH.log) |
| `r2-mutation-discard-meta` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 15/1, expected red | [gate-r2-mutation-discard-meta-01M623CM8F4QHWGMD8V0HA62K9.log](gate-r2-mutation-discard-meta-01M623CM8F4QHWGMD8V0HA62K9.log) |
| `r2-final-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-r2-final-node22-npm-ci-01M623DGY6C9FG9RH3BYMAEYCJ.log](gate-r2-final-node22-npm-ci-01M623DGY6C9FG9RH3BYMAEYCJ.log) |
| `r2-final-node22-typecheck` | `npm run typecheck` | pass | [gate-r2-final-node22-typecheck-01M623DHFH9C1V6J40VN5F0CGH.log](gate-r2-final-node22-typecheck-01M623DHFH9C1V6J40VN5F0CGH.log) |
| `r2-final-node22-build` | `npm run build` | pass | [gate-r2-final-node22-build-01M623DHQEYPVFF37XK0ENRE4F.log](gate-r2-final-node22-build-01M623DHQEYPVFF37XK0ENRE4F.log) |
| `r2-final-node22-suite` | `npm test` | 588/0 | [gate-r2-final-node22-suite-01M623DHZB5BMGC18PZRFY36R1.log](gate-r2-final-node22-suite-01M623DHZB5BMGC18PZRFY36R1.log) |
| `r2-final-node24-typecheck` | `npm run typecheck` | pass | [gate-r2-final-node24-typecheck-01M623E00TXTMCA9NVJVZBY09Y.log](gate-r2-final-node24-typecheck-01M623E00TXTMCA9NVJVZBY09Y.log) |
| `r2-final-node24-build` | `npm run build` | pass | [gate-r2-final-node24-build-01M623E08PM2XTHPN205DD3D85.log](gate-r2-final-node24-build-01M623E08PM2XTHPN205DD3D85.log) |
| `r2-final-node24-suite` | `npm test` | 588/0 | [gate-r2-final-node24-suite-01M623E0KX0VZ14TFJS050CQ1T.log](gate-r2-final-node24-suite-01M623E0KX0VZ14TFJS050CQ1T.log) |
| `r2-final-node24-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-r2-final-node24-npm-ci-01M623F4EYRZN2DN065GASYSVR.log](gate-r2-final-node24-npm-ci-01M623F4EYRZN2DN065GASYSVR.log) |

# Unmet Criteria

None. All requested checks ran; both review findings are addressed. The expected regression and mutation failures were reproduced.

# Residual Risk

No live Slack workspace was exercised. Integration tests use the real server/adapter with the existing in-memory transport and fake Slack API. No additional operating-system matrix was run. Permissive integer-prefix parsing is intentionally retained and now explicitly documented and tested.
