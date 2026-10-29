# TASK-ER984 — A4 activation, recovery 3

## Changed

- Commit: `b93646965e3667807fc5e889474ac852084c310d`; exactly one commit on `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`, with exact trailer `Co-Authored-By: GPT-6-Astra`. Working tree clean. No push, PR, comment, merge or dispatch close.
- Fetched upstream main again: `7274283fa719a17328ef8e085336ce25f6f22b08`, unchanged from the plan. No rebase/merge.
- Reviewed both supplied interrupted session JSONLs, existing tracked/untracked changes, original A4 plan, evidence logs and mutation script before editing. Kept the recovered implementation and completed its recovery/verification.
- Production diff: **165 insertions / 35 deletions across six files (200 changed lines)**, below the approximately 400-line stop rule. Total:

```text
 .env.example                                  |   8 ++
 README.md                                     |  65 +++++++++-
 changelog.d/access-policy-activation.added.md |  10 ++
 docs/access-policy-migration.md               | 101 +++++++++++++++
 src/access-policy.ts                          |  24 +++-
 src/config.ts                                 |  24 +++-
 src/content.ts                                |   5 +
 src/file-access.ts                            |  21 +--
 src/index.ts                                  |  19 ++-
 src/slack-adapter.ts                          | 107 +++++++++++++---
 test/accessActivation.test.ts                 |  65 ++++++++++
 test/accessAdmission.test.ts                  | 176 ++++++++++++++++++++++++++
 test/accessPolicy.test.ts                     |   8 +-
 test/accessStartup.test.ts                    | 110 ++++++++++++++++
 test/accessStartupChild.ts                    |  37 ++++++
 test/adapterAccess.test.ts                    |  25 ++--
 test/adapterAccessFixture.ts                  |   9 +-
 test/fileAccess.test.ts                       |  58 ++++-----
 test/fileReferences.test.ts                   |  10 +-
 test/groupDmAccess.test.ts                    |  18 +--
 20 files changed, 798 insertions(+), 102 deletions(-)
```

### Recovery / memory investigation

1. Historical `suite-22-retry.txt` finished printing test 872 but did not exit; it had failures in real upload-byte delivery and attachment-request observation. The earlier session itself identified two `t.mock.method(globalThis, 'fetch', ...)` calls inside one context's loop. Restoring these nested mocks leaves a recording proxy installed, contaminating unrelated tests. Recovery 1 moved that mock outside the loop, **but its already-running suite still had the old test input**.
2. Fresh, tiny `recovery3-mock-probe` confirms this restoration leak without running an unbounded suite: a subsequent test sees `fetch !== original` and a live `.mock`. It then explicitly restores the original. Evidence: `gate-recovery3-mock-probe-01M6459NR0PGMVWWDJ2D9AGRAV.log`; reproducible script `er984-mock-probe.cjs`.
3. Historical `mutations.txt` caught five mutants and stopped before `membership-cap`. That mutant changes `page < 5` to `page < 1`, not to an unbounded loop. Fresh capped runs catch it immediately. **There is no evidence that this mutant caused the 83–86 GB allocation.** Historical full-suite and mutation work overlapped. Without a heap/core/stack capture, attribution of the host OOM to a specific allocation path remains unproven; the confirmed mock leak and stale live suite are concrete findings, not a claim of exact forensic attribution.
4. Found real production unbounded paths independently: the new per-candidate admission retry loop trusted a waiter to stop; conversation listing and directory paging lacked cursor-cycle/hard-request limits; legacy backscroll's message-count cap did not bound an endless sequence of empty pages. Fixed: five admission attempts, five name-lookup attempts, 1000 listing requests/directory pages/backscroll pages, cursor-cycle refusal. These fail instead of claiming complete partial results. The existing five-page/200-members MPIM fallback remains fail-closed.
5. Regression fixtures have their **own finite safety ceilings**, so removing the production bounds cannot spin forever retaining mock-call arrays. Three explicit bound-removal mutants were caught, in addition to the seven functional mutants.
6. `XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope -p MemoryMax=4G -p MemorySwapMax=0` works here. Every runtime/test/npm/mutation command in this recovery ran within that scope, followed by `timeout 900 orgasmic dispatch gate ...`. Diagnostic full suites additionally used `--max-old-space-size=768` (mutants 512). No fallback, 8G raise, scope OOM or host OOM was needed.
7. Under the same 4G scope/768-MiB heap, pristine baseline suite: **785 pass / 0 fail**, `/usr/bin/time -v` maximum RSS **395,992 KiB**. Final suites: 22.23.3 **389,260 KiB**, 24.22.1 **400,684 KiB**, 22.12.0 **382,612 KiB**. These are measured maximum process RSS values, not a sum of the cgroup's concurrent RSS. Scope limits cover all descendants regardless.

