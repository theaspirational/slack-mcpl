# TASK-ER984 — round 3 review fixes

## Changed

Commit: **`81657f195e734c1a43ab5bed9ddffe741630e15d`**. Amended into exactly **one commit on `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`**, retaining `Co-Authored-By: GPT-6-Astra`. Working tree clean. No push, PR/comment, merge or dispatch close.

Read the latest review in full: reviewer run `run-01M645X1HH07RQRW0DQH4715SY`, review of `b93646965e3667807fc5e889474ac852084c310d`, including its findings, probes, verification and residual-risk sections. The requested fixes are complete.

Round-only delta from reviewed commit: **15 files, +157/−59**. Complete amended diff: **23 files, +897/−103**. Production: **170 additions / 37 deletions**, six files, below the approximately 400-production-line stop rule.

```text
 .env.example                                  |   8 ++
 README.md                                     |  67 +++++++++++-
 changelog.d/access-policy-activation.added.md |  11 ++
 docs/access-policy-migration.md               | 107 +++++++++++++++++++
 src/access-policy.ts                          |  24 ++++-
 src/config.ts                                 |  30 +++++-
 src/content.ts                                |   3 +
 src/file-access.ts                            |  21 ++--
 src/index.ts                                  |  28 +++--
 src/slack-adapter.ts                          | 101 +++++++++++++++---
 test/accessActivation.test.ts                 |  81 ++++++++++++++
 test/accessAdmission.test.ts                  | 146 ++++++++++++++++++++++++++
 test/accessEntryLoader.mjs                    |  16 +++
 test/accessPolicy.test.ts                     |   8 +-
 test/accessRetry.test.ts                      |  60 +++++++++++
 test/accessStartup.test.ts                    | 111 ++++++++++++++++++++
 test/accessStartupChild.ts                    |  39 +++++++
 test/adapterAccess.test.ts                    |  25 ++---
 test/adapterAccessFixture.ts                  |   9 +-
 test/fileAccess.test.ts                       |  56 +++++-----
 test/fileReferences.test.ts                   |  10 +-
 test/groupDmAccess.test.ts                    |  18 ++--
 test/legacyPagination.test.ts                 |  21 ++++
 23 files changed, 897 insertions(+), 103 deletions(-)
```

### Fix → evidence

| Finding | Fix | Evidence |
|---|---|---|
| H1: DM-name cap bypasses give-up | Removed `inARow < 5`; restored the base loop and existing GaveUp/disable-later-waits path exactly | `accessRetry.test.ts` runs real background registration and the actual server waiter: 3 always-failing DMs, waiter counters 1–10, nine sleeps, one give-up log, lookup counts 10/1/1, all three registered with ID labels. H1 mutant caught. Extended baseline comparison captures identical waiter calls/logs/results. |
| H2: admission increments page counter | Candidate loop passes its own `attempts + 1` to the waiter; page-level `limited` is untouched | Real registration of 25 candidates, each failing once then succeeding: 25 counters all equal 1, 50 info requests, all 25 registered, no GaveUp. H2 mutant caught. |
| Three count caps exceed scope | Removed listing request count, directory page count and backscroll page count caps; kept all three cursor-cycle guards | `legacyPagination.test.ts` uses no policy: each of the three paths rejects a repeated cursor at two calls; each also completes 1,002 distinct pages. All three cycle-removal mutants caught. Five-attempt policy admission and five-page MPIM membership bounds retained and mutation-tested. |
| Real group upload test masked missing scope | Restored `writeChannels: ['G1']` in the named real upload regression | Full suite and committed smoke include the test: missing mpim:write refuses before ticket/bytes despite a valid group write pin. |
| Public PR body | Removed operational recovery/memory discussion | Public body is the final section below; explicitly discloses the legacy repeated-cursor fix. |
| CLI header | Each of the three legacy variable descriptions now says it is ignored under SLACK_ACCESS_POLICY | Source inspection and typecheck/build. |
| Unbounded bad-value echo | Both JSON and shape refusals use a maximum 200-character escaped preview plus `…(N chars)` for longer values | Long syntax-invalid and shape-invalid values, including newline amplification, produce bounded single-line diagnostics; truncation-removal mutant caught. Short refusal bytes preserved. |
| M2 / M13 test gaps | Config test verifies legacy lists/switch are discarded; test-only module wrapper observes the real entry's argument to connectSlack before delegating unchanged | M2 caught by one assertion; M13 caught by both stdio/TCP startup rows. The entry observer runs against both source and built entries; production has no extra hook. |
| Retry wording / G-prefix config | Docs distinguish five attempts per policy candidate from existing DM-name give-up. Removed all count-cap claims; documented cycle fix in README, migration guide and changelog. G-prefix dead config remains documentation-only | Changelog workflow check and source/docs review. No schema or admission broadening. |

