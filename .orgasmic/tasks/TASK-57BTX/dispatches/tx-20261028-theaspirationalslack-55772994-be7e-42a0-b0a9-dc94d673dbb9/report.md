# TASK-57BTX — access policy and named group DMs: upstream PR plan

## Changed

**Planning only: no production code, repository files, commits, remote refs, GitHub comments or PRs changed.** Report and inspection artifacts are outside the worktree. The explicit no-commit brief overrides the generic implementer completion template.

**Recommendation:** four small stacked PRs for the complete base policy, then named group DMs. Keep supported policy installation unavailable until all read/history/write/inbound/file paths enforce it. Public-pin history proof is a separate optional extension, with stale-pin isolation included immediately. Integrate existing path-upload and thread-status PRs when available; exclude recipient routing.

Do not cherry-pick broad restoration/security commits or replace upstream adapter/server files. Preserve upstream's startup parser, virtual clock, single-process runner and CI.

## Snapshot and sources

Inspected 2026-10-28:

- Fork: **685b2debff12ed5cfdcae9070ddb131842c5a6d0**, clean worktree.
- Fresh public read-only fetch into a scratch bare repository: upstream main **ca8f6b1193154384e4626921255f86923fc5edf3**. Includes #49 startup/parser/one-process clock changes and #52 CI changes.
- **docs/FORK-VS-UPSTREAM.md at a2295638** was reachable locally and inspected; an evidence copy preserves the whole document. Its older PR states and test results are historical claims, not qualification of this plan.
- Read the supplied project baseline and current upstream CONTRIBUTING.md. No substantive additional baseline constraints, convention/gotcha references, or applicable AGENTS.md in the ancestry/source/test/docs paths were found.

Public PR states below came from unauthenticated GitHub GETs, including bodies, changed files, reviews and issue conversations for the five owned open PRs:

