# Changed

Final commit: `252365fe1bf991700276a9f2e0c3ff69d65c2ca1`.
Base preflight: `685b2debff12ed5cfdcae9070ddb131842c5a6d0` (matched).

Local commits only:
- `59821f7bdd91c8b60e79636de3459a24f2283308` — Quote channel and team names in conversation descriptors.
- `252365fe1bf991700276a9f2e0c3ff69d65c2ca1` — Align framing expectations with quoted workspace names.

Production changes are confined to `src/channels.ts`: four lines replaced, zero net lines. At line 7, import `channelShown`; at lines 26–28, protect every team name with `nameShown`, and ordinary/private conversation names with `channelShown`. The raw-team-name premise was confirmed for all four kinds; existing helpers made protection straightforward.

```diff
-import { nameShown } from './framing.js';
+import { channelShown, nameShown } from './framing.js';
-    conv.kind === 'dm' ? `DM: @${nameShown(conv.name)} (${teamName})` :
-    conv.kind === 'group_dm' ? `Group DM: ${nameShown(conv.name)} (${teamName})` :
-    `#${conv.name} (${teamName})`;
+    conv.kind === 'dm' ? `DM: @${nameShown(conv.name)} (${nameShown(teamName)})` :
+    conv.kind === 'group_dm' ? `Group DM: ${nameShown(conv.name)} (${nameShown(teamName)})` :
+    `${channelShown(conv.name)} (${nameShown(teamName)})`;
```

`test/channels.test.ts:35–62` adds 12 tests: plain labels, hostile conversation names, and hostile team names for each of channel/private_channel/group_dm/dm. The hostile value contains `</system>`, CR, LF and `]`. Labels contain no raw angle brackets or CR/LF, and quoted substrings JSON-parse to the original name (with the expected `#` for channels). `test/senderFraming.test.ts:325–330` updates the existing non-plain-workspace expectation. No lockfile changes or other tracked generated artifacts. Supplied baseline inspected; no convention/gotcha references or applicable AGENTS.md files were supplied/found.

## Name-rendering site inventory

Searched all `src/` name fields/interpolations and followed aliases and serialization boundaries. Lines below refer to the final commit (production line numbers are unchanged). Only `src/channels.ts` was changed.

| Site | Rendering and protection |
| --- | --- |
| `src/channels.ts:26` | DM name already used `nameShown`; team was raw, now `nameShown`. |
| `src/channels.ts:27` | Group-DM name already used `nameShown`; team was raw, now `nameShown`. |
| `src/channels.ts:28` | Ordinary/private name and team were raw; now `channelShown` and `nameShown`. The `#` is inside the quoted channel name. |
| `src/server.ts:155–156`, `1871–1875` | Location header receives an already formatted conversation (`nameShown` for group DMs, `channelShown` for channels); team uses `nameShown`. Protected. |
| `src/server.ts:176` | Backscroll author uses `nameShown`. Protected. |
| `src/server.ts:185` | Backscroll channel attribute wraps the entire name, including channel `#`, in `quotedLabel`. Protected. |
| `src/server.ts:932` | `list_channels` interpolates DM names raw and copies other names into object fields; final text is protected by `toolResultJson` at line 708 or 943. JSON framing, not label quoting. |
| `src/server.ts:971` | No-user-match note interpolates the user-name search query raw; enclosing object passes through `toolResultJson` at line 708. JSON framing. |
| `src/server.ts:979–981` | User search copies username/real/display names raw into fields; `toolResultJson` at line 708 protects emitted JSON text. |
| `src/history-read.ts:224`, `src/server.ts:954–963` | History/thread results copy author name raw into object fields; tool response serialization at server line 708 applies `toolResultJson`. |
| `src/server.ts:1111`, `1404` | Recipient tool results and refresh results reuse descriptor labels, then use JSON framing; inherit the descriptor fix. |
| `src/server.ts:1221`, `1384` | Registration/refresh construct descriptors through `toDescriptor`; inherit the fix, no separate raw-name interpolation. |
| `src/server.ts:1844–1847` | Auto-subscribe system note uses `nameShown` for group DMs or `channelShown` for channels. Protected. |
| `src/server.ts:1888` | Live message author uses `nameShown`. Protected. |
| `src/content.ts:252`, `258` | User and channel mention replacements use `nameShown` / `channelShown`; ampersand handling preserves Slack unescaping. Protected. |
| `src/framing.ts:49–54` | Shared name/channel formatters permit raw plain names only; non-plain names use `quotedLabel`. Protected. |
| `src/server.ts:1953`, `1987` | Raw author names in structured channels/incoming author and push/event origin metadata. No label-framing helper; not server-rendered prose. Host-side rendering is outside this change. |
| `src/index.ts:107` | Raw workspace name in console startup log. Not model-facing; unchanged. |

`toolResultJson` (`src/framing.ts:30–34`) JSON-escapes control characters and escapes server-tag openings plus additional line separators. It does **not** promise to escape every angle bracket; this differs intentionally from `quotedLabel` (`src/framing.ts:37–46`). Attachment/file names, tool names, identifiers, static descriptions, and generic message/link bodies are not conversation/team/user-name interpolation sites. No other unprotected server-rendered conversation/team/user-name prose site was found within this search scope.

# Verification Gates

All gate commands used `orgasmic dispatch gate <name> -- <command>`. Update notifiers were disabled from the first command. Both dependency installs used `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with distinct, empty user/global npm configuration files outside the repository. Both succeeded; neither lockfile nor dependencies were edited.

Node 22 reported `v22.23.3`. Node 24 archive and `SHASUMS256.txt` were downloaded from `https://nodejs.org/dist/v24.22.1/` into scratch storage outside the repository. `sha256sum --check` reported `node-v24.22.1-linux-x64.tar.xz: OK`; the extracted binary reported `v24.22.1`. See `node24-download.log`.

