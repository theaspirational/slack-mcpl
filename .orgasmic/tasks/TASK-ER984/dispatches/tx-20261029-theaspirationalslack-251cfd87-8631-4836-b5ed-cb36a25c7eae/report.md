# TASK-ER984 — A4 activation plan, round 1

## Changed

**Plan only. No repository files changed, no commit, no push, no PR.** This report is the deliverable. The manager explicitly waived the generic implementer commit requirement for this read-only round (answer to `ask-7fdfb8e095ff46bd82006db25bd280ab`). Recommendations below are owner choices for the implementation round, not implemented behavior.

### Baseline and references

- Preflight HEAD: `3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf`, exact match; clean tree. This is the requested A3-on-group-DM baseline. A3 is still under re-review; implementation must absorb its final disposition before activation.
- Fetched upstream main: `7274283fa719a17328ef8e085336ce25f6f22b08`. **It has not moved from the supplied upstream baseline.** Did not rebase or merge.
- Fetched upstream #53 head: `c4540a14e34360d478583b088fd131e4765b5f93`. Inspected its `src/config.ts`, `src/index.ts`, server option and CLI harness changes. It is still open. Follow its `startupSettings` → settings → constructor wiring and value-naming refusals, not the fork's separate `optionalConfiguration` parser. [Upstream #53](https://github.com/anima-research/slack-mcpl/pull/53).
- Inspected the three requested commits and fork-main source at local `origin/main` snapshot `3152457a48eb3ffe637c657f2f1d2fcf1db8c42c`; all three commits are ancestors of that snapshot. No claim that this locally available fork-main ref was freshly fetched.
- Instructions read: `/home/orgasmic/.agents/skills/orgasmic/SKILL.md`; `/home/orgasmic/.orgasmic/ledgers/theaspirational.slack-mcpl/.orgasmic/project.org`; repository `CONTRIBUTING.md`; worker `workers/command-ownership.md` and `workers/recovery.md`. No applicable AGENTS.md found; supplied conventions/gotchas: none.
- Authoritative code: `src/config.ts`, `src/index.ts`, `src/access-policy.ts`, `src/slack-adapter.ts`, `src/file-access.ts`, `src/server.ts`; tests cited below. The premise is correct: production has no installer for `SlackAdapter.accessPolicy`; only `test/adapterAccessFixture.ts` mutates it after construction.

## 1. Activation design

### Setting and strict parsing

⭐ Add exactly one optional environment setting, **`SLACK_ACCESS_POLICY`**, containing an unversioned JSON object:

```json
{
  "readJoinedChannels": true,
  "writeChannels": ["CEXAMPLE"],
  "dmUsers": ["UEXAMPLE", "WEXAMPLE"],
  "groupDms": ["GEXAMPLE"]
}
```

- Required: boolean `readJoinedChannels`, array `writeChannels`, array `dmUsers`. No defaults for missing required keys. `writeChannels` accepts exact uppercase C/G IDs, not D IDs; `dmUsers` accepts U/W IDs. `groupDms` alone is optional, accepts exact G IDs, and omission/empty denies all MPIMs. Readable MPIMs need not be write-pinned; writable MPIMs need both lists.
- Only **absence** (`env.SLACK_ACCESS_POLICY === undefined`) selects legacy mode. Empty string, whitespace, `null`, `false`, malformed JSON, arrays, wrong types, unknown keys, incomplete objects and invalid IDs refuse startup. An explicitly empty policy object is invalid; `{ "readJoinedChannels": false, "writeChannels": [], "dmUsers": [] }` is valid and denies conversations, but not the directory (see 3d).
- Parse in `startupSettings` in `src/config.ts`, using `JSON.parse` then the existing `parseAccessPolicy` validator. Do not introduce `src/configuration.ts`, a parallel parser, another environment toggle, implicit enabling from legacy variables, or a policy setter.
- Preserve usage/token checks and legacy error precedence when the setting is absent. In explicit mode, validate policy before processing legacy controls, and continue validating unrelated settings normally. If #53 lands, disabled-tools validation remains independent.
- Return `{ refusal }`, not an uncaught exception. Stable one-line errors must name the setting and rejected value, escaped with `JSON.stringify(raw)`. Proposed syntax error: `SLACK_ACCESS_POLICY must be valid JSON, got "{"`; shape error: `SLACK_ACCESS_POLICY has invalid or incomplete policy, got "{}"`. A cross-field error names the conflicting fields and rejected policy value. No native JSON parser stack or multiline injection; never print token variables or the full environment. Document that this non-secret configuration can appear in startup refusals.
- Return a frozen/snapshotted config, retaining the existing validator's protections for embedded callers. Keep `accessPolicy` absent from legacy settings, rather than adding an own property with `undefined`, to preserve existing settings shape.
- **`groupDms` travels by omission**: pass the parsed object unchanged. If rebuilding it is necessary, use an own-property conditional spread. Never write `{ groupDms: parsed.groupDms }` for an omitted key; the existing strict parser deliberately rejects an explicitly present `undefined` value. Test `Object.hasOwn` through the complete wiring, not just JSON serialization.

