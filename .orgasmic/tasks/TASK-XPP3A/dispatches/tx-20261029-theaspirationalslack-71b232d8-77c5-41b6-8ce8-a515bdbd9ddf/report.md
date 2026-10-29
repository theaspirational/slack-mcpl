# TASK-XPP3A — A2 dormant adapter gates

## Changed

**Commit:** `8296d58e7940f69f1334228a18c5c9c0f18b93ff` (`feat(access): prepare dormant adapter authorization gates`). One local commit, default author, required `Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer. Clean worktree. No push, PR, comment, merge, tag or main-checkout edits.

Fetched `origin feat/access-policy-model` read-only and rebased onto **`62a77616228cdc7d4eda31a6f1561501e9e484fc`**, the published #55 head. Git dropped identical local A1 `95916c48`; the final commit's direct parent is published A1.

Read the supplied project baseline, CONTRIBUTING.md, PR template, the TASK-57BTX report at its supplied dispatch path, and pinned fork adapter/tests. No applicable AGENTS.md or additional conventions/gotchas were supplied/found. The approved A2 private-state boundary is preserved: tests inject a `SlackAccessPolicy` constructed through `parseAccessPolicy`; no supported setter, constructor option, connector setting, startup setting, environment variable, CLI flag or README row is added.

```text
 src/access-policy.ts             |   2 +-
 src/slack-adapter.ts             | 120 ++++++++++++++---
 test/adapterAccess.test.ts       | 295 +++++++++++++++++++++++++++++++++++++++
 test/adapterAccessFixture.ts     |  59 ++++++++
 test/adapterAccessServer.test.ts |  83 ++++++++++++
 5 files changed, 537 insertions(+), 22 deletions(-)
