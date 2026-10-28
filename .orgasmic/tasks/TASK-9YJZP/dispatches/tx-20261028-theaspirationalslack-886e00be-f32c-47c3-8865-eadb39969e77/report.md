# Changed

Round-2 base/preflight: `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` (matched).
Final SHA: **`13692e01c58dd65ad74496afda351ed96c72d9e6`**.
One local commit this round: `13692e0` — `fix: complete conversation label framing and coverage`.

All four review findings were checked against current source before editing:
- `CONTRIBUTING.md` requires a fragment for behavior changes; `.github/workflows/changelog.yml` checks newly **added** fragments. The prior round added none. Added `changelog.d/channel-label-framing.fixed.md`, following the existing fragment style, as one bullet without headings.
- `src/channels.ts` unconditionally appended the quoted workspace name, including an empty string. `src/server.ts:156` conditionally omits an empty workspace. Descriptors now do likewise for all four kinds. This intentionally changes both round 1's ` ("")` and the older pre-existing ` ()` output to no suffix.
- `test/channels.test.ts:38–39,46–61` now exercises and rejects the expanded leak class from the existing sender-framing test: U+2028/U+2029, U+0085, DEL/C1, U+202E/U+0600 format characters, U+FE0F/U+3164 default-ignorables, U+2800, and U+00A0/U+3000 spaces, as well as angle brackets and CR/LF. JSON round trips remain checked for conversation and workspace names across all four kinds. The assertion covers the entire DEL/C1 range.
- `test/channels.test.ts:64–67` adds four empty-workspace cases. `test/senderFraming.test.ts:325–337` adds an ordinary-channel harness test verifying the exact quoted label in `channels/register` and the parsed write-result `to`, absence of raw angle brackets/newlines, and name round-trip including `#`.

## Production diff

Only `src/channels.ts` changed in production: four added lines, three removed, **net +1 line**, within scope. Final lines 25–29:

```diff
+  const team = teamName ? ` (${nameShown(teamName)})` : '';
   const label =
-    conv.kind === 'dm' ? `DM: @${nameShown(conv.name)} (${nameShown(teamName)})` :
-    conv.kind === 'group_dm' ? `Group DM: ${nameShown(conv.name)} (${nameShown(teamName)})` :
-    `${channelShown(conv.name)} (${nameShown(teamName)})`;
+    conv.kind === 'dm' ? `DM: @${nameShown(conv.name)}${team}` :
+    conv.kind === 'group_dm' ? `Group DM: ${nameShown(conv.name)}${team}` :
+    `${channelShown(conv.name)}${team}`;
```

No lockfile/dependency changes or tracked generated artifacts. No push, remote comment, merge, or main-checkout edit.

## Changelog fragment, verbatim

```markdown
- An ordinary or private channel's name and the workspace's name in a conversation's label now follow the name rule: quoted when not plain, with the channel's `#` inside the quotes. Plain names are unchanged; an empty workspace name is omitted rather than shown in parentheses. These labels reach `channels/register`, `channels/changed`, `channels/open`, `refresh_channels`' `added`, and a write's `to`.
```

The named paths were confirmed in `src/server.ts`: registration at 1237–1240, changed notification at 1323, open results at 1425/1450, refresh added labels at 1404, write recipient label at 1111.

# Verification Gates

All checks and scoped probes ran through `orgasmic dispatch gate <name> -- <command>`. Log links below are relative to this report's evidence directory.

Update notifiers were disabled from the first command. Both base and final installations used `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, with two distinct empty user/global npm config files outside the repository. Both installations succeeded. Node on PATH reported **v22.23.3**. The previously downloaded Node **v24.22.1** archive and official `SHASUMS256.txt` in outside-repository scratch storage were reused; `sha256sum --check selected-shasum.txt` freshly reported `node-v24.22.1-linux-x64.tar.xz: OK`, and the extracted binary reported `v24.22.1`. Evidence: `node24-reverified.log`.

## Red/green evidence

Each group used one temporary production edit in `src/channels.ts`, with no test edits during the probe. Every changed/new test was red under its group's mutant, then green. After each red run, exact original bytes were restored and `git diff --exit-code -- src` returned 0 before green. No mutant was committed.