| Existing work | Inspected head | Boundary |
|---|---|---|
| [#50 descriptor-label quoting](https://github.com/anima-research/slack-mcpl/pull/50), open | 97f7bb4f37a4f306c8aff2834430dba630ec710f | Do not resend src/channels.ts label fixes. |
| [#51 zero automatic backscroll](https://github.com/anima-research/slack-mcpl/pull/51), open | 8654328b683f4b5b5cb4dd192b0a5246dbcbee0a | Do not import fork backscroll-limit changes; preserve independent metadata lookup. |
| [#53 disabled tools](https://github.com/anima-research/slack-mcpl/pull/53), open | c4540a14e34360d478583b088fd131e4765b5f93 | Owns parsing, hiding/direct-call refusal; reconcile shared startup/server files. |
| [#12 thread status](https://github.com/anima-research/slack-mcpl/pull/12), open, rebuilding per brief | 21a7ebcb38ab901c2e721b325c63fe8407ae7a7a | Published head remains older implementation. Do not infer unpublished repair behavior. |
| [#31 path uploads](https://github.com/anima-research/slack-mcpl/pull/31), open | ddf92124e5f120b0576f66c9f989ca13ee9d74b4 | Existing filesystem feature; add only policy integration when both exist. |
| [#20 exact publish target](https://github.com/anima-research/slack-mcpl/pull/20), open | Listed, not independently audited here | Later routing/frozen-target concern, not base policy/group admission dependency. |

**“Issue #47” is actually merged [sender-framing PR #47](https://github.com/anima-research/slack-mcpl/pull/47)**, merged 2026-10-27 at aa3af6e8b388ca87edba003aea6a35baafa5799e. It protects rendered text, names, attachment labels and JSON results, not access authorization. Preserve it when adding usable attachment references/group labels. #50 addresses descriptor labels it left unchanged.

Fork [group-DM PR #1](https://github.com/theaspirational/slack-mcpl/pull/1) merged at b5675782c16eb4a496f664cbda1dcb0896ba848e. Use the requested final fork snapshot, including subsequent fixes through 685b2deb, not merely that merge.

## 1. Fork access-policy surface

### Settings and format

CLI: **SLACK_ACCESS_POLICY is a JSON object**. Embedded API: connectSlack({accessPolicy: …}) or adapter.configureAccessPolicy(…) once before Socket Mode starts. This is not a policy file or host capability. Lists are snapshotted into sets, so later mutation of supplied arrays does not extend access.

Example (illustrative IDs, not defaults):

    {"readJoinedChannels":true,"writeChannels":["CEXAMPLE"],"dmUsers":["UEXAMPLE"],"groupDms":["GEXAMPLE"]}

The listed group is read-only unless its ID also appears in writeChannels.

| Field | Actual fork contract |
|---|---|
| readJoinedChannels | Required boolean; allows fresh joined ordinary public/private reads. Ordinary writes require readability too: false is not a write-only channel mode. |
| writeChannels | Required exact uppercase C/G ID array, regex ^[CG][A-Z0-9]+$. Empty denies ordinary/group-channel writes. Does not enumerate D-ID DMs. |
| dmUsers | Required exact uppercase U **or W** user-ID array, regex ^[UW][A-Z0-9]+$. Read and write peers; empty denies all one-to-one DMs. |
| groupDms | Optional exact C/G IDs; absent/empty denies all group DMs under policy. Read permission, not write permission by itself. |
| historyMembershipFallbackChannels | Optional C IDs, each also a write pin, independently verified public by operator. Must not overlap groupDms. Not required for base policy/groups. |

Malformed JSON, non-object top level, unknown JSON keys and invalid/missing required fields fail startup. Nuances: IDs are not trimmed, duplicates coalesce, optional lists use nullish defaults so **JSON null for optional lists is currently accepted as absent**. Embedded construction validates known fields but does not perform the JSON parser's unknown-key rejection. There is no schema version.

Sources: fork [src/access-policy.ts:3–113](https://github.com/theaspirational/slack-mcpl/blob/685b2debff12ed5cfdcae9070ddb131842c5a6d0/src/access-policy.ts#L3), [src/configuration.ts:13–50](https://github.com/theaspirational/slack-mcpl/blob/685b2debff12ed5cfdcae9070ddb131842c5a6d0/src/configuration.ts#L13), src/slack-adapter.ts:912–918.

### Enforcement map

| Surface | Checks and limits |
|---|---|
| Listing/metadata/registration | listConversations filters known scopes and freshly checks candidates with readAccessConversation. Ordinary listed nonmembers are skipped before info calls. includeNonMember cannot bypass policy. Unknown scopes admit none. getConversationMeta also checks afresh. Registration/refresh use those results. |
| Ordinary reads | Exact returned ID, explicit ordinary-channel kind fields, is_member=true, enabled joined reads, channels:read or groups:read. No cached membership authorization; C/G prefix alone is insufficient. |
| History/thread/backscroll | readHistory, readThread and fetchHistory call requireHistoryConversation before data. Need corresponding channels/groups/im/mpim:history. Every new call, including cursor continuation, checks again; **not every page within one call**. Authorization failure cannot fall through to optional metadata handling. |
| Incoming | prepareMessageEvent performs fresh history/read admission before sender lookup, delivery, routing receipt/wake decisions. One-to-one sender must match authorized counterpart. Socket envelope acknowledgement remains separate and first. Subscribing/unmuting does not grant access. |
| Send/edit/reply/publish | Fresh readability, non-DM write pin, effect scope and legacy send allow-list. Tool calls and host channels/publish use adapter effects, not merely tool visibility. Authorization/scope refusal precedes malformed message-text refusal. |
| send_dm | Exact peer, im:write, im:read, chat:write, then text validation **before conversations.open**. Fresh metadata and exact requested peer checked after opening, with write restrictions before posting. Another allowed peer is still a mismatch. |
| Upload/delete/rollback/reaction | Upload/file delete: files:write; message edit/delete: chat:write; reactions: reactions:write. Fresh destination checks also cover rollback calls. ACK addition uses reaction path; ACK removal freshly checks policy. Revocation can prevent cleanup. |
| Thread status | Fork adds fresh writable admission using chat:write. Status lifecycle/frozen-target queues are separate work; upstream integration must follow rebuilt #12's final API. |
| User directory | findUsers explicitly requires users:read; remains workspace-global metadata, not a DM allow-list or permission to read messages. Ordinary display-name lookup is not a separately policy-filtered directory. |
| Attachment bytes | Policy fetch_attachment requires channelId + fileId, fresh readable conversation, files:read, exact files.info returned identity, exact association through channels/groups/ims or nonempty shares.public/private[channelId]. Canonical private download URL only, HTTPS files.slack.com without URL credentials, all redirects refused. Supplied URL ignored. |
| File references | Live/history/thread/backscroll produce usable server-built channel/file-ID fetch hints, separately framed from name/MIME. Missing/invalid IDs marked unavailable. Hints never authorize later fetch. File access itself needs readable membership + files:read, not independently history scope. |

Source paths at the pinned fork:
- [src/slack-adapter.ts](https://github.com/theaspirational/slack-mcpl/blob/685b2debff12ed5cfdcae9070ddb131842c5a6d0/src/slack-adapter.ts): 956–1206, 1259–1275, 1410–1695, 1701–1778, 1817, 1856–1908.
- [src/server.ts](https://github.com/theaspirational/slack-mcpl/blob/685b2debff12ed5cfdcae9070ddb131842c5a6d0/src/server.ts): 428–450, 989–1032, 1704–1717.
- [src/file-access.ts](https://github.com/theaspirational/slack-mcpl/blob/685b2debff12ed5cfdcae9070ddb131842c5a6d0/src/file-access.ts), src/content.ts:69–77, src/history-read.ts:231–234.

Scopes are checked against **observed token-scope metadata**, not refreshed OAuth inspection before each effect. Membership is fresh. Synchronous canWrite/writable are configuration hints, not proof of membership, peer identity or operation scope.

### Group DMs

Exact groupDms inclusion, matching ID, is_mpim=true, is_im!==true, membership and mpim:read are required. Missing ordinary-channel fields is_im/is_private are intentionally tolerated for mpims; ordinary metadata remains stricter. History and inbound additionally need mpim:history; writes need writeChannels plus effect scope. No group creation/member-management tool is added.

Messages follow channel delivery: ambient unless mentioning the bot, with existing subscriptions/delivery rules, not automatically waking one-to-one DMs. Location, backscroll and auto-subscribe text identify “Group DM”; IDs and existing group_dm descriptor kind remain.

**Non-routed group access is independent of readJoinedChannels.** Routing maps groups into joined private_channel admission; its ledger additionally requires readJoinedChannels=true. Do not claim these two modes are identical.

### Public-pin fallback

With known scopes lacking channels:read, joined reads enabled and an exact configured public write pin, an affirmative conversations.history({channel,limit:1}) mints an in-process symbol proof. No message content or invented scope is used. Proof is separate from bounded-history pages. When channels:read exists, failed info does **not** fall back. Each failed pin is omitted independently so others remain listed. A prefix or history success cannot prove public visibility: operator attestation is essential.

Sources: src/access-policy.ts:16–17,43–59,101–104; src/slack-adapter.ts:1020–1038,1133–1155.

### Fork-only dependencies to separate

- **Recipient routing:** src/recipient-routing.ts, src/host-compatibility.ts and shared configuration/server/adapter integration. Requires policy, authenticated recipient identity, private state/namespace and compatible host; optional SQLite mode needs Node 24+/POSIX. Base policy/non-routed groups need none of this. Move routed group tests to the later routing series, not skipped base-policy tests.
- **Path uploads (#31):** owns src/upload-path.ts/filesystem policy/tools. Policy integration is requireUploadDestination before local read and again before upload. Do not import its 301-line reader for access policy. The last Buffer-cap test in fileAccess.test.ts belongs to upload work. Exclude the unpublished SLACK_ALLOW_FILE_PATHS migration rejection unless specifically requested upstream.
- **Disabled tools (#53):** independent parser/hide/refuse setting. Tool suppression does not govern host publish, ACKs, rollback or automatic history; access policy still must. Do not copy fork configuration.ts or routed fixtures wholesale.
- **Typing (#12):** owns optional negotiation/status lifecycle; do not import frozen-target queues just because a policy test invokes status.

### Test inventory and isolation

Carry or extract:
- **test/accessPolicy.test.ts:** metadata/kinds/scopes, fresh listing/nonmember skip, per-write matrix, revocation, exact DM peer and scope/text ordering, inbound-before-user-resolution, directory/file metadata, opt-in/copy behavior. Group read/write/list/inbound/reply/framing, partial metadata and readJoinedChannels=false. Split ACK from status and move all three Node-24 routingTest cases to routing work.
- **test/configuration.test.ts:** policy-only parser/default/group-overlap cases into upstream test/config.test.ts. Exclude routing/disabled-tool/obsolete-path-option prerequisites.
- **test/historyReadPolicyIntegration.test.ts:** initial/continuation/thread checks, metadata failure and DM precedence. Fallback proof/page accounting travels with fallback.
- **test/fileAccess.test.ts:** exact association/schema, no bytes on denied membership/scope/identity, canonical URL/redirect and legacy compatibility. Exclude final unrelated upload guard.
- **test/fileReferences.test.ts:** usable live/backscroll/history/thread IDs, missing IDs, legacy URLs, hostile name/MIME framing with parseable hints.
- **test/historyMembershipFallback.test.ts:** only with fallback; stale-pin isolation from first release; split unavailable status cases.
- **test/pathAccessPolicy.test.ts:** only with #31 integration; exclude obsolete boolean migration case.
- Retain upstream sendChannels, disableDms, listConversationScopes, historyRead*, attachment*, fetchAttachment, upload*, ackReaction, senderFraming, operatorControls, config, cli, replyMessage, rollbackBranches and subscribeMemberChannels regressions.

**Known global leak:** fileAccess.test.ts fixture installs t.mock.method(globalThis, 'fetch', …) at line 38; the redirect test nests another at line 112 in the same context. Restoration can leave the first mock installed. The prior document reports a reproduced hang with uploadValidation.test.ts and 22 passing tests after fixing nesting; this run independently inspected the two calls, but did not rerun that historical experiment or claim its counts as new evidence.

Preferred fix during extraction: **one fetch mock per test**, configurable response/implementation through the fixture. Alternatively restore the first mock before replacing it. Add a later-test sentinel for original fetch identity; run fileAccess plus uploadValidation in both file orders and the full one-process suite. Restore token env exactly, close hosts/adapters, restore console/global mocks. fileReferences.test.ts also mocks fetch but has no identified equivalent nesting. This is not a claim that every other fork test is leak-free. Replace real 0/20/25 ms negative waits with deterministic queue/event completion; preserve upstream virtual clock and one-process isolation.

## 2. What upstream already covers and defaults

Upstream has **no SLACK_ACCESS_POLICY, SlackAccessPolicy or readJoinedChannels setting**. It already has group-DM listing, group_dm descriptors, mpim scopes and events. This proposal adds exact opt-in authorization, not groups from scratch.

| Concern | Upstream/no policy | Fork explicit policy |
|---|---|---|
| Writes | SLACK_SEND_CHANNELS allows exact conversation IDs; unset permits Slack-authorized destinations; set-empty refuses startup. | Fresh readability + explicit pins/peers + effect scopes, intersecting old send list. Empty policy write list validly denies all non-DM writes. |
| DMs | SLACK_DISABLE_DMS defaults off; on denies incoming/read/write DMs and groups with kind checks. SLACK_DM_USERS filters inbound one-to-one peers only; absent/empty unrestricted. | dmUsers governs reads/writes; empty denies. **Legacy SLACK_DISABLE_DMS and SLACK_DM_USERS are bypassed, not intersected.** Groups have separate opt-in list. |
| Reads/listing | Slack permissions and DM guard; listing normally filters membership but includeNonMember can discover public nonmembers. No general fresh-member policy for reads. | Fresh exact admission, no includeNonMember escape, explicit joined-read setting. History scope separate from metadata scope. |
| Unknown scopes | Listing initially tries enabled types and adapts to grants/refusals. | Fail closed; no admitted listing. |
| Files | URL-only HTTPS Slack-file fetch; existing parsing/size/time/bearer and cross-origin redirect protections. No exact conversation/share authorization. | Channel/file identity/association, files:read, canonical URL, all redirects refused; conditional schema/references. |
| Subscriptions | SLACK_SUBSCRIBE_MEMBER_CHANNELS is ambient-delivery policy, default off. | Same delivery setting subordinate to admission; not an alias for readJoinedChannels. |

Sources: upstream [README.md](https://github.com/anima-research/slack-mcpl/blob/ca8f6b1193154384e4626921255f86923fc5edf3/README.md), [src/config.ts](https://github.com/anima-research/slack-mcpl/blob/ca8f6b1193154384e4626921255f86923fc5edf3/src/config.ts), [src/slack-adapter.ts](https://github.com/anima-research/slack-mcpl/blob/ca8f6b1193154384e4626921255f86923fc5edf3/src/slack-adapter.ts) conversationTypes/assertWritable/assertNotDm/sendDM/history/incoming paths; src/server.ts:877–920.

**No opt-in:** recommended extraction preserves authorization, tool schemas, URLs, requested scopes, DM and delivery defaults. No new host protocol or Node floor is required. Prove this with legacy tests, not a blanket claim about wholesale fork copying.

Two caveats:
1. Fork group location/backscroll/auto-subscribe formatting is **unconditional**. Copying it literally changes legacy text. Recommend restricting this series' new presentation to explicit mode, or separately approving a display-only fix. #50 owns descriptor labels.
2. Fork explicit-mode dmsWritable depends only on peers; sendDM opens before checking the legacy send list. A channel-only SLACK_SEND_CHANNELS can therefore leave send_dm offered and open a conversation whose post is denied. Legacy mode already refuses before opening when no D ID can pass. Recommend retaining that early veto in explicit mode too, with final exact-D-ID intersection. This is a proposed improvement, **not current fork behavior**.

#51 zero-limit migration and #53 tool suppression remain their own PRs, not implicit policy defaults.

## 3. Proposed upstream PR sequence

**Estimates only: net production additions (added minus deleted), excluding tests/README/fragments. Files count touched/new production files. No patch extraction/build was performed.** The mixed fork delta includes access-policy +113, file-access +30, adapter +366/-45 and server +227/-76; these contain routing/typing/paths and reverse upstream changes, not standalone policy sizes. Each behavior PR carries docs, fragment and exact-head numeric test evidence.

| PR title | Contents; estimated net production lines and files | Dependencies; tests |
|---|---|---|
| **A1 — feat(access): add an internal explicit policy model** | Pure ordinary-channel/DM model, copied sets, U/W IDs and scope checks. No group/fallback yet and no supported connector opt-in. **+70–100 lines; 1 file: src/access-policy.ts.** | Main. Pure identity/kind/scope/read-write/copy matrix; required fields/empty lists; add explicit U/W and chosen format boundary tests. Describe as inert preparation. |
| **A2 — feat(access): prepare complete adapter authorization gates** | Private policy state and fresh metadata/history/write/list/incoming/DM/upload/delete/reaction/ACK/directory gates; every history/backscroll entry point included. Preserve legacy/clock. **+150–230 lines; 1 file: src/slack-adapter.ts.** No supported installation method or connectSlack option. | A1. Internal test-local injection, not public test API. Adapter matrix, history continuation/metadata rejection, no sender lookup on denied input, ACK and legacy suites. Real server publish/rollback coverage. Exclude typing/routing. |
| **A3 — feat(access): prepare conversation-bound attachment reads and references** | File share/identity helper, metadata facade, protected schema/fetch, redirect refusal and live/history/thread/backscroll hints. Still no supported activation. **+100–170 lines; 5 files: src/file-access.ts, src/content.ts, src/history-read.ts, src/slack-adapter.ts, src/server.ts.** | A2. fileAccess/fileReferences, corrected mock nesting, no-byte-on-denial, missing IDs, hostile fields, legacy URL/redirect/upload regressions. |
| **A4 — feat(access): expose opt-in policy configuration with legacy defaults** | JSON through upstream startupSettings, clean pre-connection refusal, CLI/logging, immutable pre-start adapter installation. File-schema and precedence migration docs. **+40–80 lines; 3 files: src/config.ts, src/index.ts, src/slack-adapter.ts.** | A1–A3. Reconcile #53; no fork configuration.ts. CLI malformed/unknown/default/mixed-controls tests. Real server+adapter/fake Slack for read/send/DM/publish/rollback/file/inbound denial; full one-process suite. |
| **G — feat(access): allow explicitly named group DMs** | groupDms parsing/admission, exact joined mpims, scope-aware listing/history/inbound/write and agreed group presentation. No new protocol/kind. **+45–95 lines; 4 files: src/access-policy.ts, src/config.ts, src/slack-adapter.ts, src/server.ts.** | A4; #50 need not block but preserve merged labels. Non-routed group default-deny/read-only/write/scope/revocation/partial-metadata/reply/file/ambient/mention/framing tests; readJoinedChannels=false; no-policy regression. Exclude three routing cases. |
| **F — optional feat(access): prove membership for operator-verified public pins** | Exact public write pins, symbol proof, fresh history-before-operation, separate data-page accounting, listing with **per-pin catch/log/continue immediately**, group overlap refusal. **+65–115 lines; 3 files: src/access-policy.ts, src/config.ts, src/slack-adapter.ts.** | A4, preferably G for overlap field; not prerequisite for G. historyMembershipFallback minus unavailable typing; proof/page test; unknown/missing scopes, no fallback after info refusal, stale plus good pin, overlap and attestation docs. |

**Safe intermediate states:** A1–A3 must remain dormant in supported connector APIs. Do not expose configureAccessPolicy at A2, even for embedded users: files would remain a bypass. Test-local access to private state can exercise preparations without adding public test-only hooks. If maintainers dislike dormant code, review these boundaries as a stack and merge only the complete dependency chain together. Do not meet size targets by releasing partial enforcement. If estimates grow, split inert preparation further, not authorization after activation.

### Integrations with existing PRs, not duplicate features

| Follow-on | Estimate/dependency | Tests |
|---|---|---|
| **P/A — fix(upload): enforce policy before path reads and upload** | After A4 + #31. **+5–25 lines, 1–2 production files: adapter/server**; potentially **zero** if #31's final preflight already invokes the now-policy-aware helper. Can be test integration in the later PR. | pathAccessPolicy: denied peer before local read, argument order, revocation during read, no upload effect; Buffer cap in upload ownership. |
| **T/A — fix(typing): apply explicit policy to thread status** | After A4 + rebuilt #12. **+5–25 lines, 1 production file: adapter**. No frozen-target routing queues. | Split status cases; read-only/revoked/missing-scope no effect, optional typing retains messaging, cleanup after revocation; #12 lifecycle/refusal/target regressions. |

Neither #31 nor #12 blocks base policy if absent from main. **If either lands before A4, its policy integration is an A4 activation prerequisite**, not an unsafe later fix. If it lands after A4, its own merge must include policy integration. Recipient routing is a later series with agreed host contracts; no speculative host/framework implementation-size estimate is offered here.

### Future verification, not results claimed now

For each implementation PR: typecheck/build, targeted red-first tests and full one-process suite with numeric exact-head results. Retain upstream virtual clock. Follow current CI install/build/start matrix and full suite at Node 22.12.0; ordinary policy/group tests must not acquire Node-24 skips. Also exercise targeted authorization/global-isolation cases on Node 24.

Activation production-path probe: real CLI or real server+adapter against fake Slack boundaries, MCP and MCPL tools, host publish/rollback and Socket events. Assert no unauthorized post/upload/reaction/status/download; separately assert DM-open ordering. Future HTTP/TCP fakes must enforce a guard rejecting non-loopback binds. Every execution remains wrapped in orgasmic dispatch gate <name> -- timeout 900 … with update notifiers disabled.

## 4. Maintainer/owner decisions

| Question | Options and ⭐ recommendation |
|---|---|
| Setting names? | Existing SLACK_ACCESS_POLICY/fields; renamed profile; many env switches. **⭐ Keep current JSON names** for a focused port; explain writeChannels includes group conversations, while dmUsers is separate. |
| Defaults/mixed DM controls? | Fork policy overrides old switches; intersection; reject mixed settings. **⭐ Preserve fork precedence with prominent docs/tests** if migration compatibility is desired; explicitly approve the surprising SLACK_DISABLE_DMS override. Intersection is defensible but not a faithful port. |
| Send-list and DM opening? | Copy open-then-deny; early no-D-ID veto plus final exact check. **⭐ Early veto and hide unusable send_dm**, preserving upstream's no-unnecessary-open principle. Explicit deviation from fork. |
| Format/version/strictness? | Match null/embedded-key quirks; consistent strict object; versioned/file format. **⭐ Unversioned JSON with required core fields, unknown-key rejection and consistent embedded/CLI validation; reject null optional lists.** Keep duplicates harmless; document fork migration differences. |
| Group reads vs readJoinedChannels? | Independent explicit group list; gate groups on joined-read switch; wait for routing. **⭐ Preserve independent non-routed group access**, documenting the later routed-mode extra requirement. |
| Group labels without opt-in? | Copy unconditional changes; policy-only presentation; separate display fix. **⭐ Scope this series to opt-in**, optional separate display fix after #50. |
| Public-pin fallback? | Initial release; optional extension; decline unprovable visibility. **⭐ Optional F only after acceptance of operator attestation**, stale-pin isolation inseparable. Do not block groups on it. |
| Attachment backward compatibility? | Conditional same tool; distinct protected tool; legacy URL escape hatch. **⭐ Same tool with conditional channel/file-ID schema**, legacy URL only without policy; clients must refresh tools/list. |
| Small-PR landing? | Inert preparations; single larger atomic PR; stack merged together. **⭐ Inert A1–A3 then A4**, complete-stack merge if desired. Never partial protection. |
| Cleanup after revocation? | Fresh denial for all effects; privileged cleanup exemption. **⭐ Retain fresh checks**, document residual artifacts; no new bypass in this port. |

These are proposed decisions, not approvals or implemented changes.

## Verification Gates

All shell launches set NO_UPDATE_NOTIFIER=1 and npm_config_update_notifier=false from the first command. Inspection used orgasmic dispatch gate <name> -- timeout 900 bash …, public git reads and unauthenticated GitHub GETs. No dependency install, application test, connector, HTTP fake or TCP listener was started. No listener was exercised, so none required a loopback bind; no external listener was permitted. No source or main-checkout ref writes occurred.

Gate logs reside beside this report as gate-<name>-*.log:

| Gate | Outcome/scope |
|---|---|
| planning-instructions | Pass: skill, instruction paths, baseline. |
| planning-local-map | Exit 0: tracked files, prior plan, command-ownership instructions. Cosmetic printf heading error only; later reads succeeded. |
| planning-public-snapshot | Pass: fresh upstream fetch; public PR/issue/file/review/comment snapshots. |
| planning-policy-source | Pass: policy/config/file helper and call-site map. |
| planning-upstream-source | Pass: upstream controls/parser/contribution rules and current PR scopes. |
| planning-enforcement-paths | Pass: checks/tests, nested fetch mocks. |
| planning-history-file-routing | Pass: history/files/routing/group presentation. |
| planning-delta-and-test-review | Exit 1: inspection rg searched names not matching the actual upload helper under set -e. Product/test failure not established. Earlier diffs/test reads completed; remaining inspection rerun below. |
| planning-supplemental | Pass: actual requireUploadDestination, runner/test paths, finalize help, #47/#1 merge classification. |
| planning-final-source-check | Pass: parsing quirks, inbound/scopes, globals/timers, unchanged clean HEAD. |
| planning-write-report | **Invalid artifact attempt:** shell quoting broke on report prose. Gate child wrote a truncated report and exited 0, but outer shell exited 2. Some subsequent prose was mistakenly parsed as shell commands outside the wrapper and failed. Do not treat that gate as a successful report or verification receipt. |
| planning-report-recovery | Replaces the truncated evidence report with correctly quoted content and checks unchanged worktree; artifact check only, not application validation. |

The reporting error is an execution-wrapper deviation, disclosed rather than hidden. Error output showed failed prose commands and shell syntax errors, not successful production edits. The recovery explicitly verifies worktree cleanliness/HEAD. No runtime/test count from another run is reused.

Evidence: prior-plan.md, adapter-delta.patch, server-files-delta.patch, public pulls-*.json/issues-*.json snapshots, scratch-location pointer and gate logs. Diffs are inspection artifacts, not proposed implementation patches. No prior gate receipt was reused.

## Unmet Criteria

**No substantive planning deliverable is missing:** surface mapping, current upstream comparison, small-PR estimates/dependencies/tests, mock leak, decisions and risks are supplied. Implementation/commit/publication/live tests were explicitly out of scope. Estimates are not extraction results.

**Execution caveat:** the first report-writing shell was incorrectly quoted, allowing failed prose-command parsing outside the requested wrapper. The corrected artifact and clean-tree check recover the deliverable but do not erase that process deviation. No production code or commit was made.

## Residual Risk

- No extracted patch, application/build/runtime qualification or live Slack/host composition. Recheck heads and measure actual hunks before implementation; historical test claims are not this plan's evidence.
- Extra fresh info calls per member/event/effect may affect rate limits and budgets; not measured. Scope metadata is observed/cumulative; Slack remains final authority. Transient errors must fail closed without being misrepresented as permanent permission changes.
- Admission is not transactional: membership can change between check/effect, between pages or while admitted inbound work waits. Previously registered labels, delivered content and cached names are not automatically purged. No continuous/retroactive revocation guarantee.
- File-share responses, mpim metadata variants and bot-history membership assumptions were inspected in code/tests, not independently established against live Slack. Redirect refusal can reject usable downloads. File association is conversation-level, not exact-message proof.
- Public visibility in F is an operator assertion. Known group overlap rejection cannot detect a misclassified private/group ID never listed in groupDms.
- canWrite hints can overstate effective permission; never replace asynchronous checks. The explicit-mode send-list/DM-open mismatch is identified, not fixed here.
- Null optional lists/embedded unknown keys differ between actual fork and recommended strict schema; migration must be deliberate. Literal group presentation port changes legacy text, and routed groups impose an extra readJoinedChannels requirement.
- Cleanup can be denied after revocation, leaving artifacts until independent cleanup/expiry. Host grants and disabled tools are orthogonal, not authorization substitutes.
- Maintainer naming/default/format/precedence/fallback/stack choices, unpublished #12 rebuild details, exact extracted sizes, live workspace behavior and later routing/host compatibility remain undetermined. Those are decision/implementation gates, not permission to invent production changes in this planning run.