### Construction and startup ordering

Proposed path:

1. `startupSettings(args, env)` validates the complete explicit config or refuses before any Slack SDK/client/network activity.
2. `src/index.ts` prints any legacy-ignored warning to **stderr**, and conditionally passes `accessPolicy` to `connectSlack`.
3. Add `accessPolicy?: SlackAccessPolicyConfig` to `SlackAdapterConfig`. `connectSlack` constructs/validates `new SlackAccessPolicy(config.accessPolicy)` **before creating clients or calling auth.test**. Thus embedded callers cannot start Slack and only later discover bad config.
4. `auth.test` resolves identity and reported scopes. Pass the policy instance as a new trailing constructor parameter to `new SlackAdapter(...)`, leaving existing legacy callers source-compatible. Make the policy field private readonly. Constructor parameter initialization happens before constructor-body diagnostics and listener registration.
5. Once policy and scopes both exist, run policy-aware startup scope diagnostics. Then register handlers, construct `SlackMcplServer`, start Socket Mode and expose the selected transport. No post-construction assignment and no public reconfiguration method.
6. Explicit-mode summary identifies explicit mode, configured channel-write pins, DM peer count, group-DM count and the directory caveat. Do not emit the misleading legacy `writes: anywhere; DMs: on` line. Leave legacy log bytes alone when the setting is absent; if #53 has landed, preserve its added tools-off suffix as that new base requires.

**Partial/invalid operator config always exits 1; never retry as legacy, silently fill missing lists, or continue with a partly installed policy.** A constructor validation failure also prevents listener installation.

Scope decision: ⭐ refuse explicit startup if auth reports no usable scope metadata (the current normalizer treats empty as unknown). Known but limited scope grants may start: report missing read/history/effect scopes and deny affected operations. Do not require every optional file/reaction capability just to run a read-only connector. Missing/unknown grants never authorize an operation. Distinguish this limited-capability state from invalid operator config; do not fall back to legacy listing when no type can be read. Compute enabled channel types from policy, including no ordinary-channel types when joined-channel reads are off. Scope warnings must describe the actual constructed policy, not legacy defaults.

## 2. Legacy controls: replace, never combine

⭐ In explicit mode **ignore `SLACK_DISABLE_DMS`, `SLACK_DM_USERS`, and `SLACK_SEND_CHANNELS` completely**. This applies even to invalid or empty legacy values; parsing them first would make them active startup constraints and contradict replacement. Absence of policy keeps their existing parsing, failures, behavior and logs byte-for-byte.

- Add policy/legacy branches to `dmsWritable`, `canWrite`, `requireWritableConversation` and `sendDM`'s early no-D-ID veto. Existing code currently intersects `sendChannels` in all these paths. Keep `dmsDisabled`, `assertNotDm` and incoming-event checks policy-first.
- Policy write hints must return from the policy branch, not fall through to the legacy list. The effectful write path must return after fresh policy authorization, not call legacy `assertWritable` afterwards. This covers messages, host publish, edits/deletes, reactions/ack cleanup, uploads and rollback.
- Omit legacy adapter options in explicit-mode CLI wiring as defense in depth. Also enforce replacement in adapter methods when an embedded caller supplies both; relying only on CLI omission is insufficient.
- Replace the current tests that deliberately assert send-list intersection (`test/adapterAccess.test.ts`, and a group-DM denial case) with replacement tests. Retain those restrictions in separate no-policy legacy cases.

**Exact warning contract:** if any of the three variables is present, including empty, emit one stderr line listing only the present names, in fixed order:

`[slack-mcpl] SLACK_ACCESS_POLICY is active; ignoring legacy settings: SLACK_DISABLE_DMS, SLACK_DM_USERS, SLACK_SEND_CHANNELS. The explicit policy replaces them; remove these variables to avoid confusion.`

No warning when none is present; no warning or new log with policy absent. Never include ignored values. An invalid policy refuses startup rather than warning and proceeding.

