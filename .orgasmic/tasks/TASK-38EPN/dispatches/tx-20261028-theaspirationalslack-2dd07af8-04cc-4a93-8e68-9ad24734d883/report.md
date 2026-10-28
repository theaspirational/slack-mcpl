# Changed

- Base: `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`, confirmed by a fresh read-only upstream-main fetch; unchanged from the planned head. Reset the task branch to it and confirmed a clean tree before edits.
- Final: `d5a84bccdca69a9804df28f834616a2ea73abfd5` — **Allow zero automatic backscroll**. Exactly one local commit; default author retained, requested co-author trailer included. No push, PR, or remote comment.
- Accept zero in the existing bounded getter and guard the sole automatic `fetchHistory` call with `backscrollLimit > 0`. Explicit history paths are unchanged.
- Added two regression cases to `test/operatorControls.test.ts`, updated the README variable row, and added one `added` changelog bullet, following the operator-control precedent.
- Considered `src/config.ts` / `startupSettings`: retained the getter because it rereads the environment during delivery, including for directly constructed servers. Startup-only parsing would freeze the value and require extra constructor/startup wiring. No startup parser or `test/config.test.ts` changes were needed.
- Preserved the fork's bounded-value semantics rather than introducing endpoint saturation: out-of-range values still fall back to 50. Before and after, `abc` produces `NaN` from `parseInt`, fails the finite/range check, and returns **50**, without startup rejection; automatic history remains enabled.
- The same-instance parser probe confirms: unset/empty → 50, `1` → 1, `7` → 7, `1000` → 1000, `-1`/`1001`/`abc` → 50, `7junk` → 7, `1.5` → 1 on both versions of the code. Only `0` changes from 50 to 0.
- Read the supplied project baseline, `CONTRIBUTING.md`, changelog instructions, the reference document at `a2295638`, the prior extraction, and fork source. No additional project conventions/gotchas were supplied; no applicable `AGENTS.md` was found.

```text
README.md                            |  2 +-
 changelog.d/zero-backscroll.added.md |  2 ++
 src/server.ts                        | 10 ++++++----
 test/operatorControls.test.ts        | 27 +++++++++++++++++++++++++++
 4 files changed, 36 insertions(+), 5 deletions(-)
```

# Verification Gates

All checks ran through `orgasmic dispatch gate <name> -- timeout 900 <command>` in the task worktree. Every final gate ran at the final commit with a clean tree. All paths below are relative to this report's evidence directory.

| Engine | Base full suite | Final full suite | Final typecheck/build |
|---|---:|---:|---|
| Node 22.23.3 | 584 pass / 0 fail | 586 pass / 0 fail | Both pass |
| Node 24.22.1 | 584 pass / 0 fail | 586 pass / 0 fail | Both pass |

All full runs: zero skipped, cancelled, or todo tests. `npm test` uses upstream's one-process runner: `node --import tsx --test --experimental-test-isolation=none test/*.test.ts`.

- Red: tests added with production unchanged from base → **13 pass / 1 fail**; the zero-limit case observed `history:C1` instead of no read.
- Green: production fix → **14 pass / 0 fail** in the operator-control file. The zero case delivers the incoming message without backscroll, then an explicit `fetch_history` returns the fixture message. Limit 7 still automatically reads and delivers backscroll, and explicit history also works.
- Mutation: remove only `&& backscrollLimit > 0`, retain zero acceptance → **13 pass / 1 fail**, with the same unexpected automatic read. Restored the original file byte-for-byte before committing; no mutant committed. See `mutant-production.patch` and `regression-tests.patch`.
- Installation passed both at base and at final: `npm ci --ignore-scripts --registry=https://registry.npmjs.org`. Used two distinct empty user/global npm config files outside the repository, disabled audit/fund requests, and disabled update notifiers from the first command.
- Node 24.22.1 was downloaded into scratch outside the repository from nodejs.org and verified against that release's `SHASUMS256.txt`: `node24-checksum.log`.
- No tracked lockfile or generated-file changes. Build output stayed in ignored `dist/`; dependencies and the scratch runtime are not evidence artifacts.

## Commands and logs

