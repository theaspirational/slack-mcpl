# Documentation comparison report

## Changed

- Added only `docs/FORK-VS-UPSTREAM.md` in local commit `b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8`; no push.
- Parent/base: `b956350d4e77f09df76240439b3d35d512061899`.
- Document: **20100 bytes**, **130 lines**.
- SHA-256: `7d7a6c69ca95d0de279fba845c348ffa3881c5ce8595ccf49e4dd37b4dbf8ead`.
- Includes 23 remaining fork-only behaviour rows, five already-upstream rows,
  “Which should I use”, merge provenance, and the explicit DM scope correction.
  Sources: document tables below and `b956350d`.
- Compared the two requested history ranges, verified merge base `bff8f10`,
  reviewed source/documentation/test diffs, and checked public PR state.
  PR evidence: `public-pr-snapshot.json`; current open PR source inspected at
  `21a7ebcb` (#12), `7afe8df19` (#20), and `ddf92124` (#31).
- Read `CONTRIBUTING.md`; no additional supplied conventions or gotchas.
  Documentation-only changes need no changelog fragment (`CONTRIBUTING.md`).

## Verification Gates

Both gates ran at `b77a1b021a22a4a94a6bb02610cd2ff389a8c4b8` with a clean tracked tree and recorded exit 0:

1. `orgasmic dispatch gate markdown-only -- sh -c 'test "$(git diff --name-only b956350d HEAD)" = docs/FORK-VS-UPSTREAM.md && git diff --check b956350d HEAD && test "$(wc -l < docs/FORK-VS-UPSTREAM.md)" -lt 250'`
   - Log: `gate-markdown-only-01M61A5VCC1YTCF541DENSETMJ.log`.
   - Exactly the requested Markdown file changed; whitespace check passed;
     document remains below 250 lines.
2. `orgasmic dispatch gate build -- npm run build`
   - Log: `gate-build-01M61A5VH55QK57GSTNEREWH1Q.log`.
   - Passed; **one** build invocation.

Additional checks: all six-column table rows parsed consistently; 70 unique
commit citations checked, with local objects resolving and three PR heads
inspected through public source URLs. `npm ci` installed the locked dependencies
before the commit; log: `dependency-install.log`. No tracked lockfile or source
changes resulted. Only ignored dependency/build artifacts were generated.

## Unmet Criteria

None in the document, commit, or build scope. The requested read-only
`gh pr list -R anima-research/slack-mcpl --state all --limit 100` was attempted
but could not authenticate. Public GitHub REST results supplied the all-state
PR check instead; the document explicitly records this limitation and fallback.

## Residual Risk

- PR states are a 2026-10-28 snapshot, not a prediction of future merges;
  no matching proposal found is not proof of permanent absence.
- Behaviour comparisons are source/history analysis, not new runtime claims.
  No live Slack calls, full test suite, routing deployment, or filesystem
  isolation validation was performed for this documentation-only change.
- `npm ci` reported two high-severity dependency vulnerabilities in the existing
  locked tree (`dependency-install.log`); investigation/remediation was outside
  this Markdown-only scope. The build still passed.
- Recommendations are proposed dispositions, not upstream acceptance decisions.

## Comparison tables

File:line citations in the copied tables refer to `b956350d` unless another
SHA is specified. PR absence/state claims use `public-pr-snapshot.json`.

## Remaining fork-only changes

| Feature | What it does (user-visible behaviour) | Key commits | Already upstream in another form? | Open upstream PR | Recommendation and reason |
|---|---|---|---|---|---|
| **Access — explicit policy** | `SLACK_ACCESS_POLICY` separates joined-channel reads, writable channels and allowed DM peers; fresh membership/scopes guard events and operations, and group DMs are denied. Unset retains legacy controls. | `f565376`; `src/access-policy.ts:31-96` | Partial: operator write/DM controls exist via #3 (`8ebb43a`), but not this fresh, consolidated read/write admission policy (`439a81b5`). | None found. | **Keep fork-only** for now: this is a separate opt-in access contract, not a replacement for upstream defaults (`f565376`). |
| Access — pinned public membership | Explicitly named public write channels can use a fresh one-message history proof when `channels:read` is absent; pins remain listable without wider discovery scopes. | `f565376`; `src/slack-adapter.ts:1017-1036,1127-1153` | No: #25 (`ed3f504`) limits discovery by granted scopes, but does not provide pinned history proofs. | None found. | **Keep fork-only**: depends on operator-attested public pins and the explicit policy (`src/access-policy.ts:39-51`). |
| Access — stale pinned channel | A pin whose fresh proof fails is omitted instead of aborting the entire conversation listing. | `2425f3e`; `src/slack-adapter.ts:1021-1030` | No pinned-channel mechanism in `439a81b5`; upstream scope fallback (#25, `ed3f504`) solves a different listing failure. | None found. | **Keep fork-only** with pinned membership: preserves fail-closed access without hiding other channels (`2425f3e`). |
| Access — listing cost | Skip channels explicitly listed as non-members before fresh metadata checks, avoiding an extra lookup for every public workspace channel. | `eb673bb`; `src/slack-adapter.ts:1095-1105` | Partial: upstream already filters non-member results (#25, `ed3f504`); only the fork adds fresh policy lookups whose cost needs this prefilter. | None found. | **Keep fork-only** with the policy: removes unnecessary calls without trusting listed membership as authorization (`eb673bb`). |
| Access — bounded-history integration | Every history/thread call, including cursor continuation, rechecks admission; a pinned proof is outside the read's page budget, and protected attachment hints count toward output size. | `f565376`; `src/slack-adapter.ts:1698-1773` | Partial: bounded reads are upstream #32 (`bff8f10`), but explicit-policy admission and file-reference shaping are not. | None found. | **Keep fork-only** with the policy: removing the wrapper would bypass its read contract (`f565376`). |
| Access — attachment authorization | Under the policy, downloads require readable `channelId` plus exact `fileId` association from `files.info`; use its private URL and refuse redirects. | `f565376`; `src/file-access.ts:5-21`; `src/server.ts:986-1023` | Partial: upstream restricts URL-based downloads to Slack file URLs, but does not prove conversation association (`439a81b5:src/server.ts:877-906`). | None found. | **Send upstream** as an opt-in proposal: conversation-bound authorization is distinct from URL-host validation (`f565376`). |
| Access — usable attachment references/schema | Live messages, history and backscroll show file-fetch arguments, mark missing IDs unavailable, and advertise required `channelId`/`fileId` in the tool schema. | `f565376`, `bb85ee1`; `src/server.ts:431-445`; `src/file-access.ts:24-30` | Partial: upstream exposes URL references, not this policy-specific calling convention (`439a81b5`); sender framing is shared via #47 (`c1db65b`). | None found. | **Send upstream** with attachment authorization: callers need a schema and references matching the enabled policy (`bb85ee1`). |
| Access — explicit DM scope preflight | Before text validation or `conversations.open`, explicit-policy DM sends check the peer plus `im:write`, `im:read` and `chat:write`; fresh exact-peer checks still precede posting. | `b956350d`; `src/slack-adapter.ts:1613-1630` | Partial: #45 (`870027c`, `3a0e992`) rejects malformed text before opening and prioritizes legacy authorization; no explicit-policy branch exists upstream. | None found. | **Keep fork-only** with explicit DMs: preserves authorization-error precedence in that branch (`b956350d`). |
| **Routing — durable admission** | Opt-in identity-bound receipts deduplicate delivery across restarts; own mentions can wake, unaddressed arrivals are context-only, and DM wakes require an authorized human peer. Requires Node 24+ on POSIX; commit-before-delivery can lose an arrival after transport failure. | `f565376`; `src/recipient-routing.ts:1-7,92-103,152-199` | No: upstream's ordinary mention/DM forwarding is not a durable recipient ledger (`439a81b5:src/slack-adapter.ts`). | None found. | **Keep fork-only**: persistent at-most-once admission and context-only handling require coordinated consumer support (`f565376`). |
| Routing — compatibility handshake/bridge | Recipient mode requires MCPL 0.5 plus `slackRecipientRouting` v1 attestation; unsupported clients are refused. A bridge and compatibility guide specify provenance/context-only handling, but cannot prove a client's implementation. | `f565376`; `src/server.ts:367-382`; `src/host-compatibility.ts:1-3,37-45,74-131`; `docs/HOST-COMPATIBILITY.md:1-20` | No: upstream MCPL negotiation is not this experimental recipient contract (`439a81b5:src/server.ts`). | None found. | **Keep fork-only**: do not silently impose this nonstandard handshake on ordinary clients (`f565376`). |
| Routing — frozen reply/status targets | Recipient publish requires an explicit verified thread root; typing uses a verified frozen root, and a delayed stop cannot clear another turn's status. Pending status work is guarded across connection/policy changes. | `f565376`; `src/server.ts:640-658,1494-1523`; `src/slack-adapter.ts:1304-1316` | Not on main: it follows the latest incoming thread (`439a81b5:src/server.ts:1374-1381`). Open #20 addresses explicit publish targets differently; it is not the full recipient/status contract. | [#20][pr20], related (`7afe8df19`), not equivalent. | **Keep fork-only** pending protocol alignment: avoid treating #20's publish-only overlap as a replacement for frozen status/admission (`f565376`, `7afe8df19`). |
| Routing/access — Enterprise Grid IDs | Accept `W…` as well as `U…` in policy peers, routing identities/mentions and compatibility validation, avoiding rejection of those optional-mode users. | `fe9297a`; `src/access-policy.ts:34`; `src/recipient-routing.ts:63-64` | Partial: upstream history author filtering already accepts `W…` (#32, `bff8f10`; `439a81b5:src/history-read.ts:91`); these fork-only validators also needed it. | None found. | **Keep fork-only** with those validators: retain the fix, but do not propose a duplicate upstream history-ID change (`fe9297a`). |
| **Controls — disabled tools** | `SLACK_DISABLED_TOOLS` hides named tools and refuses direct calls; unknown names reject configuration. | `f565376`; `src/configuration.ts:47-49`; `src/server.ts:430,681-683` | Partial: upstream feature-set grants and DM-specific hiding exist, but not arbitrary operator-selected per-tool suppression (`439a81b5:src/server.ts`). | None found. | **Send upstream** separately: a small opt-in control independent of recipient routing (`f565376`). |
| Controls — zero automatic backscroll | `SLACK_BACKSCROLL_LIMIT=0` skips first-interaction history fetching, without disabling explicit read tools. | `f565376`; `src/server.ts:246-250,1801` | No: upstream treats zero as invalid and falls back to 50 (`439a81b5:src/server.ts:234-238`). | None found. | **Send upstream** separately: useful explicit opt-out with the default unchanged (`f565376`). |
| **Typing — thread status** | Advertise `channels.typing`; show best-effort “is thinking…” on the latest incoming root, clear on stop/move, refresh at most once per minute, and respect write permission. | `bdfaab7`, `9f2831e`; `src/slack-adapter.ts:1323-1350`; `src/feature-sets.ts:62,97` | No: main accepts typing as a no-op (`439a81b5:src/server.ts:579-583`). | [#12][pr12], head `21a7ebcb`. | **Send upstream** through #12: visible progress feedback without requiring recipient mode (`bdfaab7`). |
| Typing — reconnect isolation | Clear the remembered typing root when a new connection begins, preventing status on the previous connection's thread. | `2737559`, equivalent `f91d73f`; `src/server.ts:308` | No typing on main (`439a81b5`); already present in open #12 (`21a7ebcb:src/server.ts:290`). | [#12][pr12]. | **Send upstream** with #12, not another PR: the current proposal already carries the fix (`f91d73f`, `21a7ebcb`). |
| Typing — stop after posting | Retain ownership after a post while allowing immediate refresh, so stop still explicitly clears the same thread even without a refresh. | `9396854`, equivalent `2d9ac2a`; `src/slack-adapter.ts:1464-1467` | No typing on main (`439a81b5`); already present in open #12 (`21a7ebcb:src/slack-adapter.ts:1223-1224`). | [#12][pr12]. | **Send upstream** with #12: closes the post/stop cleanup gap without a duplicate proposal (`2d9ac2a`). |
| **Uploads — optional path interface** | `SLACK_PATH_UPLOADS`/`pathUploads` enables exactly one of path/text/base64; paths default the filename to basename and add the `files` tool class. Unset stays inline-only; obsolete boolean switches reject startup, and destination guards run before reading and uploading. | `23eb4a3`, `3f56b82`; `src/server.ts:800-819`; `src/tools.ts:268-291`; `src/tool-classes.ts:69` | Partial: inline uploads/rollback are upstream #26 (`c977d7d`); local path access is not. | [#31][pr31], head `ddf92124`. | **Send upstream** through #31: adds opt-in local files without changing inline defaults (`23eb4a3`). |
| Uploads — restricted/unrestricted readers | Restricted mode pins roots, refuses below-root symlinks and checks actual descriptor containment with Python 3.9+ on Linux/macOS; unrestricted mode reads regular files using account permissions. These checks are not a sandbox or immutable snapshot. | `3b372ab`, `161c86a`, `61e322d`; `src/upload-path.ts:73-202,276-300`; `changelog.d/operator-path-uploads.added.md:4-19` | No filesystem reader in upstream #26 (`c977d7d`); its inline bytes avoid this filesystem boundary entirely. | [#31][pr31] (`ddf92124`). | **Send upstream** with #31: the path feature needs its explicit filesystem boundary and documented limitations (`3b372ab`). |
| Uploads — unrestricted path spelling | Preserve unrestricted absolute paths, including parent traversal semantics; only restricted mode rejects `..` before normalization. | `2726c7a`; `src/upload-path.ts:206-213` | No path mode on main (`439a81b5`); present in open #31 (`ddf92124:src/upload-path.ts:206-213`). | [#31][pr31]. | **Send upstream** with #31: unrestricted mode should not silently reinterpret filesystem paths (`2726c7a`). |
| Uploads — operator byte cap | Path-only `maxBytes` defaults to 5 MiB and accepts integers up to 1 GiB; inline stays 5 MiB, and tool descriptions/errors state the path cap. | `40c2fdf`; `src/upload-path.ts:24-55`; `src/tools.ts:277-280` | No path cap on main; upstream #26 has the unchanged inline cap (`c977d7d`). Present in open #31 (`ddf92124:src/upload-path.ts:24-55`). | [#31][pr31]. | **Send upstream** with #31: large local files need not pass their bytes through message context (`40c2fdf`). |
| Uploads — policy diagnostics | Unknown policy keys report the selected mode and its allowed keys rather than an ambiguous refusal. | `999d8a0`; `src/upload-path.ts:35-36` | No path policy on main (`439a81b5`); present in open #31 (`ddf92124:src/upload-path.ts:35-36`). | [#31][pr31]. | **Send upstream** with #31: retain an actionable startup diagnostic (`999d8a0`). |
| **Sync — security integration in fork extensions** | Apply sender framing to recipient deliveries and protected file references, keeping generated fetch hints usable; carry authorization-before-text checks into policy writes. | `e616fe8`; `changelog.d/merge-fork-security.fixed.md:1-5`; `src/slack-adapter.ts:1432-1436` | Yes for the underlying safeguards: #45 (`3a0e992`) and #47 (`c1db65b`); their application to fork-only paths remains a fork delta. | None found for the integration; #45/#47 are merged. | **Keep fork-only** as integration glue: retain upstream security properties wherever fork extensions add paths (`e616fe8`). |

## Historical fork work already upstream

These changes appear in the requested fork history, but are **not remaining
behavioural reasons to choose the fork**. The upstream merges below are
ancestors of `439a81b5`; policy/path/status adaptations are listed separately
above rather than counted as missing upstream features.

| Feature | What it does (user-visible behaviour) | Key commits | Already upstream in another form? | Open upstream PR | Recommendation and reason |
|---|---|---|---|---|---|
| Uploads — inline file tool | Upload text/base64 through Slack's three steps, with rollback tracking. | Fork merges `2ced5f4`, `08966e4` | **Yes**, #26 (`c977d7d`, head `417d2c6`); upstream also supplies later rollback corrections #37 (`ede2bfc`). | None: #26 merged. | **Drop** the fork-only designation: upstream implements the base upload need; only paths/policy remain different. |
| Discovery — scope-aware listing | List only supported conversation types and adapt to missing scopes. | Fork merges `756021b`, `030a1b0` | **Yes**, reworked #25 (`ed3f504`, head `485a655`), rather than the fork's earlier listing implementation (`f565376`). | None: #25 merged. | **Drop** the older standalone implementation: retain the upstream rework plus the explicit-policy overlays above. |
| History — bounded reads/oldest-only semantics | Bound/filter reads with continuation and thread metadata; oldest-only ranges and cursor positions use the reviewed upstream algorithm. | Fork merges `9691a92`, `b6ac1e6`, `bf7621c`, `46f5a6f`; `b060b2f` | **Yes**, #32 (`bff8f10`): equivalent oldest explanation `479e809`, then reviewed range/cursor corrections `1a37db3` and tests `15df104`. | None: #32 merged. | **Drop** the separate older reader patch: upstream meets the need, and the fork already carries its corrections. |
| Delivery — inbound order | Deliver messages in arrival order within each conversation, while starting name lookups concurrently. | `a15f316`; fork merges `23f25e8`, `db4743e` | **Yes**, #38 (`8a6d101`): `e4e3581`, refined by `6dd83aa` and tested in `e22af48`; not a promise to serialize all lookups. | None: #38 merged. | **Drop** the original serial-preparation patch: upstream preserves order without accumulating lookup latency. |
| Presentation — conversation IDs/write recipients | Incoming headers identify conversations; write results name `to` only when a registered label exists. | `1f8c2c1`; fork merge `2012bda` | **Yes**, #39 (`2fc0f83`): `f566e04`, refined by `5276d9a`, `5338519`, `96b6331`; same need, reviewed output semantics. | None: #39 merged. | **Drop** the duplicate patch: upstream supplies the identifiers and registry-aware recipient labels. |


[pr-list]: https://api.github.com/repos/anima-research/slack-mcpl/pulls?state=all&per_page=100
[pr12]: https://github.com/anima-research/slack-mcpl/pull/12
[pr20]: https://github.com/anima-research/slack-mcpl/pull/20
[pr31]: https://github.com/anima-research/slack-mcpl/pull/31