**Documentation contract:** add an explicit-mode subsection immediately beside the README environment table; mark each of the three legacy rows “Legacy mode only; ignored when SLACK_ACCESS_POLICY is set.” Put the same replacement warning above migration examples and in `.env.example`. Explain that migrating a legacy inbound-only DM whitelist to `dmUsers` also authorizes reads and writes to those peers; do not describe it as a mechanical rename. `SLACK_SUBSCRIBE_MEMBER_CHANNELS`, acknowledgements, subscriptions and #53's tool disabling remain separate controls; none can broaden policy admission. Disabled tools are not a substitute for policy gates on host publish, inbound delivery or rollback.

## 3. Owner decisions — options and recommendations

### a. MPIM membership evidence

**Evidence:** Slack's conversation-object docs define `is_member` as token-principal membership. MPIM-object docs list it but do not mark it required. `conversations.info` describes its MPIM response as similar to a channel response, without an unconditional field-presence guarantee. `conversations.list` actually shows an MPIM with `is_member:true`. This supports using the field when supplied, **not asserting that every live info response always has it**. No live Slack observation was made. [Conversation object](https://docs.slack.dev/reference/objects/conversation-object/), [MPIM object](https://docs.slack.dev/reference/objects/mpim-object/), [conversations.info](https://docs.slack.dev/reference/methods/conversations.info/), [conversations.list](https://docs.slack.dev/reference/methods/conversations.list/).

The code is stricter than mere visibility: `SlackAccessPolicy.requireReadable` demands exact ID, MPIM kind, named `groupDms` entry and `is_member === true`. `test/groupDmAccess.test.ts` deliberately denies missing membership; its happy-path fixtures manufacture the field. Tests therefore prove fail-closed behavior, not Slack field availability.

Options:
1. Keep info-only proof and deny any MPIM lacking the field: smallest patch, but potentially unusable for some responses.
2. ⭐ **Use info's boolean when present; when absent, freshly ask `conversations.members` and confirm the authenticated bot user ID.** Explicit `false`, malformed membership, conflicting kind/ID or denied group is a denial, not an invitation to override it. Unknown bot identity denies. Request at most 200 members/page, at most five pages per admission, also respecting any host-call deadline; stop on positive bot membership, otherwise require exhaustion to conclude absence. Reaching the page cap is unknown membership and denies, not a successful negative lookup. Failure, malformed pages, cursor cycles or deadline exhaustion deny. The fixed cap also bounds background/event pagination where no host deadline exists. A normalized membership boolean may be passed to the pure policy only after this check. No name resolution or membership list leaves the adapter. This is an A4 admission fix, not a new policy setting.
3. Treat appearance in a listing as membership: avoid calls, but it does not freshly establish membership for events/direct calls and cannot safely reuse a stale listing. Do not choose this in A4.