| Group | Temporary edit | Targeted command after gate wrapper | Red | Restored green |
| --- | --- | --- | --- | --- |
| Empty workspace | Make the workspace suffix unconditional again | `node --import tsx --test --test-name-pattern 'toDescriptor omits an empty workspace' test/channels.test.ts` | 4 fail / 0 pass | 4 pass / 0 fail |
| Expanded hostile names | Replace the escaped `\\u2028` in the returned label with literal U+2028, specifically testing the newly expanded leak assertion | `node --import tsx --test --test-name-pattern 'toDescriptor quotes hostile' test/channels.test.ts` | 8 fail / 0 pass | 8 pass / 0 fail |
| Ordinary-channel harness | Replace `channelShown(conv.name)` with raw `#${conv.name}` | `node --import tsx --test --test-name-pattern 'a hostile ordinary-channel label' test/senderFraming.test.ts` | 1 fail / 0 pass | 1 pass / 0 fail |

Reproduction script: `mutations.py`. Exact mutants: `r2-empty-mutant.patch`, `r2-unicode-mutant.patch`, `r2-harness-mutant.patch`. Byte-restore/source-diff evidence: `r2-empty-restore.log`, `r2-unicode-restore.log`, `r2-harness-restore.log`. Red gates exit 1 intentionally; green gates exit 0. The combined scoped check also passed **44/44** before the commit.

## Inherited evidence and scope

Round 1's formatting-helper inspection and other-source name-site inventory remain relevant: `src/framing.ts`, `src/server.ts`, `src/content.ts`, and `src/history-read.ts` are unchanged this round. This round changes only the descriptor workspace suffix in production, so it neither adds another raw-name rendering path nor alters those helpers. These are inherited scope observations, **not reused gate passes**. The earlier scratch Node archive was inherited but its checksum/version were reverified. Base counts below were freshly measured at `252365fe`, and all final gates were freshly run at `13692e0`; no earlier-round gate receipt was substituted.

A setup invocation accidentally attempted the placeholder command `--placeholder` under gate `r2-base-ci`; it failed to spawn (exit 127) before invoking npm or tests. The correctly named `r2-base-npm-ci` then ran the required install successfully. This was a command-setup error, not an npm-ci refusal; its failed receipt is retained.

## Gate receipts

All `r2-final-*` gates passed at final commit `13692e01c58dd65ad74496afda351ed96c72d9e6`, clean at start and finish.

| Gate | Node | Command after wrapper | Result / log |
| --- | --- | --- | --- |
| `r2-base-npm-ci` | 22.23.3 | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | PASS — [gate-r2-base-npm-ci-01M61QPRS0SPEBDVJ0QB228PFQ.log](gate-r2-base-npm-ci-01M61QPRS0SPEBDVJ0QB228PFQ.log) |
| `r2-base-test22` | 22.23.3 | `npm test` | PASS — [gate-r2-base-test22-01M61QPSDKCTBK4PBZJH387JYS.log](gate-r2-base-test22-01M61QPSDKCTBK4PBZJH387JYS.log) |
| `r2-base-test24` | 24.22.1 | `npm test` | PASS — [gate-r2-base-test24-01M61QQES97K4ABE61BSP5TKTZ.log](gate-r2-base-test24-01M61QQES97K4ABE61BSP5TKTZ.log) |
| `r2-final-ci` | 22.23.3 | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | PASS — [gate-r2-final-ci-01M61QSRJ1K0H8S0A1N6FEX2EZ.log](gate-r2-final-ci-01M61QSRJ1K0H8S0A1N6FEX2EZ.log) |
| `r2-final-build22` | 22.23.3 | `npm run build` | PASS — [gate-r2-final-build22-01M61QSS3J35V63NJV5PVTCQFX.log](gate-r2-final-build22-01M61QSS3J35V63NJV5PVTCQFX.log) |
| `r2-final-typecheck22` | 22.23.3 | `npm run typecheck` | PASS — [gate-r2-final-typecheck22-01M61QSSBR9AY1FQMMG772WTTG.log](gate-r2-final-typecheck22-01M61QSSBR9AY1FQMMG772WTTG.log) |
| `r2-final-test22` | 22.23.3 | `npm test` | PASS — [gate-r2-final-test22-01M61QSSKTN33YJ28YBYEVFZSM.log](gate-r2-final-test22-01M61QSSKTN33YJ28YBYEVFZSM.log) |
| `r2-final-test24` | 24.22.1 | `npm test` | PASS — [gate-r2-final-test24-01M61QTFF69ZH38XT7E0V61EDA.log](gate-r2-final-test24-01M61QTFF69ZH38XT7E0V61EDA.log) |
| `r2-changelog` | — | `bash "$ORGASMIC_EVIDENCE_DIR/check-changelog.sh"` | PASS — [gate-r2-changelog-01M61QT9B54SV2QYJFV6C46XQ9.log](gate-r2-changelog-01M61QT9B54SV2QYJFV6C46XQ9.log) |