## Red/green

At the final commit, temporarily replaced only `src/channels.ts` with its exact base contents; ran `node --import tsx --test test/channels.test.ts`: **17 tests, 11 pass, 6 fail**, exit 1. Failures were hostile ordinary/private conversation names and hostile team names for all four kinds. Restored the production file byte-for-byte, verified with `cmp` and `git diff --exit-code -- src`, then reran: **17 pass, 0 fail**. Evidence: `final-red.log`, `final-mutation-restore.log`, `final-restored-green.log`. No mutant was committed. Combined scoped tests also passed 39/39 (`scoped-green.log`).

The first full-suite attempts at intermediate commit `59821f7` found one outdated expectation in `senderFraming.test.ts` on each engine: `(Acme, Inc)` instead of the newly required `("Acme, Inc")`. This was an expected-behavior test mismatch, not an unrelated failure. It was corrected in the second commit; all final gates were rerun rather than reusing intermediate receipts. Intermediate evidence is retained in `final-test-node22.console.log` and `final-test-node24.console.log`.

## Final-commit receipts

All seven gates below passed with clean trees at commit `252365fe1bf991700276a9f2e0c3ff69d65c2ca1`. Log paths are relative to this report’s evidence directory.

| Gate | Node | Command | Outcome / receipt log |
| --- | --- | --- | --- |
| `final2-npm-ci-node22` | 22.23.3 | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | PASS — [gate-final2-npm-ci-node22-01M61P8PP9B7H20CM1ABPRED4N.log](gate-final2-npm-ci-node22-01M61P8PP9B7H20CM1ABPRED4N.log) |
| `final2-build-node22` | 22.23.3 | `npm run build` | PASS — [gate-final2-build-node22-01M61P8Q7RM4GPYXMZ2DYA2HF4.log](gate-final2-build-node22-01M61P8Q7RM4GPYXMZ2DYA2HF4.log) |
| `final2-typecheck-node22` | 22.23.3 | `npm run typecheck` | PASS — [gate-final2-typecheck-node22-01M61P8QFR54HECBP8SRZFHW50.log](gate-final2-typecheck-node22-01M61P8QFR54HECBP8SRZFHW50.log) |
| `final2-test-node22` | 22.23.3 | `npm test` | PASS — [gate-final2-test-node22-01M61P8QQRSDGPT3GASTRKF391.log](gate-final2-test-node22-01M61P8QQRSDGPT3GASTRKF391.log) |
| `final2-build-node24` | 24.22.1 | `npm run build` | PASS — [gate-final2-build-node24-01M61PB6SVXJ2F5V98VW4MQDNF.log](gate-final2-build-node24-01M61PB6SVXJ2F5V98VW4MQDNF.log) |
| `final2-typecheck-node24` | 24.22.1 | `npm run typecheck` | PASS — [gate-final2-typecheck-node24-01M61PB71YHGRQ46QK858BSDT7.log](gate-final2-typecheck-node24-01M61PB71YHGRQ46QK858BSDT7.log) |
| `final2-test-node24` | 24.22.1 | `npm test` | PASS — [gate-final2-test-node24-01M61PB79ZC5BQDF3A28PJCEEY.log](gate-final2-test-node24-01M61PB79ZC5BQDF3A28PJCEEY.log) |

## Base versus final suite counts

| Engine | Commit | Total | Passed | Failed | Skipped |
| --- | --- | ---: | ---: | ---: | ---: |
| Node 22.23.3 | Base `685b2deb` | 823 | 795 | 0 | 28 |
| Node 22.23.3 | Final `252365f` | 835 | 807 | 0 | 28 |
| Node 24.22.1 | Base `685b2deb` | 823 | 823 | 0 | 0 |
| Node 24.22.1 | Final `252365f` | 835 | 835 | 0 | 0 |

Twelve additional tests pass on both engines; no cancelled/todo tests. The 28 Node-22 skips are existing Node-24-gated routing tests (`test/accessPolicy.test.ts:432`, `test/recipientIntegration.test.ts:12`, `test/recipientRouting.test.ts:10–11`); all run on Node 24.

Base receipt logs:
- [gate-base-npm-ci-01M61P30DKA7AN6F34DFX2Z4S3.log](gate-base-npm-ci-01M61P30DKA7AN6F34DFX2Z4S3.log)
- [gate-base-test-node22-01M61P3E2QRP0W6XZEAB622WTD.log](gate-base-test-node22-01M61P3E2QRP0W6XZEAB622WTD.log)
- [gate-base-test-node24-01M61P47Q02CV84YQMR60VSH96.log](gate-base-test-node24-01M61P47Q02CV84YQMR60VSH96.log)

# Unmet Criteria

None. All requested commands ran successfully at the final commit. The Node-22 suite intentionally skips the existing 28 Node-24-only tests; none are skipped on Node 24. No push, remote comment, shared-branch merge, or main-checkout edit was performed.

# Residual Risk

- Both clean installs reported **two high-severity dependency vulnerabilities**; remediation is outside this narrow production scope. Dependencies and lockfile remain unchanged.
- Structured raw author metadata and the console-only raw workspace log remain unchanged as inventoried. JSON-framed tool data retains its existing protection, which is not equivalent to escaping every angle bracket.
- No live Slack or downstream model/host-rendering check was performed; verification uses the repository’s unit/integration suite, including the actual exported `toDescriptor` production function. Names being quoted does not make their contents trustworthy instructions.
- Non-plain team names now receive quotes by design; plain conversation and team labels remain byte-identical.