### Decision → evidence

| Approved decision | Implementation / evidence |
|---|---|
| Strict presence-only opt-in; no defaults/fallback; immutable config; omitted groupDms stays omitted | `startupSettings`, validated constructor-time policy before auth; activation tests and real startup invalid/valid matrix |
| Replace all three legacy controls, never intersect | Policy-first hints/effect gates and conditional CLI options; invalid ignored controls, direct writes, DM writes/files, host publish and rollback tests |
| 3a: fresh MPIM proof | Exact metadata first; missing membership alone can ask members; five pages, cursor validation, bot/scope checks and shared deadline; admission/group/startup tests |
| 3b and #59 LOW: exact known modes / shared hint predicate | `readableFileState` reused by association, URL gate and hints; absent/unknown mode, deleted/tombstoned/external/non-visible state refuse; activation/file tests |
| 3c: DM files use allowed peers, not D pins | Real-server upload/rollback with conflicting legacy options; files:read required for deletion, wrong peer denied |
| 3d: workspace directory remains separate | Scope gate retained; startup notice, README/migration explicit boundary; deny-conversation startup still exercises directory |
| 3e: fresh admission, bounded work, no false complete listings | 200-unjoined/two-candidate call counts, duplicate suppression, stale candidate isolation, foreground transient propagation, bounded aggregate event diagnostics; additional hard-bound tests |
| 3f: contradictory ordinary pins refuse | Shared parser cross-field validation and valid group-only exception; parser/startup matrices |
| 3g: scopes, deletion/provenance residue, readonly policy, deny-all | Unknown scopes refuse before Socket Mode/listen; limited known grants start fail-closed; global deletion/residue semantics retained and documented; constructor fixtures replace mutation installers |
| Section 4 placements | W-peer coverage retained; no duplicate W-ID/prefilter patch or cherry-pick; no pinned-public/history fallback/schema, routing/host-contract import or #53 dependency |
| Sections 5–6 docs and verification | README field table/notices, legacy rows, `.env.example`, migration examples/matrix/scopes/rollback, changelog fragment; red/green, source+built startup, byte comparison below |

## Verification Gates

All logs below are in `/home/orgasmic/.orgasmic/runs/run-01M643VD3JNN49H750YV13M2HG/evidence`. Exact runtime orchestration is saved in `er984-final.sh`; guard/probes and mutation/comparison scripts are saved alongside it. Notifiers disabled (`NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`, audit/fund false); inherited `SLACK_*` removed. Tests use synthetic credentials only. Empty user/global npm configs, `npm ci --ignore-scripts --offline`: fresh **PASS** (`gate-verified-install-01M645P3ZZFBD55JG62P4DHGZK.log`). No package/lockfile changes.

| Gate / exact command core | Result / log |
|---|---|
| `recovery3-preflight -- bash -c '<HEAD; git fetch --no-tags upstream main; FETCH_HEAD>'` | PASS; `gate-recovery3-preflight-01M645BXXZQXNW6VJRPCFH2RAQ.log` |
| `verified-guard-probes -- node /tmp/er984-probes.cjs` | PASS: net/TLS/HTTP/HTTPS/DNS/fetch/WebSocket/non-loopback listen refused; inherited-child probe refused; loopback server/client succeeds; `gate-verified-guard-probes-01M645HS79260HXGR9BRQEN7QM.log` |
| `recovery3-baseline22 -- bash -c 'cd /tmp/er984-base3 && /usr/bin/time -v node --max-old-space-size=768 --import tsx --test --experimental-test-isolation=none test/*.test.ts'` | 785/0; `gate-recovery3-baseline22-01M645791ANAGHBVXMX3PYT59D.log` |
| `verified-red-baseline` | Expected RED: 29 intended behavioral assertion failures, no compilation failure, bounded termination against 3b1a97ac; `verified-red-baseline.txt`; `gate-verified-red-baseline-01M645H02NDTZQ0G4CM55QT04C.log` |
| `verified-final-all -- bash /tmp/er984-final.sh` | PASS; `gate-verified-final-all-01M645GBX8AFHSWYG2N6X6SVT8.log` |
| Full suite: `node --max-old-space-size=768 --import tsx --test --experimental-test-isolation=none test/*.test.ts` | **892 pass / 0 fail on each of 22.23.3, 24.22.1, 22.12.0**; `verified-suite-<version>.txt` |
| `npm run typecheck` and `npm run build` | PASS on **22.23.3 and 24.22.1**, version outputs in final-all log |
| Targeted activation/admission/policy/startup/adapter/server/group/file suites, same Node test flags | **309/0 × five repetitions**; `verified-targeted-1.txt` through `verified-targeted-5.txt` |
| `A4_BUILT=1 node --import tsx --test --experimental-test-isolation=none test/accessStartup.test.ts` | **50/0**, actual built entry + adapter/server, both transports; source matrix also in every full suite and repetition; `verified-built-startup.txt` |
| `verified-mutant-termination -- python3 /tmp/er984-mut-bounds.py` | **10/10 caught by test assertions**: ignored policy, legacy intersection, absent mode, hint bypass, contradictory pins, shortened member cap, DM veto, removed member cap, removed admission retry bound, removed history bound; `gate-verified-mutant-termination-01M645MYSMR62BA4SJ2NY2JRQR.log` |
| `committed-legacy-identity` | PASS, `cmp` byte identity for **30,511-byte stdout captures and 153-byte stderr captures**, base vs candidate; `gate-committed-legacy-identity-01M645V6DQ98SDN8NADG5QJ843.log` |
| `verified-changelog` | PASS, staged added-fragment rule copied from repository workflow; `gate-verified-changelog-01M645P4N1EZ9J7N44PBQCQ5DD.log` |
| `node --import tsx --test test/release-changelog.test.ts` | PASS, `verified-changelog-tests.txt` (within final-all) |
| `committed-smoke` | **84/0** activation/admission/release tests plus typecheck after fresh install; verifies clean tree, parent SHA and exact trailer; `gate-committed-smoke-01M645PVKMAX49W5N2D9H99RZ3.log` |