Scoped/red-green receipt logs (commands and expected outcomes above):
- `r2-scoped-green`: [gate-r2-scoped-green-01M61QRW4CVSB712D9TN8YYDBM.log](gate-r2-scoped-green-01M61QRW4CVSB712D9TN8YYDBM.log)
- `r2-red-empty`: [gate-r2-red-empty-01M61QSET8HKY2S9Y1NGX4EJJM.log](gate-r2-red-empty-01M61QSET8HKY2S9Y1NGX4EJJM.log)
- `r2-green-empty`: [gate-r2-green-empty-01M61QSF2BHMKPJC2JSTXCR3KS.log](gate-r2-green-empty-01M61QSF2BHMKPJC2JSTXCR3KS.log)
- `r2-red-unicode`: [gate-r2-red-unicode-01M61QSF79BXFWXJWNNR3DSX2Q.log](gate-r2-red-unicode-01M61QSF79BXFWXJWNNR3DSX2Q.log)
- `r2-green-unicode`: [gate-r2-green-unicode-01M61QSFFTVN71CZF0BZF5SVNC.log](gate-r2-green-unicode-01M61QSFFTVN71CZF0BZF5SVNC.log)
- `r2-red-harness`: [gate-r2-red-harness-01M61QSFMW97AEEG2YE1JR6HTN.log](gate-r2-red-harness-01M61QSFMW97AEEG2YE1JR6HTN.log)
- `r2-green-harness`: [gate-r2-green-harness-01M61QSFX8BJ2PNEZAEJ1NS7M7.log](gate-r2-green-harness-01M61QSFX8BJ2PNEZAEJ1NS7M7.log)
- `r2-base-ci`: [gate-r2-base-ci-01M61QPHH72KTG3VXC36VBSWHT.log](gate-r2-base-ci-01M61QPHH72KTG3VXC36VBSWHT.log)

Additional final-commit gate `r2-node24-checksum` reran `sha256sum --check selected-shasum.txt` and the extracted `node --version` in the inherited scratch install: PASS, archive OK and v24.22.1. Receipt: [gate-r2-node24-checksum-01M61QYBGATTV6AHC4KMRGAA9Z.log](gate-r2-node24-checksum-01M61QYBGATTV6AHC4KMRGAA9Z.log).

## Base versus final counts

| Engine | Commit | Total | Passed | Failed | Skipped |
| --- | --- | ---: | ---: | ---: | ---: |
| Node 22.23.3 | Base `252365fe` | 835 | 807 | 0 | 28 |
| Node 22.23.3 | Final `13692e0` | 840 | 812 | 0 | 28 |
| Node 24.22.1 | Base `252365fe` | 835 | 835 | 0 | 0 |
| Node 24.22.1 | Final `13692e0` | 840 | 840 | 0 | 0 |

Five additional tests (four empty-workspace cases plus one harness case); eight existing hostile-name tests strengthened. No cancelled/todo tests. Node 22 retains the existing 28 Node-24-gated routing skips; Node 24 runs them all. The changelog gate reproduced the workflow's added-fragment condition against the round-2 base and verified the fragment has exactly one bullet and no heading. `git diff --check` also passed.

# Unmet Criteria

None. Every requested final gate and mutation probe completed. No fresh Node-24 build/typecheck was requested this round; the full Node-24 suite was run. No live Slack workspace or GitHub-hosted workflow run was attempted; the registration/write path was exercised using the repository harness and the changelog workflow condition was checked locally.

# Residual Risk

- The existing 28 routing tests are skipped by design on Node 22; all pass on Node 24.
- npm reports two high-severity dependency vulnerabilities, unchanged from the base. Dependencies and lockfile were not modified in this scoped fix.
- Empty workspace names intentionally no longer leave parentheses, including the older pre-existing `()` behavior. Non-empty names retain the round-1 formatting behavior.
- No live Slack or downstream rendering check was performed. Formatting names does not make their content trusted instructions; unchanged raw metadata/logging boundaries remain outside this round's scope.