```

**Production:** 2 files, **+100/-22, net +78 lines**: adapter +99/-21; A1 LOW-C predicate +1/-1 (`Array.from` inside `idList`, preserving the parser's separate snapshot). Tests: three fresh files, +437 lines, 72 tests. No lockfile/generated tracked changes. `dist/` was built locally; runtime archives/binaries and release-fold copies live in scratch, not evidence.

### Gate map: tool/path → admission → test

Tests below are in `test/adapterAccess.test.ts` unless marked server (`test/adapterAccessServer.test.ts`). The fixture records every Slack method and payload, including metadata calls. Unknown-scope denial means **zero Slack calls**; membership/identity denial permits only the fresh authorization `info` request, never the requested data/write effect.

| Tool or entry point | Check | Test evidence |
|---|---|---|
| `send_message`, `reply_message`, host publish | Fresh exact readable metadata + pin/DM peer + `chat:write` + legacy send-list; policy refusal before text validation | `policy deny matrix`, `fresh denial`, `effect scope`, `positive write/read paths`; server deny matrix and `host publish is admitted afresh` |
| `edit_message`, `delete_message` | Same write gate; `chat:write` | Adapter/server deny matrices; stale-member matrix; positive payload/call sequence |
| `upload_file`, rollback file deletion | Fresh destination admission + `files:write` + send-list before upload URL/bytes/share or delete | Adapter/server deny matrices; missing effect scope; real loopback byte transfer; positive file deletion |
| `add_reaction`, ACK add | Fresh destination admission + `reactions:write` + send-list | Deny matrices; unknown-scope ACK makes no Slack calls; positive reaction payload |
| ACK removal / shutdown cleanup | Fresh write/scope admission again, no cleanup exemption | `ACK removal rechecks admission...`; deliberate cleanup-gate mutation caught; revoked clear and stop never remove |
| `fetch_history`, `fetch_thread`, automatic backscroll | Fresh exact metadata; metadata-selected `channels:history`, `groups:history` or `im:history` | Unknown-scope, stale-member and group matrices; private C-ID scope test; cursor-continuation test; metadata error cannot reach history |
| `list_channels`, `refresh_channels`, initial registration | Known read scopes before listing; no DM listing type when no peers are allowed; skip listed ordinary nonmembers before info; fresh admission of each candidate; denied candidates omitted | Unknown-scope listing no-op; includeNonMember cannot bypass; fresh candidate identity/listing test; server list/refresh zero-call test |
| `getConversationMeta` / metadata admission | Valid C/G/D ID, known scope metadata, fresh `info`, exact returned identity and A1 kind/membership/peer/read scope | Deny/stale/group matrices; invalid IDs zero-call test; mismatched/incomplete/failed metadata; readJoinedChannels=false |
| `send_dm` / `conversations.open` | Early no-D-ID send-list veto; configured U/W peer + `im:write`, `im:read`, `chat:write` before text/open; fresh returned DM metadata and exact requested peer + exact D-ID intersection before post | DM preflight, early veto, returned-D-ID intersection, allowed-but-wrong peer, ordinary-channel response, U/W success and legacy-switch precedence; server denial matrix |
| `find_user` | `users:read` before workspace-global directory lookup | Adapter/server zero-call deny matrices; positive directory call |
| Incoming Socket messages | Fresh history/read admission before sender/mention lookups or delivery; exact DM sender=counterpart; always acknowledge envelope | Inbound denied-peer, unknown-scope/group no-op, allowed legacy-switch override tests; deterministic completion via inbound promise chain |
| Attachment references | Policy-mode no-op until A3; legacy references unchanged | `policy attachment references are dormant no-ops...` covers backscroll and inbound; bounded history/thread share the same shaping function |
| Legacy behavior | Absent policy takes legacy checks; no new configuration surface | `legacy mode preserves calls, payloads, outputs and exact refusal text` passes on A1 and A2; complete existing 599-test suite retained |

Server rollback verification intentionally respects the existing protocol: rollback can return `success: true` for moving the checkpoint while reporting `0/1 messages deleted` and naming the remaining message. The test asserts fresh denial and **no delete effect**, not an invented success=false behavior.

### Ported and changed versus fork `685b2debff12ed5cfdcae9070ddb131842c5a6d0`

Ported the fresh read/write/history helpers and call sites, list-candidate admission, incoming-before-user-resolution checks, explicit-policy precedence over legacy DM switches, observed-scope requirements, DM exact-peer validation, directory scope and reaction cleanup admission. Extracted the existing post body so a validated DM posts after its exact-peer check without a second, differently bound admission.

Deliberate differences:
- No fork `configureAccessPolicy`, access-config copy, routing ledger, public-pin fallback, group-DM permission, file-info facade, typing, path-upload configuration or server replacement.
- Retain **early no-D-ID veto** and reflect it in `dmsWritable`, instead of opening a DM only to refuse its post.
- Strict A1 parsing remains authoritative. Only LOW-C changes A1 production code.
- Group DMs are refused and omitted from policy listing types; attachment references are suppressed until A3. Upload/delete *write* admission belongs to A2 and is implemented; protected attachment *fetching* remains A3.
- Legacy clocks, runner, channel presentation, schemas, refusal text and server registry behavior are retained. No wholesale fork file/test copy; no `fileAccess.test.ts`, nested fetch mocks or global fetch replacement. Each console mock is installed once per property per test context; Slack boundaries use configurable ordinary stubs.

## Verification Gates

Evidence directory is the directory containing this report. All final application gates ran at the reported commit. Earlier pre-amend receipts remain as development evidence; the final named summary logs identify the reported head. No previous dispatch receipts were reused. Durable `gate-<name>-*.log` files contain the wrapper receipts; shorter `<name>.log` files contain the corresponding captured output. `final-gates.sh`, `mutate.py`, the changelog scripts, SHASUMS files, and the loopback guard are retained beside this report.

Every command in the following table was run as **`orgasmic dispatch gate <name> -- timeout 900 <command>`**. `env.sh` sets `NO_UPDATE_NOTIFIER=1`, `npm_config_update_notifier=false`, empty separate npm user/global configs, audit/fund off, and `NODE_OPTIONS=--require=/tmp/task-xpp3a/loopback.cjs`. The guard rejects listeners not explicitly bound to `127.0.0.1` or `::1`. Node 22.23.3 is on PATH; official 24.22.1 and 22.12.0 archives were copied to `/tmp/task-xpp3a`, checked against freshly downloaded official nodejs.org SHASUMS256.txt, then extracted there.

| Gate(s) | Command / result | Evidence |
|---|---|---|
| `setup` | Official archive SHA256 checks both OK; `npm ci --ignore-scripts --registry=https://registry.npmjs.org`, 51 packages; empty configs, audit/fund off | `setup.log`, SHASUMS256-v*.txt |
| `baseline-22.23.3`, `baseline-24.22.1`, `baseline-22.12.0` | `env PATH=<version-bin>:$PATH npm test` at clean A1: **599 pass / 0 fail each**, no skips/cancellations | `baseline-<version>.log` |
| `final-typecheck-22.23.3`, `final-typecheck-24.22.1` | `env PATH=<version-bin>:$PATH npm run typecheck`: pass both | `final-typecheck-<version>.log` |
| `final-build-22.23.3`, `final-build-24.22.1` | `env PATH=<version-bin>:$PATH npm run build`: pass both | `final-build-<version>.log` |
| `final-suite-22.23.3`, `final-suite-24.22.1`, `final-suite-22.12.0` | `env PATH=<version-bin>:$PATH npm test`: **671 pass / 0 fail each**, no skips/cancellations; baseline failure count unchanged | `final-suite-<version>.log` |
| `final-new-tests-1` through `-5` | `node --import tsx --test --experimental-test-isolation=none test/adapterAccess.test.ts test/adapterAccessServer.test.ts`: **72/0 five times** on Node 22.23.3 | `final-new-tests-<n>.log` |
| `final-mutation-a1-red` | `python3 <evidence>/mutate.py a1-red`: temporarily restore A1 adapter, run final new tests, require failure, restore final source: **1 pass / 71 fail** | `a1-red-tests.log`, `a1-red.patch`, final wrapper log |
| `final-mutation-fresh-admission` | Remove read admission: **59 pass / 13 fail** | `fresh-admission-tests.log`, patch and wrapper log |
| `final-mutation-exact-dm-peer` | Remove requested-peer comparison: **71 pass / 1 fail** | `exact-dm-peer-tests.log`, patch and wrapper log |
| `final-mutation-ack-cleanup` | Remove fresh ACK-removal check: **71 pass / 1 fail** | `ack-cleanup-tests.log`, patch and wrapper log |
| `final-mutation-history-scope` | Remove metadata-selected history scope: **71 pass / 1 fail** | `history-scope-tests.log`, patch and wrapper log |
| `final-mutation-early-dm-veto` | Bypass no-D-ID veto in policy mode: **71 pass / 1 fail** | `early-dm-veto-tests.log`, patch and wrapper log |
| `final-changelog` | `node <evidence>/changelog-check.mjs`: validates CONTRIBUTING exemption and CI label guard; no supported activation | `final-changelog.log` |
| `final-release-fold` | `node <evidence>/release-dry-fold.mjs`: scratch-only version, 33 existing fragments fold identically for A1 and A2; tracked files untouched | `final-release-fold.log` |
| `final-audit` | Clean tree, exact parent, diff whitespace check, commit/trailer/stat, runtime versions and test/mutation summaries | `final-audit.log` |