## Verification Gates

Evidence directory: `/home/orgasmic/.orgasmic/runs/run-01M647X747D622YM3RJX0XT3HZ/evidence`. Exact orchestration/artifacts: `safe.sh`, `loopback.cjs`, `probes.cjs`, `verify.sh`, `identity.mts`, `identity.sh`, `mutations-all.py`, `mutations.json`.

Every Node/npm/test/mutation invocation ran inside:

```sh
XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope \
  -p MemoryMax=4G -p MemorySwapMax=0 -- \
  timeout 900 orgasmic dispatch gate <name> -- <command>
```

`NODE_OPTIONS` includes the proved loopback preload and `--max-old-space-size=768`, inherited by npm and children; direct Node invocations also specify the heap flag. Notifiers/audit/fund disabled, inherited SLACK_* unset, empty user/global npm configs. No scope launch or memory-limit failure and no uncapped fallback.

| Gate / command | Result and evidence |
|---|---|
| `r3-guard -- node --max-old-space-size=768 <evidence>/probes.cjs` | PASS: net/TLS/HTTP/HTTPS/DNS/fetch/WebSocket/non-loopback listen refused, child inherits guard, loopback succeeds. `gate-r3-guard-01M6481RK1EH743D5GQJGRV4FJ.log` |
| `r3-install -- npm ci --ignore-scripts --offline` | PASS, empty configs; `gate-r3-install-01M6481S40XY3Y9R57JWVF4NWB.log` |
| `r3-review-red -- node … --test … test/accessRetry.test.ts test/legacyPagination.test.ts` before fixes | Intended RED: 3 pass / 5 fail, reproducing H1, H2 and the three count caps. `gate-r3-review-red-01M6483SNN30DWAD3ZA4JBZBGH.log` |
| `r3-final-verification -- bash <evidence>/verify.sh` | PASS; `gate-r3-final-verification-01M6489HRNR8KNJXGXMP9GF6H7.log` |
| Full suite: `node --max-old-space-size=768 --import tsx --test --experimental-test-isolation=none test/*.test.ts` | **897 pass / 0 fail** on **22.23.3, 24.22.1, 22.12.0**; `suite-<version>.txt` |
| `npm run typecheck && npm run build` | PASS on **22.23.3 and 24.22.1**, version output and commands in verification log |
| Source/built real startup, stdio + TCP | Source matrix included in each suite and repetition; built matrix **50/0 on each build version**; `built-node-v<version>-linux-x64.txt` |
| Targeted tests ×5 | **314 pass / 0 fail each**, `targeted-1.txt` through `targeted-5.txt`; activation/admission/retry/legacy pagination/policy/startup/adapter/server/group/file suites |
| Mutations | **28 checked: 27 caught, one equivalent survivor (M10)**. First nine valid results in `mutations-focused.txt`; remaining results and final aggregate in `mutations-complete.txt` / `mutations.json`. `gate-r3-mutations-focused-01M648FKAV89QBVBE4N9PEY30A.log`; `gate-r3-mutations-complete-01M648KAP9338QWBP7QT9CBSY0.log` |
| `r3-legacy-identity -- bash <evidence>/identity.sh` | PASS, **262,336-byte stdout captures and 565-byte stderr captures byte-identical** against 3b1a97ac; `gate-r3-legacy-identity-01M648B0SDMM1EYSNPZY5D3JJX.log` |
| Changelog tests and workflow | **27/0** release tests (`changelog-tests.txt`); added-fragment workflow check and staged whitespace check PASS; `gate-r3-changelog-01M648PGTFKDF3589KY320P7WC.log` |
| `r3-committed-smoke` | Clean amended parent/trailer checks, typecheck and **168/0** review/activation/startup/file tests; `gate-r3-committed-smoke-01M648Q3VS65W7FBB3DSY2F9H2.log` |

### Memory measurements

