# Changed

- Final local commit: `a2295638779bce1bc6ec873b24adeacf4009b310` (one commit on the assigned task branch).
- Only `docs/FORK-VS-UPSTREAM.md` changed; final worktree clean. No push, PR, GitHub comment, real credentials, dependency files, generated files or source changes in the worktree.
- Preflight matched `d63db80fb5998a1d10ddc3e294a2d9391278d828` with a clean tree. Read the supplied project baseline and `CONTRIBUTING.md`; no applicable AGENTS.md or additional convention/gotcha references were present.
- Fresh public fetches confirmed upstream `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34` and fork `685b2debff12ed5cfdcae9070ddb131842c5a6d0`. Recomputed ancestry: 57 ahead / 3 behind; diff: 60 files, +4,916/-518.
- Added a top changes-since-d63db80f section, Q for open #50, and U49 for upstream-only runner/clock/startup/release changes. Expanded the exact file ledger from 45 to 60 paths and partitioned shared index/server/adapter changes. Updated A's test-isolation prerequisite, O's independent extraction/tests, P's new conflict, and the PR plan/base/test claims.
- Fresh public REST snapshots: this fork's only open upstream PRs are #12, #31 and #50. #12 remains dirty with requested changes; #31 is now dirty with no submitted reviews; #50 is clean with one COMMENTED review and a label-retention documentation finding. Related #20 is open/dirty from another fork. Existing #12/#31 fork-versus-PR deltas were rechecked, not assumed.

## Apply and test results per proposed PR

All application checks start independently at upstream `d3e4f7c9`. File projections deliberately include overlapping fork dependencies and are not finished standalone patches. Exact inputs, conflicts and methods are in `apply-results.json`, `apply.py`, and each numbered patch/apply log.

| PR / scope | Apply result | Fresh test result |
|---|---|---|
| #50 / labels | Clean exact PR delta | Typecheck/build pass; full suite 602 pass / 0 fail. |
| O / zero backscroll | Clean two exact server hunks | Typecheck/build pass; full suite 585/0, including one scratch regression. |
| O / disabled tools | Broad projection conflicts in `src/index.ts`; focused extraction reconciles startup | Typecheck/build pass; full suite 587/0 with three non-routing scratch tests. |
| #12 / T/C | Exact PR delta conflicts in `test/harness.ts` | Standalone resolved suite not run; review fixes remain. |
| #31 / P | Exact PR delta conflicts in `src/index.ts` | Minimal startupSettings-preserving reconciliation: typecheck/build pass; full suite 661/0, no restricted-reader skips. |
| A/H (+ E validator) | Projection conflicts in `src/index.ts`, `src/slack-adapter.ts` | Standalone suite not run; fileAccess global-mock incompatibility diagnosed. |
| F | Projection conflicts in `src/slack-adapter.ts` | Not run; A/H prerequisite. |
| S | Exact commit conflicts in `src/slack-adapter.ts`; `test/historyMembershipFallback.test.ts` absent from main | Not run; intended F base does not yet exist upstream. |
| G | Projection conflicts in `src/index.ts`, `src/slack-adapter.ts` | Not run; separate non-routed cases from R/B cases. |
| R preparatory ledger (+ E) | Fork source/test files apply cleanly | Not run; Node 24+ and dependencies still need qualification. |
| B preparatory bridge (+ E) | Fork source/test/contract files apply cleanly | Not run; split historical documentation and reconcile #20. |
| R/B activation | Projection conflicts in `src/index.ts`, `src/slack-adapter.ts` | Standalone suite and actual companions not checked. |
| Related #20 | Exact PR delta conflicts in README, server, adapter and harness | Not run. |

## Revised order

Finish open #50's review follow-through; start **zero backscroll**, then **disabled tools** as the next two new PRs. The tested extractions are 2 files/+22/-3 and 4 files/+47/-2 respectively, before docs/fragments. Plan roughly 20–50 lines plus focused tests for zero, 60–120 for disabled tools. Both use current main and need no companion changes.

Zero carries the no-automatic-history / explicit-history regression. Disabled tools carries parser validation, legacy/MCPL hide-and-refuse checks and copied-option checks, without the routing fixture. Refresh #31 in parallel before #12's larger behavioral repair: its localized startup reconciliation already passes a full suite, whereas #12 still needs optional typing and target/lifecycle fixes. Then A/H, F/S, G, R/B preparatory work and finally qualified activation. R/B interface discussion starts early; real framework/host integration remains the migration critical path.

# Verification Gates

Suites ran in scratch outside the worktree, not against changed worktree source. Each suite/diagnostic used `timeout 900 orgasmic dispatch gate <name> -- <command>`; suite command `bash "$ORGASMIC_EVIDENCE_DIR/suite.sh"` runs typecheck, build and #49's single-process `npm test`. Linux, Node 22.23.3, Python 3.12.3. npm installation used `ci --ignore-scripts --registry=https://registry.npmjs.org --no-audit --no-fund`, two distinct empty user/global configuration files and a sanitized environment. Both notifier-off variables were set from the first command.