**Red/green:** The first 44-test red run before implementation gave 1 pass / 43 failures. The final 72-test A1 replay gives 1/71; the same legacy compatibility test passes on both. Mutations above are independently authored, restored in `finally`, and intentionally inverted by the wrapper: the application tests must fail for the mutation gate to pass. They are not normal all-green application runs.

**Development failures, resolved:** An initial script invocation used unavailable `python` rather than `python3`, so that purported first green attempt was another red run, not implementation evidence. Early tests incorrectly assumed empty text was invalid (the production validator rejects lone surrogates), omitted shutdown's second fresh ACK check, used the wrong reply-tool/thread-argument names, and expected rollback cleanup failure to change the checkpoint success flag. Corrected to existing production contracts, then passed the final gates above. No suppressed/skipped tests or production behavior changes to satisfy those mistaken assertions. A final comparison with the fork test fixture caught an omitted listing optimization: with no DM peers, policy mode must not request the im type. Added that condition and its zero-call regression test, amended the single commit, and reran every final gate. A read-only fork inspection also exited 1 because its final grep found no match; this was not an application failure.

**Changelog disposition:** CONTRIBUTING requires entries for externally noticeable changes and permits `no-changelog` for internal-only changes. This preparation has no supported activation. No fragment was added; the future PR needs the **`no-changelog` label**. The local gate verifies that exemption; it does not pretend the unlabelled CI job would pass or apply a public label.