Legacy byte comparison executes the same scratch driver against an archived 3b1a97ac tree and final production code, with policy absent. It compares raw buffers, not normalized pretty JSON: settings/defaults/legacy failures, actual CLI stdio startup stderr/stdout, MCP/MCPL framing and tool list, list_channels, history/attachment URL shape, ordinary-channel, DM and MPIM-shaped fixture events, message/upload effects, publish and rollback. Fixed clock and deterministic UUID source are identical on both sides; no text normalization or selective filtering. In-memory protocol streams cover server framing; the current real-server startup matrix separately covers actual stdio and loopback TCP. Initial comparison failed only because the scratch driver called `emit` instead of the fixture's `emitMessage`; corrected before the passing comparison.

Earlier interrupted/dirty runs are **historical evidence, not reused green receipts**. The original red/installation/development logs informed inspection; fresh final execution above establishes results. Earlier 887-test suites preceded the extra pagination regressions and are superseded by 892-test suites. Final functional input bytes match the commit; README examples were completed while runtime gates finished. The clean committed smoke is explicitly reusable; precommit dirty receipts are not advertised as reusable.

Instructions/conventions: orgasmic skill, worker command-ownership/recovery/gate-receipts, project.org, CONTRIBUTING.md, original approved A4 plan. No applicable AGENTS.md found; supplied conventions/gotchas: none. No subagents used.

## Unmet Criteria

None for the implementation deliverable. Exact historical OOM allocation attribution remains an investigation limitation, not a claimed proof. No live Slack workspace or macOS execution was requested/performed.

## Residual Risk

- Live Slack response availability and throughput remain unverified. Fresh admission can drop acknowledged events during throttling/outages; no positive authorization cache or retry queue was added.
- Confirmed historical mock leakage is fixed, but an exact forensic explanation of the old 83–86 GB process is unavailable. Current baseline/candidate/mutant probes remain small and all future runtime work must stay scoped.
- New safety caps intentionally change pathological legacy paging/retry behavior and may reject extremely large workspaces. Normal deterministic legacy captures are byte-identical.
- Streaming responses that trickle indefinitely can still outlast request-start controls; no claim of a hard wall-clock bound on every response. Directory exposure, global multi-share deletion and provenance-loss upload residue remain deliberate documented limits.
- #59 must land first; no hot reload, pinned-public fallback, #53 tool disabling, routing or host-contract changes.

## PR body

### Problem
Explicit access policy was prepared but not installable by operators.

### Changes
Activate restart-only `SLACK_ACCESS_POLICY`, replacing legacy DM/write controls. Add fresh bounded MPIM admission, shared file-state gates, bounded retries/pagination, startup diagnostics and migration documentation. Normal legacy behavior remains byte-identical in deterministic comparison.

### Tests
892 pass / 0 fail on Node 22.23.3, 24.22.1 and 22.12.0; both builds/typechecks; 309 targeted tests ×5; source/built stdio+TCP startup matrix; 10 caught mutants; baseline byte comparison and changelog checks.

### Not verified
Live Slack and macOS. Historical host OOM's exact allocation path is unproven; all recovery runtime work used a 4G memory scope.

### Out of scope
Pinned-channel fallback, hot reload and #53.

### Companion PRs
**Depends on #59; merge #59 first.**