`conversations.members` is a paginated membership endpoint supporting bot tokens with the matching read scopes, including `mpim:read`. [Slack method reference](https://docs.slack.dev/reference/methods/conversations.members/). Preserve the pure policy's strict `true` requirement; implement fallback in adapter evidence acquisition. Test it without weakening ordinary-channel checks.

### b. File modes

Options: deny only known bad modes (forward compatible, newly introduced modes could pass); or admit only understood modes (new forms need review).

⭐ **Keep the `hosted` / `snippet` / `post` allow-list, with exact string comparison, not coercion.** Slack documents these plus `external`. Continue refusing external, tombstoned, deleted, inaccessible and malformed files; a permitted mode alone is not authority. [Slack file object](https://docs.slack.dev/reference/objects/file-object/).

A3 currently allows absent mode and calls `String(mode)`. Tighten the full `files.info` evidence boundary to require a known string mode: missing/null/object/unknown modes deny bytes and deletion. Sparse event/history references may still be displayed, but cannot authorize a download. Update success fixtures to include a realistic known mode; keep explicit absent-mode negative cases. Still require exact file ID, positive association with the admitted conversation, files:read, canonical Slack private URL and no redirects. This policy-only tightening belongs in A4 unless A3 re-review adopts it first.

### c. DM file upload/delete without a channel-write pin

Options: require a D-ID pin (would change the schema and duplicate peer authorization), forbid DM file writes entirely, or use the same allowed-peer rule as DM messages.

⭐ **Allow uploads and eligible deletes for an admitted 1:1 DM peer without a `writeChannels` entry.** The schema intentionally excludes D IDs, and `requireWritable` already exempts admitted 1:1 DMs from the channel pin. This is not an unconditional DM grant: exact returned D ID and peer, im:read and files:write are required; opening a DM requires the existing opening scopes. Upload rechecks the destination after bytes and before sharing. Group DMs are not exempt: group allow-list plus write pin plus group scopes still apply.

Delete additionally needs files:read, current file association and the adapter's recorded upload provenance. A caller-supplied pair is insufficient. Losing provenance on restart/1000-entry eviction or failing association after an incomplete upload means no automatic deletion; report possible residue. Existing file deletion is global across all shares, not a conversation-local deletion. Preserve the A3 warning and document that limit; do not claim strict isolation of deletion effects.

### d. `find_user` directory exposure

Options: filter to DM peers only (breaks channel-only contact lookup); collect all admitted conversation members (expensive, new privacy and caching surface); deny find_user in explicit mode; or keep directory access separate and make that boundary explicit.

⭐ **Keep workspace-wide `find_user` with users:read, explicitly outside conversation confinement.** Do not pretend `dmUsers` filters the directory. Keep the existing scope gate and document exactly the returned fields: user ID, username, real name and display name; no new fields.

README/migration wording: “This policy confines conversations and associated files. It does not confine the workspace directory: find_user can return people who are not in dmUsers or an admitted conversation.” Emit a policy-mode startup notice with that meaning. A conversation-deny-all policy is not a directory-deny-all policy. If #53 is available, operators can disable `find_user` and direct calls will also be refused; on the pinned base that option is **not implemented**, so do not claim it exists. Omitting users:read denies this method but also affects name resolution. Directory filtering/another setting would be a separate PR.

### e. Admission call budget/cache

`readAccessConversation` makes a fresh info request per candidate or event, and authorization is deliberately not cached. Slack documents info as Tier 3, 50+ requests/minute; this is not a promise of an exact available budget. [conversations.info](https://docs.slack.dev/reference/methods/conversations.info/).

Options: positive TTL cache (lower volume but stale authorization after leave/revocation); listing-implied authorization (weaker evidence); or fresh checks with explicit limits and safe failure.

⭐ **No positive membership cache in A4.** Keep the existing ordinary-nonmember listing prefilter and fresh checks for remaining candidates. Use existing `withCallTime`/SlackWebClient limits: a 25-second host call, 10-second request start allowance, at most five seconds of rate-limit waiting per host call, no unbounded retry. Account for the additional members pages on MPIMs missing membership, with the five-page cap in 3a. One history authorization per invocation/continuation, not per page; two target checks for upload by design. These are start/deadline controls, not a hard guarantee against a response that trickles bytes indefinitely.

- Add measured call-count tests: 200 explicitly unjoined ordinary channels cause zero info requests; two candidates cause two fresh checks; a later membership loss denies even after prior success. Duplicate listing IDs should not produce repeated checks within one listing. Never reuse an authorization across events, writes or completed calls.
- Fix policy listing's `catch { continue; }` distinction: a genuine denied/stale candidate is omitted; rate-limit, network failure and out-of-call-time must not masquerade as a complete empty listing. Propagate to a foreground caller; background registration uses its existing wait/retry path. Unknown/unclassified errors remain denied, with a bounded diagnostic rather than content-bearing error dumps.
- Events have no host-call deadline today. Keep fail-closed dropping on admission failure and immediate envelope ack; make transient admission drops visible through a bounded aggregate stderr diagnostic. Do not add an unbounded event retry queue or a global authorization cache. Record event-load/rate-limit behavior as a capacity limit, not successful delivery.
- A global scheduler, TTL/negative cache, or shared in-flight authorization is a separate performance PR with revocation semantics reviewed. Do not hide these larger changes in activation. The recommendation accepts lower throughput and dropped events during Slack outages rather than stale access.

### f. `readJoinedChannels:false` with pinned writes

Options: merely document ordinary writes cannot work; redefine reads/writes as independent (wider model change); refuse contradictory config.

⭐ **Refuse contradictory ordinary-channel pins during parsing/construction**, with an important MPIM exception: if joined reads are false, every write pin must also appear in `groupDms`. All other write pins name an impossible ordinary-channel permission under the current model and must stop startup. Thus `false + writeChannels:[CEXAMPLE]` refuses; `false + writeChannels:[GEXAMPLE] + groupDms:[GEXAMPLE]` remains valid for a group-only connector. This preserves the intentional group-only coverage in `test/groupDmAccess.test.ts`. A G ID is not assumed to be a group DM: live kind/membership must still match. A read-only group needs no pin.

Put this validation in `parseAccessPolicy`, so embedded and environment callers agree; update the pure matrix test which currently constructs contradictory ordinary-channel configs. Do not “fix” this by silently enabling joined-channel reads. Document that writing ordinary channels implies being willing to read joined ordinary channels; supporting a write-only ordinary channel would be a separate model change.

### g. Additional decisions discovered

- **Scope state:** options are optimistic unknown scopes, blanket requirement for every scope, or known-scope fail-closed operation. ⭐ Choose the explicit startup unknown-metadata refusal and per-operation limited-scope behavior in section 1. The existing union of reported scopes is not proof of revocation handling; do not claim immediate scope-revocation isolation for already-delivered events. Changing global scope tracking is separate, unless A3 review identifies an activation blocker.
- **File deletion across shares:** options are forbid multi-shared deletion, or preserve tracked-upload global rollback with warning. ⭐ Preserve A3 semantics in A4 and document effects outside the target. An exclusive-share deletion policy would require a separate design, including incomplete shares metadata and the time-of-check race.
- **A3 unfinished cleanup:** options are weaken provenance to permit cleanup, or leave possibly unshared uploads for operator cleanup. ⭐ Keep fail-closed provenance/association and explicit residue reporting; never add raw `files.delete` fallback.
- **No hot reload:** options are a runtime setter or restart-only policy. ⭐ Restart-only, readonly construction-time policy. Replace test-only mutation installers with constructor fixtures. Tests simulating revocation should change fresh Slack metadata, not mutate the policy; use new adapters for config changes.
- **#53 ordering:** options are force a dependency/cherry-pick or remain independent. ⭐ Remain independent; resolve overlapping config/index/harness edits if #53 lands. Disabled tools can further restrict exposure but cannot grant any access. Do not change tool catalog bytes for legacy mode simply to add activation.
- **All-zero policy:** ⭐ Valid conversation deny-all; clearly label directory exposure. Never interpret empty lists as unrestricted in explicit mode.

## 4. Requested fork fixes and placement

| Candidate | Applicability to upstream / this baseline | Recommendation |
| --- | --- | --- |
| `fe9297a`, W-prefixed users, non-routing only | Policy rule is relevant, but **already present** in `src/access-policy.ts:20` as `/^[UW][A-Z0-9]+$/`; pure/adapter tests already cover W peers. Fork host-contract files and expectedBotUserId belong to functionality absent from this upstream base; do not import them. | ⭐ No cherry-pick and no duplicate PR. Keep W IDs through A4 JSON/CLI tests. Routing and host-contract changes remain out of scope. |
| `2425f3e`, stale pinned channel does not end listing | Its special loop enumerates `historyMembershipFallbacks`, which upstream baseline does not have. Current ordinary listing already skips per-candidate proof failures. Direct cherry-pick does not apply. | ⭐ Not A4. Carry equivalent isolated stale-pin handling with any future fallback PR, distinguishing transient failures as in 3e. |
| `eb673bb`, check afresh only listed member candidates | Relevant to policy listing; **already present verbatim in effect** at `src/slack-adapter.ts:1029–1030`. It skips explicit nonmember ordinary channels, not all missing membership and not DMs/MPIMs. Existing adapter test covers this. | ⭐ No duplicate production patch. Add large-list call-budget regression coverage in A4. Never treat the prefilter as positive authorization. |
| Optional pinned-public-channel history fallback | Present in fork-main source, absent and rejected as an unknown key in upstream policy. It would synthesize public/member metadata from fresh history plus operator attestation that a pin is public, when channels:read is missing. It is a new proof mechanism/schema field, not activation plumbing. | ⭐ Separate PR, **not A4**. Keep `historyMembershipFallbackChannels` invalid in A4. Requires bot-token-only proof, exact public pin subset, no group overlap, fresh successful history, no invented OAuth grants, no stale cache, isolation of failed pins and pagination/rate-limit tests. |

The fallback rationale is narrower than “history proves public”: Slack says bot history access is limited to conversations the bot belongs to, while user-token access differs. History success does **not** identify public visibility; an ID prefix alone cannot either. This is why the fallback deserves separate review. [Slack history token/access table](https://docs.slack.dev/reference/methods/conversations.history/).

## 5. Documentation deliverables for implementation

### README and `.env.example`

1. Environment row with a small synthetic JSON example; presence enables, absence preserves legacy, empty/invalid stops startup.
2. Field table with required/optional keys, exact ID kinds, U/W peers, empty-list semantics and the group-only exception.
3. Read/write matrix for joined ordinary channels, allow-listed 1:1 peers, named joined groups, and unadmitted targets. Include scope needs for metadata/history/files/reactions and no auto-join.
4. Replacement warning beside all three legacy variables; policy startup summary example and one-line refusal examples.
5. File API changes when explicit: channelId/fileId references instead of raw private URLs, association/provenance checks, supported modes, redirect refusal and global delete/residue limitations.
6. Directory boundary and independent tool-disable control, labelled as requiring #53 if it has not landed.
7. Availability costs: fresh admission, MPIM members fallback, rate-limit/event-drop behavior; subscriptions do not authorize reads. No promise of sandboxing unrelated host filesystem permissions.

### New `docs/access-policy-migration.md`

- Scope and rollout prerequisites: reviewed A3 chain, required OAuth grants/reinstall, snapshot current operator config, test against loopback fixtures before deployment.
- Choose the entire policy; do not translate comma-separated environment values mechanically. List joined-channel visibility versus writable pins separately.
- Mapping: legacy DM-off → `dmUsers:[]` **and omit/empty groupDms**; DM-users → deliberate peer read/write grant; send-channels → C/G pins with group IDs also in groupDms, while D destinations must be resolved to permitted peer IDs. No inference that all G IDs are MPIMs.
- Remove the legacy trio, install complete JSON atomically, restart, inspect ignored-setting/scope/directory logs, test allowed and denied operations including host publish/rollback.
- Examples: conversation-deny-all; joined channels read-only; one writable joined channel; DM-only; group-only. Synthetic IDs only, no workspace names or credentials.
- Troubleshooting: bad value, missing metadata/scope, unknown MPIM membership, stale pin, rate limit, unsupported file mode, orphaned upload.
- Rollback: restore reviewed legacy environment and unset policy only as an intentional security-mode change. Unsetting can broaden access; never recommend it as automatic recovery from a malformed policy. Config is restart-only.

### Proposed changelog fragment

Path: `changelog.d/access-policy-activation.added.md` (draft content; not created this round):

```markdown
- **Operators:** opt in to explicit conversation and file access with
  `SLACK_ACCESS_POLICY`, a complete JSON policy naming joined-channel reads,
  channel write destinations, DM peers and optional group DMs. Invalid or
  incomplete values stop startup instead of reverting to legacy behavior.
  In explicit mode the policy replaces `SLACK_DISABLE_DMS`, `SLACK_DM_USERS`
  and `SLACK_SEND_CHANNELS`; startup warns when these ignored settings remain.
  See the access-policy migration guide before enabling it. `find_user`
  remains workspace-wide with `users:read`, outside conversation confinement.
  With the new setting absent, existing behavior is unchanged.
```

If mode tightening or other A3 review fixes land separately, their fragments stay with those changes; do not duplicate release claims. No CHANGELOG.md rewrite or release/version change.

## 6. Size, files and verification plan

**Estimate:** medium, approximately 250–400 production lines plus 450–700 test lines and 150–250 documentation lines, across roughly 18–22 files. Most work is construction/replacement regressions and production-path startup tests, not the JSON parser. The members fallback and transient-listing distinction account for much of the non-plumbing work. No dependency/lockfile change or broad adapter rewrite. If these exceed a reviewable patch, separate admission fixes as a prerequisite to A4; do not activate an unreviewed partial chain.

Expected files:
- `src/config.ts`, `src/index.ts`: parsing, conditional wiring, warnings/summaries.
- `src/access-policy.ts`: cross-field validation and small group-membership query helper, updated activation comments.
- `src/slack-adapter.ts`: config/constructor, replacement branches, scope ordering, members fallback, listing error classification and bounded diagnostics.
- `src/file-access.ts`: exact known-mode gate; `src/server.ts` only if user-facing policy-specific directory/availability wording requires it (no parallel authorization implementation).
- `test/cli.test.ts`, new/reused `test/cliHarness.ts`, `test/config.test.ts`, `test/accessPolicy.test.ts`, `test/adapterAccessFixture.ts`, `test/adapterAccess.test.ts`, `test/adapterAccessServer.test.ts`, `test/groupDmAccess.test.ts`, `test/fileAccess.test.ts`; consolidate rather than duplicate matrices. Other tests using the mutation installer will move to constructor fixtures.
- `README.md`, `.env.example`, `docs/access-policy-migration.md`, fragment above.

### Red/green sequence (planned, not run)

1. Add startup activation tests against this base: valid policy is currently ignored, malformed JSON is currently ignored, legacy intersections remain, and policy isn't present during constructor diagnostics. Demonstrate each fails for its intended reason, not only a missing export/compile error. Keep pure tests for working A1–A3 invariants green.
2. Add negative parser cases: absent vs empty; missing required field; `null`/array/scalar; string booleans; wrong/lowercase/whitespace IDs; W peer success; unknown extension; explicit `groupDms:undefined` for embedded callers vs omitted/empty group list; contradictory pins with valid group-only exception; stable escaped one-line value errors. Mutation/snapshot tests cover caller-owned arrays.
3. Implement parser and constructor wiring; prove policy exists before diagnostics and event listener installation. Validate embedded configs before auth.test. Remove test mutation installers.
4. Prove replacement across **all effects** using restrictive legacy settings and a permitting policy, plus permitting legacy settings and a denying policy. Test invalid ignored legacy booleans/empty send list don't veto valid explicit policy. Keep legacy-only failures exact.
5. Add MPIM members fallback cases: positive on later page, exhausted without bot, false info membership, malformed/absent membership, invalid/cyclic cursor, missing scope/identity, wrong info ID/kind, 429/network timeout. No forbidden effect after any denial; no trust in event labels.
6. Add strict file modes and DM uploads/deletes without pins, wrong-peer denial, reauthorization after bytes, provenance failure, multi-share warning and restart/eviction residue. Run real server rollback, not only adapter unit calls.
7. Add listing request counts and transient errors versus stale candidate isolation; no successful complete listing after rate-limit/deadline failure. Verify members fallback shares the request budget. Incoming rate-limit failure is acked but not delivered; bounded diagnostic does not include message text/names.
8. Green: typecheck/build, targeted policy/config/CLI/server tests, and existing legacy suite; report numeric pass/fail counts and any pre-existing failures. Validate release fragment formatting. Gates always use `timeout 900 orgasmic dispatch gate <name> -- <command> ...`.

### Real-server startup matrix (planned)

“Real server” means child process runs the actual `src/index.ts` and built `dist/src/index.js`, actual config/connectSlack/adapter/server and MCP/MCPL handlers. Fake only Slack SDK/network boundaries, not the policy or server. #53's CLI harness provides a starting seam but must return real-shaped scope metadata and support TCP as well as stdio. Run against loopback HTTP/Socket fixtures or guarded SDK fakes, with synthetic credentials. No live Slack server is needed or authorized by this plan.

| Input / fixture | Expected process and production-path evidence |
| --- | --- |
| Policy absent, default legacy env | Normal startup/handshake/EOF shutdown; baseline stderr, tool list, outbound API payloads and framing identical. |
| Policy absent, each valid legacy control | Same legacy restrictions and exact logs/errors as baseline. |
| Policy absent, invalid legacy control | Exit 1; old exact one-line refusal; zero Slack calls, no listener. |
| Present empty/whitespace/malformed JSON or incomplete/unknown config | Exit 1; quoted bad value; empty stdout; zero auth/socket/transport calls. Never retry legacy. |
| Complete conversation-deny-all policy | Explicit startup; no conversation delivery/effects/registration, send_dm unavailable; directory caveat present and users:read behavior explicit. |
| Joined-read policy, one write pin, U/W peers, omitted groupDms | Policy active before first event; exact positive/negative tools and host publish; `groupDms` has no own property all the way to validation. |
| Same policy plus all three conflicting or invalid legacy vars | One deterministic ignored-names warning; behavior equals policy-only case, not intersection. |
| Explicit policy + unknown/empty auth scope metadata | Refuse after auth, before Socket Mode/host listen; no operational Slack calls. |
| Explicit policy + known limited scopes | Startup diagnoses actual unavailable kinds/effects; affected calls denied, available ones work. No legacy discovery fallback. |
| DM-only / group-only / read-only group | Ordinary channel access refused; peer/group semantics respected, file gates exercised; group writes require both lists. |
| MPIM info with true / false / absent membership | True uses info; false denies; absent uses fresh members proof. Missing proof never reaches effect. |
| Contradictory ordinary write pin with joined reads false | Exit 1 before auth; group-only exception still starts. |
| Membership revoked after listing or during upload; stale pin; 429 | Subsequent effect refused, upload not shared, stale single candidate isolated; transient listing failure not reported as complete. |

Execute matrix under both transports; exercise MCP tools and MCPL grants/publish/rollback. Include an event delivered as soon as Socket Mode starts to expose late-policy races. Confirm TCP binds only 127.0.0.1, stdout is protocol-only, and shutdown leaves no child process/listener.

**Safety prerequisite for every node/npm/test run:** turn notifier variables off and load the earlier-round loopback-only Node preload guard, inherited by children, before invoking the gate. Verify that it refuses non-loopback HTTP/HTTPS/net/TLS/fetch/WebSocket egress (including redirects) and still permits local fixtures. Strip inherited SLACK_* credentials. If the known guard or notifier controls cannot be located, stop and ask rather than invent a switch or run unguarded. Commands will be wrapped, e.g. `timeout 900 orgasmic dispatch gate a4-typecheck -- npm run typecheck`, `... a4-build -- npm run build`, `... a4-targeted -- node --import tsx --test --experimental-test-isolation=none <explicit test paths>`, `... a4-suite -- npm test`. Supply red and green receipts separately, with test counts.

### Legacy byte-identity, not merely successful tests

Capture deterministic baselines at `3b1a97ac` in a separate disposable checkout during the authorized implementation round, without modifying this plan's base. With policy absent, compare buffers/JSON wire strings for settings objects, startup stderr/stdout, refusal messages, tools/list, list_channels, MCP replies, MCPL descriptors/registration/publish, history/backscroll, direct/group events, attachment URL shape, upload and rollback payloads. Existing exact-string tests in adapter/group/file suites are useful but not sufficient for CLI wiring. Use fixed timestamps, IDs and fixture names; normalize only externally allocated ports and protocol request IDs where unavoidable, identically on both sides, and retain raw originals. No policy notices, extra info requests or changed legacy API request ordering allowed. If #53 lands first, compare A4 with that updated parent as well, separating #53's intentional tools-off log change from A4's identity promise.

## Verification Gates

No node, npm, test, build, server or notifier process was run. The manager confirmed that with no runtime there is nothing to guard; any later runtime needs notifiers off plus loopback preload first. Read-only source inspection and public documentation browsing were performed. Only explicitly requested Git metadata fetching used network commands; no Slack/API credentials were used.

Gate commands/outcomes (logs live beside this report):

1. `timeout 900 orgasmic dispatch gate plan-preflight -- bash -lc 'test "$(git rev-parse HEAD)" = 3b1a97ac8228a03383b6232ddd1fc3d4e94f1ecf && git status --short && git fetch --no-tags upstream main && git rev-parse FETCH_HEAD && git log -1 --format="%H %s" FETCH_HEAD'` — **PASS**. Log: `gate-plan-preflight-01M642WH638Z86BF5QFNT0D6Q5.log`.
2. `timeout 900 orgasmic dispatch gate plan-upstream53 -- git fetch --no-tags upstream refs/pull/53/head` — **PASS**. Log: `gate-plan-upstream53-01M642XKDWGFTPMS4CPPJDKWWR.log`.
3. `plan-fork-evidence` — **FAIL, investigation-command assumption**, not a code regression: the three required commits were all confirmed on fork main, then an extra ancestry assertion for historical fallback commit `ae6dc42` failed. That auxiliary commit is not an ancestor of the current fork snapshot; its feature exists in current fork source. Log: `gate-plan-fork-evidence-01M64324RG42SENBRP3Q3E6V5S.log`. No product test ran.
4. `timeout 900 orgasmic dispatch gate plan-fork-evidence-corrected -- bash -lc '<required-three ancestry checks; baseline USER_ID/listing grep; baseline fallback absence and fork source presence checks; HEAD/status>'` — **PASS**. The full exact argv is in the receipt/log: `gate-plan-fork-evidence-corrected-01M6432GZ0YKCWA6RFSGJ8HCJV.log`. It confirms already-present W IDs/listing optimization, no production fallback in baseline, and clean unchanged HEAD.

5. `timeout 900 orgasmic dispatch gate plan-final-readonly -- bash -lc '<assert exact HEAD, empty git status, nonempty report and required headings>'` — **PASS**. Log: `gate-plan-final-readonly-01M643K7QVXHS6CPW28RCVQ0RF.log`. HEAD remains pinned and the worktree is clean.

These are investigation receipts, **not implementation verification**. Test count this round: zero executed. No green runtime claim.

## Unmet Criteria

None for the plan-only deliverable: activation design, owner options/recommendations, fork applicability, documentation/changelog drafts, sizing and red/green/startup/legacy comparison plans are included. Implementation, committed docs/fragment, runtime matrix and live Slack validation are intentionally not performed this round. Owner approval of the recommended choices precedes code. No local commit is required for this round per manager clarification.

## Residual Risk

- A3 re-review may change the attachment/deletion prerequisites; A4 must not enable an unresolved security gate.
- Docs do not prove universal live MPIM info field availability. Members fallback addresses missing proof, but its token/workspace behavior still requires tests and eventual separately authorized live validation.
- Fresh admission increases Slack API demand. Existing limits do not guarantee event delivery during throttling; this plan explicitly declines a stale-positive cache and an unbounded retry queue.
- Directory exposure and global file-deletion effects are deliberate boundaries, not fully conversation-confined behavior; operators must see them before opting in.
- Fail-closed provenance can strand incomplete uploads. No weakening of deletion gates is proposed to conceal residue.
- No live Slack data was used, no private names are in this report, and fork-main currency beyond the inspected local snapshot is not asserted.