| Gate | Outcome |
|---|---|
| `candidate-apply` (`python3 .../apply.py`) | Pass: 13 candidate/related checks, with conflicts recorded as findings. |
| `main-suite` | Typecheck/build pass; 584 pass / 0 fail. |
| `label-suite` | Typecheck/build pass; 602/0. |
| `zero-suite` | Typecheck/build pass; 585/0. |
| `disabled-suite` | Typecheck/build pass; 587/0. |
| `pr31-suite` | Typecheck/build pass; 661/0. |
| `double-mock-diagnosis` | 2/0: positively establishes the cross-test leak, not feature correctness. |
| `composed-diagnosis` | Hung / not established; verified owner stopped with SIGTERM, receipt interrupted:15. |
| `composed-diagnosis-fixed` | Same two-file diagnostic, scratch-only mock restoration: 22/0. |
| `final-consistency` (`python3 .../consistency.py`) | Pass at final commit on a clean tree: exact ledger, ancestry, PR deltas/states, test evidence, patch digests, config isolation and one-file scope. |

No skipped or cancelled tests in the five complete suites. Candidate/control suite gates predate the documentation commit and describe their preserved scratch patches, not runtime testing of the final worktree. The final-commit consistency gate verifies those claims without representing scratch receipts as worktree-product qualification.

## Interrupted composition diagnosis

Prior artifacts were read only as investigation inputs; no prior result is cited as a new pass. A fresh minimal probe confirms that mocking global fetch twice within the fileAccess redirect test restores the first mock rather than native fetch. Under #49, later upload tests receive fixture bytes instead of reaching their endpoint. A fresh fileAccess + uploadValidation run reproduced the hang even with Node's additional `--test-timeout=5000`. After no-progress polls and process verification, the owned gate was stopped before its outer timeout; the wrapper killed remaining descendants after its five-second grace. Last application lines:

```text
[slack-mcpl] Client initialized (MCP mode)
[slack-mcpl] Client disconnected
[slack-mcpl] Client initialized (MCP mode)
```

Restoring the fixture mock before replacing it made exactly that diagnostic finish at 22/0. The full composed suite was not rerun and remains **not established**. Real timers in recipient/status/access tests, scoped helper timers, and required preservation of #49's virtual call-budget clock are documented separately rather than treating every real timer as proven broken.

## Evidence

All filenames below are relative to `$ORGASMIC_EVIDENCE_DIR`:
- `refresh.py`, `refresh.log`, public `pulls*.json`/`issues*.json`, `fork.diff`, `upstream.diff`, `diff-stat.txt`, `diff-names.txt`, `commits.txt`.
- `apply.py`, `apply-results.json`, numbered candidate patches/apply/conflict logs; `prepare-zero.py`, `prepare-disabled.py`, `prepare-pr31.py` and the corresponding `*-tested.patch` files.
- `npm-ci.log`, `npm-clean.sh`, `suite.sh`, `*-owner.txt` and driver logs.
- `prior-hang-inspection.txt`, `double-mock-probe.mjs`, `composed-input.patch`, `composed-diagnosis.sh`, `composed-diagnosis-processes.txt`, `mock-diagnostic-fix.patch`, `fix-mock-diagnostic.py`.
- `consistency.py`, `consistency-precommit.log`, `final-consistency-driver.log`; exact durable gate logs listed below.

- `gate-candidate-apply-01M620C4EDN7246MW0NZ22Q6A3.log`
- `gate-composed-diagnosis-01M620HM0J24TW47ZCMSQ80N2F.log`
- `gate-composed-diagnosis-fixed-01M620KM4DVC397R97G5WPT37V.log`
- `gate-disabled-suite-01M620FMBD3Y721TDZSSCVMV6A.log`
- `gate-double-mock-diagnosis-01M620E9SDVYDDXYCSD0Y313VF.log`
- `gate-final-consistency-01M620YHMYD5Z4C98SHZC2VXPA.log`
- `gate-label-suite-01M620CRYP62NKDFRPPWSHMSAZ.log`
- `gate-main-suite-01M620MS8X202T5DYN9A29DVVX.log`
- `gate-pr31-suite-01M620GTHKYF34DBV63C83JCGV.log`
- `gate-zero-suite-01M620DV2XC9YKE2P5WBXGD59S.log`

# Unmet Criteria

None for this documentation refresh. The explicitly allowed “not checked” / “hung / not established” outcomes are recorded rather than claimed as passing. At least the next two candidates were fully tested; all proposed connector PRs received an application check; exactly one local one-file commit was made and its consistency gate passed.

# Residual Risk

- Full composed suite, standalone unresolved feature extractions, Node 24+ recipient SQLite behavior, other supported Node versions, macOS, live Slack, and actual framework/host composition are not established.
- Clean application of a projected file set is not a dependency-complete PR; future extraction must preserve security ordering and #49's runner/clock/startup design.
- #12 remains behaviorally unresolved; #31 still needs maintainer review and a real branch refresh; #50's review notes were not edited here.
- PR states are snapshot facts. Companion acceptance, exact implementing revisions, generic protocol decisions and deployment readiness remain future work. No runtime migration claim is made.
