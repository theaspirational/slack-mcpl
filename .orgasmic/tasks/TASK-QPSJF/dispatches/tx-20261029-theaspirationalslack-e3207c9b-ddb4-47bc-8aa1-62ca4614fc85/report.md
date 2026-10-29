# TASK-QPSJF — polish round

## Changed

- Amended commit: **e5112fe31abf7951a41cf0ca52d0162274a4bc6e**.
- Parent unchanged: **81657f195e734c1a43ab5bed9ddffe741630e15d** (#60). Exactly one commit above the base.
- Trailer retained: `Co-Authored-By: GPT-6-Astra`.
- Preflight HEAD was `dc0ad3c7c08105bc3361fefe8a3f5f425a34c251`; initial and final worktrees clean. Explicit staging, no hook bypass, push or PR.
- This round changes only README, the two requested server result paths, and their surface tests. No dependency/lockfile changes.
- Total production delta from the base: 141 insertions / 21 deletions, below the split threshold.

### Decision → evidence

| Requested polish | Implementation and evidence |
|---|---|
| Canonical Environment table | Three README rows state defaults 1000/1000/100, range 1–10000, startup refusal on invalid values, and link to Bounded pagination. `polish-static.py` checks all rows and the anchor. |
| Partial zero-match guidance | Keeps the incomplete/stop explanation, then echoes the query and explains substring matching, case insensitivity, bots/deactivated exclusion, and shorter-part/spelling hints. Tested in legacy and policy modes. |
| Consistent zero-match shapes | **Omit `users` on both zero-match branches.** The complete branch therefore retains the exact base object/text bytes. A new complete-zero-match test pins the whole object; the raw differential corpus independently stays exact. |
| Refresh note order | Added → unnamed DM → truncation → complete fallback. The combined unnamed-DM/scope/truncation test now requires the unnamed-DM opening while preserving both additional notes. |
| Closed refresh status | **No production change.** Two new cases (partial and complete in-flight scans) begin with incomplete background registration, close the host, and assert status clears, is not revived/reported, no conversations are announced, and only a partial scan carries incomplete markers. Existing closed-connection text is pinned. |
| PR body | Final section below adds the README-table note, updates counts, uses the requested changelog-only bullet and exact AI-assistance footer. |

Polish delta against reviewed commit:

```text
 README.md                       |  3 +++
 src/server.ts                   |  7 ++++---
 test/paginationSurfaces.test.ts | 37 ++++++++++++++++++++++++++++++++++++-
 3 files changed, 43 insertions(+), 4 deletions(-)
```

Complete amended diff against #60:

```text
 .env.example                            |   7 ++
 README.md                               |  61 +++++++++++++
 changelog.d/bounded-pagination.fixed.md |   8 ++
 docs/access-policy-migration.md         |  10 +++
 src/config.ts                           |   7 +-
 src/content.ts                          |   6 ++
 src/index.ts                            |   4 +-
 src/pagination.ts                       |  42 +++++++++
 src/server.ts                           |  60 ++++++++++---
 src/slack-adapter.ts                    |  43 ++++++++--
 test/accessStartup.test.ts              |  15 ++++
 test/accessStartupChild.ts              |   7 ++
 test/adapterAccessFixture.ts            |   5 +-
 test/cli.test.ts                        |   1 +
 test/legacyPagination.test.ts           |   2 +-
 test/paginationBounds.test.ts           | 147 ++++++++++++++++++++++++++++++++
 test/paginationSurfaces.test.ts         | 137 +++++++++++++++++++++++++++++
 17 files changed, 538 insertions(+), 24 deletions(-)
```

## Verification Gates

All log names below are relative to this round's evidence directory:
`/home/orgasmic/.orgasmic/runs/run-01M64R7J8SYE0EQ5E3QB51DV8R/evidence`.

### Safety and reproducibility

Every Node/npm/test/mutation command ran inside:

```sh
XDG_RUNTIME_DIR=/run/user/1002 systemd-run --user --scope   -p MemoryMax=4G -p MemorySwapMax=0 -- timeout 900   orgasmic dispatch gate <name> -- <command>
```

`run-safe` / `run-safe-corpus` set `NODE_OPTIONS="--max-old-space-size=768 --require=$ORGASMIC_EVIDENCE_DIR/loopback.cjs"`, unset inherited `SLACK_*`, set `NO_UPDATE_NOTIFIER=1`, disable npm update notifications/audit/fund, and use separate empty user/global npm configs. They assert the actual cgroup's 4-GiB/no-swap settings. Only synthetic fixture credentials were used. All pagination fixtures retain emergency ceilings; new refresh fixtures allow one background request and one pending refresh.

The local preload refuses non-loopback TCP/TLS/HTTP/HTTPS/WebSocket/fetch/redirect/DNS/UDP traffic and unsafe child execution. Probes verify denials, loopback success and guard inheritance with a replacement child environment on all three Nodes. The final guard also covers `process.execve`, and narrowly allows the installed compiler/esbuild native executables. It is a trusted-test safeguard, not an OS sandbox against hostile native code. No scope launch failed; no OOM or timeout occurred.

Dependencies were installed with:
`run-safe /opt/node/bin/node /opt/node/lib/node_modules/npm/bin/npm-cli.js ci --ignore-scripts --offline --audit=false --fund=false`.
Node versions were verified by each executable's `--version`. Build/cache/archive artifacts remain under ignored `dist/gates`, outside evidence.

### Results and commands

All entries use the mandatory outer envelope above.

| Gate / inner command | Result | Log |
|---|---|---|
| `polish-dependencies -- bash -c '<guard probe> && <npm ci command above>'` | PASS; probe and offline script-free install | `gate-polish-dependencies-01M64R95790V514AEDJMG9GT57.log` |
| `polish-red -- run-safe /opt/node/bin/node --import tsx --test --experimental-test-isolation=none test/paginationSurfaces.test.ts` | Expected red before production edits: 13 pass / 3 fail (two zero-match shapes and refresh priority) | `gate-polish-red-01M64R9MTJ8C4M252FNV8HH0HK.log` |
| `polish-green -- run-safe /opt/node/bin/node --import tsx --test --experimental-test-isolation=none test/paginationSurfaces.test.ts` | PASS: 16 / 0 after edits | `gate-polish-green-01M64RAF1BKEEVJRN6JCM7PPW2.log` |
| `polish-matrix-final -- bash "$ORGASMIC_EVIDENCE_DIR/final-matrix.sh"` | PASS on amended SHA, clean tree | `gate-polish-matrix-final-01M64RC91YXTMVF9N8TQSG04DV.log` |
| `polish-mutations -- python3 "$ORGASMIC_EVIDENCE_DIR/polish-mutations.py"` | PASS: 6/6 killed; restored 16 / 0; clean tree | `gate-polish-mutations-01M64RG3CD8383BECZ9VSQ4YFA.log` |
| `polish-static -- python3 "$ORGASMIC_EVIDENCE_DIR/polish-static.py"` | PASS: README rows/link, parent/trailer, single commit, clean tree, diff check | `gate-polish-static-01M64RG82AH8E4C21V2KPPE6F5.log` |

The definitive matrix executes:

- Guard/version probes, `node node_modules/typescript/bin/tsc --noEmit` and `node node_modules/typescript/bin/tsc` on **22.12.0, 22.23.3 and 24.22.1**. Incremental metadata is removed before each check/build. TypeScript's pinned package launches its native compiler.
- Full `node --import tsx --test --experimental-test-isolation=none test/*.test.ts`: **1005 pass / 0 fail on each of the three Nodes**.
- Targeted suite on 22.23.3: **314 pass / 0 fail each, repeated three times**. Files: paginationBounds, paginationSurfaces, legacyPagination, slackHistory, accessAdmission, accessRetry, listConversationScopes, registrationRecovery, forwardingLifecycle, accessStartup and cli (`test/*.test.ts`).
- `legacy-bytes.sh`: two guarded `node --import tsx legacy-corpus.mjs <root>` runs, followed by raw `cmp` and SHA256. Base freshly extracted using `git archive 81657f195e734c1a43ab5bed9ddffe741630e15d` to `dist/gates/polish-base`, sharing the installed dependencies.
- `node changelog-check.mjs`: actual release parser accepts the real fragment in disposable scratch; source changelog unchanged. Fragment presence and `git diff --check HEAD^` pass.

### Legacy byte corpus

`legacy-base.json` and `legacy-new.json` are exactly **103997 bytes** each:
53 raw protocol frame chunks, 21 log entries, 69 ordered API traces and 11 adapter-result entries.

Both SHA256:
`8ae44b1388694791670d0cf9a5fa4e47ce7ab000ec1822db33fe1a94b423221d`.

Scenarios cover empty/multipage lists, scope omissions/restart, DM names, retry/refusal, zero/nonzero user matches, refresh, tools/list, history and backscroll. UUIDs and synthetic error stacks are controlled inputs; output is not normalized. Resource diagnostics go to stderr, not corpus stdout.

### Mutations

Six independent mutants are killed by assertion failures (not parse errors/timeouts); original source is restored in a finally block:

1. Drop partial query/matching guidance.
2. Add `users: []` to zero-match results.
3. Drop zero-match incomplete metadata.
4. Restore truncation-before-unnamed refresh priority.
5. Add registration status to the connection-closed refresh response.
6. Preserve stale registration status on disconnect.

Evidence: `polish-mutations.json`, `polish-mutations.py` and the six `mutation-*.log` files. The first four cover changed production code; the last two validate the newly pinned closed-connection contract. A restored green run and clean-tree assertion finish the gate.

### Failures and resource evidence

- The expected red failures above were resolved by the requested polish.
- Initial `polish-matrix` stopped at Node 22.12's typecheck because the inherited preload allowlist named the older native compiler package, not the installed `@typescript/typescript-linux-x64/lib/tsc`. This is a harness compatibility failure, not a product regression or scope failure. Newer Nodes had used the compiler's execve path. The guard was corrected to allow only the installed compiler path as well, cover execve, and probe that path's unsafe-execution refusal. The entire matrix was rerun successfully; the failed receipt is not reused: `gate-polish-matrix-01M64RB9F7G5SBMGF2W5R1RFR3.log`.
- Definitive matrix peak RSS: **389916 KiB** (380.78 MiB); observed cgroup peak **364949504 bytes**. Old-space remains 768 MiB and scope limits remain 4 GiB / no swap. `matrix-owner.txt` records the runner PID/process group; durable console and gate logs record completion.

### Inherited evidence and limits of reuse

The approved implementation, selected plan and previous report remain context:
`/home/orgasmic/.orgasmic/runs/run-01M64K55EW133WTY5HH3SERAKR/evidence/report.md`.
Applicable baseline/CONTRIBUTING/skill instructions and absence of supplied conventions/gotchas are unchanged. The prior corpus/probe/wrapper scripts were inspected and copied to this round's evidence directory; the guard was corrected as described. Base source and lockfile are unchanged. **No earlier-round gate receipt is claimed as a current pass**, and the earlier 46 mutations are historical evidence only; this round's six are freshly executed. All requested polish gates were rerun on the amended commit. The early red/green and install logs are explicitly identified as pre-amend checks, not final clean-commit suite receipts.

## Unmet Criteria

None. The single commit was amended with its exact parent and trailer retained; all requested polish and gates are complete. No push or PR was performed.

## Residual Risk

No live Slack workspace was used. Finite caps can omit real data; repeated calls restart rather than resume. Page budgets do not bound cumulative waits, bytes or aggregate concurrent work. The byte corpus proves its sampled complete paths, not every possible transcript or source-location stack trace. Closed-connection tests pin current status omission/cleanup rather than introduce a new status API.

## Public PR body — draft only, not submitted

### Problem

Distinct pagination cursors can keep workspace listings, directory searches and backscroll traversing indefinitely. A throwing cap would discard useful results in very large workspaces, while silently stopping would misrepresent incomplete data.

### Changes

- Bound successful pagination pages with validated operator defaults: 1000 conversation pages, 1000 directory pages and 100 backscroll pages; accepted range 1–10000.
- Retain eligible partial results and explicitly identify incompleteness in list_channels, find_user, backscroll, background registration and refresh_channels.
- Also identify existing 25-match and message-limit stops as incomplete when more results remain.
- Preserve cycle guards, per-candidate admission retries, registration GaveUp behavior and the fail-closed MPIM members cap.
- Preserve complete results below all limits; partial zero-match searches retain matching guidance, and refresh prioritizes unnamed-DM guidance.
- Document all three page settings in the canonical README Environment table, including defaults, range, invalid-value startup refusal and links to Bounded pagination.
- Add operator documentation and a changelog fragment.

### Tests

- **1005 pass / 0 fail** on Node **22.12.0, 22.23.3 and 24.22.1**.
- Typecheck and build pass on all three versions.
- Targeted suite: **314 pass / 0 fail, repeated three times**.
- Focused polish checks fail before the changes and pass afterward; **6/6 polish mutations killed**.
- Raw legacy differential corpus matches `81657f19` exactly.
- Connection-closed refresh tests pin registration-status cleanup and omission for partial and complete scans.
- Changelog validation passes.

### Not verified / limitations

No live Slack workspace was used. Page limits are not total-duration or byte limits. Refresh starts over rather than resuming and may repeatedly return the same incomplete subset.

### Dependency and merge order

**Depends on #60. Merge #60 first.** This commit is stacked directly on `81657f195e734c1a43ab5bed9ddffe741630e15d` and retains its cursor-cycle and access-policy behavior.

AI-assisted implementation with GPT-6-Astra.