`/usr/bin/time -v` peak RSS for full suites: **383,240 KiB** (22.23.3), **403,420 KiB** (24.22.1), **385,616 KiB** (22.12.0). Largest measured suite RSS: **403,420 KiB ≈ 394 MiB**. These are maximum process RSS measurements, not a sum of simultaneous cgroup RSS; the 4G scope bounds the entire process tree.

### Mutation results and harness corrections

M1–M9 and M11–M22 caught, including **M2 and M13**. M10 removes the early return after policy authorization and runs the legacy assertion too; it remains equivalent because that assertion uses the policy-aware `canWrite`. It survives **all 897 tests**, consistent with the review's explanation. New H1, H2, three legacy cycle guards and unbounded diagnostic echo mutants are all caught. Fixtures retain independent finite ceilings so cycle-removal mutants terminate with assertions.

The initial broad mutation run was deliberately stopped through its proven-owned gate: invalid-policy mutants caused redundant startup rows to reach their child timeouts. Its interrupted receipt is retained (`gate-r3-mutations-01M648C414DRX1KSB0S6B65VKR.log`, `gate-r3-mutations-complete-01M648KAP9338QWBP7QT9CBSY0.log`, `gate-r3-mutations-focused-01M648FKAV89QBVBE4N9PEY30A.log`); focused behavioral tests establish the same mutations without those long startup rows. An incomplete scratch fixture then made M10 fail only because `scripts/release-changelog.mjs` was missing; this was **not** counted as a caught mutant. Restoring the scripts and rerunning M10 gave 897/0; remaining mutants then completed. `mutation-M10-incomplete-fixture.txt` preserves that diagnostic. The initial entry observer missed tsx query suffixes, causing two test failures; accepting those suffixes fixed the test instrumentation, and all final source/built matrices pass. No product failure remains hidden as a harness pass.

### Legacy comparison and inherited evidence

Fresh archive of **3b1a97ac**, separate scratch tree, same dependencies and driver on both sides. The inherited driver design covers settings/legacy refusals, real CLI startup, MCP/MCPL wire/tool lists, listing, history/attachment URL shape, messaging/upload effects, publish/rollback and inbound fixtures. This round extends it to **1,002-page listing, directory and history paths**, recording request cursors and complete results, plus the **actual server DM-name waiter**, recording 1–10 counters, 10/1/1 lookups, one give-up log and final labels. Clock/UUID sources are fixed identically, with no text normalization. Repeated cursors are intentionally different from the base and verified separately by the three legacy regression tests; no identity claim covers the old infinite loop.

Earlier reviewer/implementer results were read as context, **not reused as this round's green receipts**. Inherited unchanged guard/probe source and byte-driver structure were re-proved/rerun. The final tests ran on the source now in the amended commit; clean committed smoke verifies the resulting tree. Instructions/conventions remain the already-read orgasmic worker command-ownership/recovery/gate-receipts guidance, project.org and CONTRIBUTING.md; no applicable AGENTS.md or supplied extra conventions/gotchas. No subagents used.

## Unmet Criteria

None. M10 is explicitly reported as an equivalent surviving mutant; the requested M2 and M13 gaps and all requested new mutation cases are covered.

## Residual Risk

Live Slack, macOS and real rate-limit throughput were not exercised. Fresh policy admission can drop acknowledged events during outages; directory exposure and global file deletion remain documented boundaries. Removing the count caps restores base behavior for distinct-page streams; repeated cursors fail explicitly. A syntactically valid G ID naming a private channel still cannot authorize an MPIM, as documented.

## PR body

### Problem
Prepared access policies could not be enabled by operators. Activation needs strict startup validation and consistent admission across reads, writes and file operations.

### Changes
Add restart-only `SLACK_ACCESS_POLICY`, replacing legacy DM/write controls, with fresh bounded MPIM checks, independent per-candidate retries, shared file-state gates and migration documentation. Preserve legacy DM-name give-up behavior. In legacy and policy listing, directory and history paging, **a repeated pagination cursor now fails instead of looping forever**. Long invalid-policy diagnostics are truncated.

### Tests
897 pass / 0 fail on Node 22.23.3, 24.22.1 and 22.12.0; both builds/typechecks; 314 targeted tests ×5; source/built stdio+TCP startup; 27 caught mutants and one equivalent survivor; extended legacy byte comparison; changelog checks.

### Not verified
Live Slack, macOS and real rate-limit throughput.

### Out of scope
Pinned-channel fallback, hot reload and #53.

### Companion PRs
**Depends on #59; merge #59 first.**