## Unmet Criteria

No implementation or required verification deliverable remains outstanding. The PR body is the separate sibling file `pr-body.md`, reproduced verbatim below. This is local-only; publication and applying the future PR label were not attempted.

Execution caveat: initial read-only orientation/version/git inspections and the fetch/rebase were not gate-wrapped; all dependency installation, application checks, red/green, mutations and final verification were wrapped. Their relevant final version/commit/cleanliness facts were rechecked by `final-audit`; no unwrapped test result is offered as a receipt.

## Residual Risk

- No live Slack workspace, live external host, macOS or load/rate-limit qualification. Fresh metadata adds API calls; observed token scopes are cumulative metadata, not fresh OAuth introspection per effect.
- Slack admission/effect is not transactional. Membership can change between requests or pages. Each new history/cursor call checks again, not every page inside one call. Previously delivered content/cached labels are not retroactively purged.
- Cleanup after revocation may leave Slack messages/files/reactions. Existing rollback/ACK retry semantics are retained; no privileged cleanup bypass was added.
- A2 remains intentionally unsupported in isolation: attachment fetch enforcement is A3, activation is A4, groups are G. Adapter attachment references are no-ops under private policy state, but the legacy server URL-fetch implementation is not yet a policy-aware attachment feature; do not expose this state as configuration early.
- Per the manager's explicit clarification of “channel open and join,” only existing DM open and fresh listing/metadata admission are gated; there is no new join API and server `channels/open` registry behavior remains unchanged.

## PR body (`pr-body.md`)

> ## Problem
>
> Part 2 of the access-policy chain: the internal policy model needs adapter enforcement before supported opt-in can be exposed. This PR **depends on #55**; review and merge #55 first.
>
> ## Changes
>
> - Prepare fresh metadata/identity, read/history, write/scope, listing, inbound, DM-open, upload, rollback and reaction/ACK gates behind private policy state.
> - Retain the early no-D-ID send-list veto for `send_dm`, then verify the opened DM's exact peer and destination.
> - Preserve legacy behavior when no policy is supplied. No environment variable, CLI option, connector setting or public installer is added: **inert until A4**.
> - Leave group DMs unsupported and attachment references suppressed in internal policy mode pending G and A3. No new channel-join API or server `channels/open` change.
> - Make A1's ID-list predicate independently hole-safe.
>
> ## Tests
>
> - A1 baseline: **599 pass / 0 fail** on Node 22.23.3, 24.22.1 and 22.12.0.
> - This commit: **671 pass / 0 fail** on each version; no skips or cancellations.
> - Typecheck and build pass on Node 22.23.3 and 24.22.1.
> - All **72 new tests pass five consecutive runs**. Against the A1 adapter, they produce 71 failures and one passing legacy compatibility test.
> - Five deliberate mutations caught: fresh admission, exact DM peer, ACK cleanup, history scope and early DM-open veto.
> - Real server/adapter tests cover tool refusals, host publish and rollback; a loopback upload exercises the byte-transfer path without mocking fetch.
> - Internal-only changelog exemption checked; scratch release folds A1 and this commit identically.
>
> ## Not verified
>
> No live Slack workspace, live external host, macOS or rate-limit/load testing. Admission is not transactional with Slack effects; cleanup after revocation may leave artifacts.
>
> ## Out of scope
>
> A3 protected attachment fetching/references, A4 activation/configuration, G group-DM admission, public-pin fallback, routing and typing. These private preparations are not a supported partially enabled security feature.
>
> ---
>
> - [x] Internal-only change: apply `no-changelog` per CONTRIBUTING.md. No fragment is needed while this remains unreachable through supported configuration.
>
> 🤖 Generated with [Codex](https://openai.com/codex) (GPT-6-Astra)