| Gate | Command after `timeout 900` | Outcome | Log |
|---|---|---|---|
| `base-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-base-npm-ci-01M622HN70Z43EAXX99RHVYREE.log](gate-base-npm-ci-01M622HN70Z43EAXX99RHVYREE.log) |
| `base-node22-suite` | `npm test` | 584/0 | [gate-base-node22-suite-01M622HNN4X0F36FM3G192PJY5.log](gate-base-node22-suite-01M622HNN4X0F36FM3G192PJY5.log) |
| `base-node24-suite` | `npm test` | 584/0 | [gate-base-node24-suite-01M622JQBKXGZHXCHW0E270E30.log](gate-base-node24-suite-01M622JQBKXGZHXCHW0E270E30.log) |
| `base-parser-probe` | `node --import tsx "$ORGASMIC_EVIDENCE_DIR/backscroll-probe.mjs"` | pass | [gate-base-parser-probe-01M622KAXRHM816ZM9PZK8GZX6.log](gate-base-parser-probe-01M622KAXRHM816ZM9PZK8GZX6.log) |
| `red-operator-controls` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 13/1, expected red | [gate-red-operator-controls-01M622KVN49FNKS8A3H4FS2NVW.log](gate-red-operator-controls-01M622KVN49FNKS8A3H4FS2NVW.log) |
| `green-operator-controls` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 14/0 | [gate-green-operator-controls-01M622MB5F8STB7JTDCNC85PC4.log](gate-green-operator-controls-01M622MB5F8STB7JTDCNC85PC4.log) |
| `mutation-guard` | `node --import tsx --test --experimental-test-isolation=none test/operatorControls.test.ts` | 13/1, expected red | [gate-mutation-guard-01M622MQBQE40VM6JHHG176G0G.log](gate-mutation-guard-01M622MQBQE40VM6JHHG176G0G.log) |
| `precommit-typecheck` | `npm run typecheck` | pass | [gate-precommit-typecheck-01M622N5TYGDZXVNF48PK7RQKB.log](gate-precommit-typecheck-01M622N5TYGDZXVNF48PK7RQKB.log) |
| `final-node22-npm-ci` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | [gate-final-node22-npm-ci-01M622NS3419VFCFXNYZGYDXS5.log](gate-final-node22-npm-ci-01M622NS3419VFCFXNYZGYDXS5.log) |
| `final-node22-typecheck` | `npm run typecheck` | pass | [gate-final-node22-typecheck-01M622NSMKF8XJK2G8VX92K58C.log](gate-final-node22-typecheck-01M622NSMKF8XJK2G8VX92K58C.log) |
| `final-node22-build` | `npm run build` | pass | [gate-final-node22-build-01M622NSWFWK8VF1MBGYM0C8HT.log](gate-final-node22-build-01M622NSWFWK8VF1MBGYM0C8HT.log) |
| `final-node22-suite` | `npm test` | 586/0 | [gate-final-node22-suite-01M622NT4F9DZ8YTKSTGSHRGXM.log](gate-final-node22-suite-01M622NT4F9DZ8YTKSTGSHRGXM.log) |
| `final-node22-parser-probe` | `node --import tsx "$ORGASMIC_EVIDENCE_DIR/backscroll-probe.mjs"` | pass | [gate-final-node22-parser-probe-01M622P8257HC70MS64BW70MPQ.log](gate-final-node22-parser-probe-01M622P8257HC70MS64BW70MPQ.log) |
| `final-node24-typecheck` | `npm run typecheck` | pass | [gate-final-node24-typecheck-01M622P8A0ZCM82Z8NN2EKBHEX.log](gate-final-node24-typecheck-01M622P8A0ZCM82Z8NN2EKBHEX.log) |
| `final-node24-build` | `npm run build` | pass | [gate-final-node24-build-01M622P8HXCC8H9K38EQDFA34E.log](gate-final-node24-build-01M622P8HXCC8H9K38EQDFA34E.log) |
| `final-node24-suite` | `npm test` | 586/0 | [gate-final-node24-suite-01M622P8SV3P41QZB49483EE3R.log](gate-final-node24-suite-01M622P8SV3P41QZB49483EE3R.log) |

# Unmet Criteria

None. All required checks ran successfully; the expected regression and mutation failures were reproduced. The named reference branch was not available from the fork remote, but its requested commit/document was already locally readable and was inspected; the fork main fetch succeeded.

# Residual Risk

Not exercised against a live Slack workspace. Integration tests use the real server/adapter with the existing in-memory transport and fake Slack API. No additional operating-system matrix was run. Legacy permissive `parseInt` handling and invalid-value fallback are intentionally unchanged.
