# TASK-XPP3A — round 2 fixes

## Changed

**Final SHA: `9f03ef92b41500092c9a37cf04a284c2f02ced0c`.** Amended into exactly **one commit** directly on published parent `62a77616228cdc7d4eda31a6f1561501e9e484fc` (#55). Default author and required `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer retained. Worktree clean. Local only: no push, PR, comment, merge, tag or main-checkout edit.

Verified the findings against current source and the supplied reviewer report at `.orgasmic/tasks/TASK-XPP3A/dispatches/tx-20261029-theaspirationalslack-92579a00-d54a-460f-bedb-d7bad5e5e94e/report.md` in the read-only ledger.

Round delta from `8296d58e`: **5 files, +38/-10**. Entire amended commit: **5 files, +565/-22**; production **2 files, +107/-22 (net +85)**. No lockfile, configuration, README, schema or tracked build-output changes. Separate public PR body: sibling `pr-body.md` in this evidence directory, quoted verbatim at the end.

### Fix → evidence

| Finding | Fix | Evidence |
|---|---|---|
| M1 | Public body explicitly says `fetch_attachment` is **NOT gated** yet; suppressing references does not protect caller-supplied URLs; activation **must not land before attachment enforcement**. No attachment behavior changed. | `pr-body.md`, Safety boundaries; `r2-report-check.log` checks required wording. |
| M2 | `SlackAccessPolicy` class comment and public body state the directory is outside confinement: `find_user` checks only `users:read`, searching/returning results from the whole workspace directory, with existing query/result limits. Filtering remains an open activation decision. | `src/access-policy.ts` class doc comment; `pr-body.md`; existing scope-only directory tests retained in all fresh suites. |
| M3 | Public body names the uncached extra `conversations.info` per listing candidate, inbound event and read/write, with short TTL cache versus call budget explicitly open for activation. No cache or admission changes. | `pr-body.md`, Safety boundaries. |
| L4 | Under policy, `dmsDisabled` now returns `!this.accessPolicy.dmsWritable`, matching the fork. Without policy it returns the original legacy switch. This uses policy peers, not the adapter's send-list-intersected write hint: a send-list veto does not disable readable/listable DMs. | `dmsDisabled reflects policy peers, not legacy switches or the write-only send list`; empty/allowed peers × both legacy switches, absent-policy controls, and send-list separation. Old getter fails the new test: `r2-getter-red.log` **0 pass / 1 fail**, expected; final targeted runs **73/0**. |
| L5 | Both new test files register through a test-local wrapper that installs exactly one context-owned `console.error` mock; removed inner mocks. Production logging unchanged. Public body says activation should pass policy at construction for policy-aware startup diagnostics. | `test/adapterAccessFixture.ts` `accessTest`; both new test files. All five final targeted logs have no `[slack-mcpl]` diagnostic lines; checked by `r2-audit`. No global hook or nested mock was added. |
| L6 | Public body uses “Make the ID-list predicate hole-safe for future callers (behaviour-neutral today).” No additional predicate change this round. | `pr-body.md`, Changes. |
| L7 | Comment at `deleteFile` gate records reliance on caller's `(channelId, fileId)` pairing from its own upload, since Slack deletion uses only file ID; future file tools must verify association. No deletion behavior changed. | `src/slack-adapter.ts` `deleteFile`; existing upload/rollback gate tests retained. |
| L8 | Public body replaces internal sequence labels with plain-language later attachment enforcement, later opt-in setting and later group DMs; retains **depends on #55**. | `pr-body.md`; artifact check rejects standalone A3/A4/G labels. |

## Verification Gates

All checks below ran via **`orgasmic dispatch gate <name> -- timeout 900 <command>`**. Build/typecheck, full suites, five repeats, changelog and release fold ran on the final amended SHA with a clean tree. No earlier revision pass substitutes for a required current-round gate.

`NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from this round's first command. `env.sh` sets separate empty npm user/global configurations, audit/fund off, and the loopback-only Node preload guard. Guard rejects listeners not explicitly bound to `127.0.0.1` or `::1`. Builds stayed in the worktree; Node archives/binaries and scratch release copies stayed under `/tmp/task-xpp3a`, outside evidence.

Logs listed below are relative to this report's directory, `/home/orgasmic/.orgasmic/runs/run-01M63BQ6N1W8PTSRV1XD32WJ3Z/evidence`. Each summary log includes its immutable `gate-<name>-<invocation>.log` receipt path. Exact runner: `r2-gates.sh`. Node 22.23.3 is on PATH; other version bins are `/tmp/task-xpp3a/node-v<version>-linux-x64/bin`.

| Gate | Command after the wrapper | Result / log |
|---|---|---|
| `r2-install` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | Pass, 51 packages; `r2-install.log`. Empty configs separately verified by `r2-audit`. |
| `r2-precommit` | `bash -c '… git diff --check; npm run typecheck; … sha256sum -c - …'` | Pass; Node 24.22.1 and 22.12.0 archives again match official SHASUMS; `r2-precommit.log`. |
| `r2-getter-red` | `python3 <evidence>/getter-red.py` | Pass as an inverted regression control: old getter produces **0 pass / 1 fail**; script restores source in `finally`. `r2-getter-red.log`. |
| `r2-typecheck-22.23.3`, `r2-typecheck-24.22.1` | `env PATH=<version-bin>:$PATH npm run typecheck` | Both pass; `r2-typecheck-<version>.log`. |
| `r2-build-22.23.3`, `r2-build-24.22.1` | `env PATH=<version-bin>:$PATH npm run build` | Both pass; `r2-build-<version>.log`. |
| `r2-suite-22.23.3`, `r2-suite-24.22.1`, `r2-suite-22.12.0` | `env PATH=<version-bin>:$PATH npm test` | **672 pass / 0 fail each**, no skips or cancellations; `r2-suite-<version>.log`. |
| `r2-new-tests-1` through `-5` | `node --import tsx --test --experimental-test-isolation=none test/adapterAccess.test.ts test/adapterAccessServer.test.ts` | **73 pass / 0 fail**, five runs on Node 22.23.3, no Slack diagnostic noise; `r2-new-tests-<n>.log`. |
| `r2-changelog` | `node <evidence>/changelog-check.mjs` | Pass: internal-only `no-changelog` exemption, no supported activation. Unlabelled CI would require a fragment; no public label applied. `r2-changelog.log`. |
| `r2-release-fold` | `node <evidence>/release-dry-fold.mjs` | Pass: 33 existing fragments fold identically for parent and final revision using scratch-only version 9999.0.0; tracked changelog untouched. `r2-release-fold.log`. |
| `r2-inherited-evidence` | `bash -c '… baseline logs; git diff --stat …; git show …; exact-parent check; git diff --check …'` | Pass: parent/one-commit shape, trailer, diff and historical baseline headers/counts verified. `r2-inherited-evidence.log`. |
| `r2-audit` | `python3 <evidence>/r2-audit.py` | Pass: all required final receipt heads/exit statuses, numeric suite/repeat counts, quiet logs, empty configs, actual Node versions and clean tree. `r2-audit.log`. |
| `r2-report-check` | `python3 <evidence>/r2-report-check.py` | Checks report/PR-body contract, required caveats, plain-language sequencing, exact SHA and final verbatim quote. `r2-report-check.log`. |

### Inherited evidence, not new passes

- The exact unchanged published parent `62a77616` retains the round-1 baseline **599/0 on each Node version**, from `/home/orgasmic/.orgasmic/runs/run-01M639D46CVXRPX3G7GZYWM6X7/evidence/baseline-<version>.log`. Re-read headers/counts this round (`r2-inherited-evidence.log`). This is a historical parent comparison, **not** a reused pass for changed production/test inputs; every assigned final-head check was rerun.
- Immutable version archives and official SHASUMS256 files downloaded from nodejs.org in round 1 were retained in scratch. Archive hashes were rechecked this round; copies of the SHASUMS files, guard and environment script are in this round's evidence. Runtime versions were checked again.
- Prior implementer mutation/differential evidence and reviewer probes remain historical context for `8296d58e`; they are not claimed as rerun at this amended head. This round newly demonstrates the getter red control and all requested gates.

## Unmet Criteria

None. All requested fixes and gates are complete. One amended local commit remains on #55. The deliberately failing getter control is expected evidence, not an unresolved test failure. No required final application gate failed.

## Residual Risk

- `fetch_attachment` remains ungated; opt-in activation must wait for attachment enforcement. No code-level activation dependency is added in this documentation-focused round.
- The workspace user directory is outside conversation/DM confinement. Directory filtering is an open activation decision.
- Fresh uncached admission adds API traffic; cache versus budget remains open. No live workspace, load/rate-limit, macOS or live external-host qualification.
- Startup policy-aware construction is deferred; current tests use private post-construction injection. Production diagnostic behavior was not changed.
- File deletion relies on trusted upload pairing; admission/effect is not transactional, and cleanup after revocation may leave artifacts.
- The future public PR needs the `no-changelog` label. No public action was taken.

## Final PR body (`pr-body.md`)

> ## Problem
>
> Part 2 of the access-policy chain: the internal policy model needs adapter enforcement before supported opt-in can be exposed. This PR **depends on #55**; review and merge #55 first.
>
> ## Changes
>
> - Prepare fresh metadata/identity, read/history, write/scope, listing, inbound, DM-open, upload, rollback and reaction/ACK gates behind private policy state.
> - Retain the early no-D-ID send-list veto for `send_dm`, then verify the opened DM's exact peer and destination. Derive the DM-disabled description from whether the policy allows any peers.
> - Preserve legacy behavior when no policy is supplied. No environment variable, CLI option, connector setting or public installer is added: **inert until a later PR adds the opt-in setting**.
> - A later PR adds attachment enforcement; group DMs come later. Until then, internal policy mode refuses group DMs and suppresses attachment references. No new channel-join API or server `channels/open` change.
> - Make the ID-list predicate hole-safe for future callers (behaviour-neutral today).
> - Document the user-directory exception and file-deletion pairing assumption; silence test-local console diagnostics without changing production logging.
>
> ## Safety boundaries and open questions
>
> **`fetch_attachment` is NOT gated by the policy yet.** Suppressing attachment references does not protect downloads of URLs supplied by callers. **Activation must not land before attachment enforcement.** A later PR must enforce attachment access before another adds the opt-in setting.
>
> **The user directory is outside the policy's confinement.** `find_user` is gated only on `users:read` and returns results from the whole workspace directory, subject to its existing query and result limits—not just admitted DM peers or members of admitted conversations. Whether directory results should be filtered is an open question for the later activation PR; this PR does not change that behavior.
>
> Fresh admission adds one `conversations.info` per listing candidate, inbound event and read or write, with no cache. Whether a short TTL cache or a call budget is needed is open for activation.
>
> Activation should pass the policy at construction so the startup scope diagnostic is policy-aware. These tests intentionally inject private state after construction and do not exercise that future wiring.
>
> ## Tests
>
> - Unchanged published-parent baseline: **599 pass / 0 fail** on Node 22.23.3, 24.22.1 and 22.12.0 (recorded in the initial implementation round).
> - This revision: **672 pass / 0 fail** on each version; no skips or cancellations.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - All **73 new tests pass five consecutive runs**. The getter regression covers empty/allowed DM peers, both legacy switches, absent policy and send-list/readability separation.
> - Test-local console mocks are scoped to each test; targeted runs emit no Slack diagnostic noise.
> - Real server/adapter tests cover tool refusals, host publish and rollback; a loopback upload exercises the byte-transfer path without mocking fetch.
> - Internal-only changelog exemption checked; scratch release folds the published parent and this revision identically.
>
> ## Not verified
>
> No live Slack workspace, live external host, macOS or rate-limit/load testing. Admission is not transactional with Slack effects; cleanup after revocation may leave artifacts. File deletion relies on the caller's conversation/file pairing recorded from its own upload; a future arbitrary-file tool must verify association.
>
> ## Out of scope
>
> Protected attachment fetching, supported opt-in configuration, group-DM admission, public-pin fallback, routing and typing. These private preparations are not a supported partially enabled security feature.
>
> ---
>
> - [x] Internal-only change: apply `no-changelog` per CONTRIBUTING.md. No fragment is needed while this remains unreachable through supported configuration.
>
> 🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
