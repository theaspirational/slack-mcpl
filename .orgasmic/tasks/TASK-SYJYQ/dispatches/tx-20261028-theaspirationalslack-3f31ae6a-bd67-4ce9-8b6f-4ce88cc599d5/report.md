# TASK-SYJYQ — Step 0 and options; implementation blocked

## Changed

**No production code, tests in the repository, documentation, or commits were
changed. No push, PR edit, GitHub comment, merge, or landing was performed.**
The assigned worktree remains clean at
`685b2debff12ed5cfdcae9070ddb131842c5a6d0`.

Read-only fetch confirmed current upstream main at
`ca8f6b1193154384e4626921255f86923fc5edf3`.
The proposed implementation base is that SHA, not the worktree's fork head.
No branch reset was needed because the explicit pre-coding stop condition fired.

The existing feature delta is **+446/-47 = +399 net production lines in seven
production files**, before adapting configuration to `startupSettings`.
Preserving that structure would additionally touch `src/config.ts`.
This exceeds the brief's approximately 300-line/five-production-file limit.
It is not proof that a smaller implementation is impossible; a smaller design
changes the platform or feature contract and needs an owner decision.

The manager answered the blocking scope question: stop with options, do not
write production code, and do not choose a platform contract while the owner
is unavailable. See `scope-question.log`. This report follows that direction.

## Step 0 — completed before production coding

### 1. PR #31: full reading and review inventory

Read the [PR description](https://github.com/anima-research/slack-mcpl/pull/31),
its complete 1,443-line diff, head metadata, and all three issue comments.
The public API reports zero formal reviews and zero inline review comments.
Each collection was requested with `per_page=100`; no collection has a next
page. **There is no maintainer review yet, and no automated review/comment
finding in these collections.** The three comments are all by
`theaspirational`, the PR author. Claims of independent review inside the PR
body are not an upstream maintainer review.

- PR head: `ddf92124e5f120b0576f66c9f989ca13ee9d74b4`.
- Merge base with current main: `bff8f10c1c3ce493abc10fb9946f0559e2f89e05`.
- GitHub reports `mergeable: false`, `mergeable_state: dirty`.
- The description is stale: it names `b2e8249...` as current head, says #26
  remains unmerged, and describes an earlier executable freeze. Later author
  comments record #26's merge, configurable limits, and head `ddf9212`.
- Earlier platform/test counts are author claims, not measurements by this run.

Evidence: `pulls-31.json`, `issues-31-comments.json`, `pulls-31-reviews.json`,
`pulls-31-comments.json`, their response-header files, and `pr31.diff`.
Initial unauthenticated `gh api` calls could not run; public HTTPS API reads
succeeded without obtaining or exposing credentials.

### 2. Conflicts with current upstream, file by file

`git merge-tree --write-tree upstream/main ddf92124...` returned status 1.
It writes Git objects, not a worktree merge. There is **one textual conflict**,
not conflicts in every changed file:

| PR file | Current-main merge result and required treatment |
|---|---|
| `README.md` | Clean. Existing inline instructions are already upstream; only approved path behavior should be added. |
| `changelog.d/feat-upload-file.added.md` | Clean. PR modifies the old inline fragment to mention the opt-in; a rebuild should prefer its own new fragment. |
| `changelog.d/operator-path-uploads.added.md` | New, clean. Its Python, unrestricted, platform, and adjustable-cap claims must match the selected design. |
| `src/content.ts` | Auto-merges. Adds a 1 GiB constant for the adjustable cap, not filesystem access itself. Unneeded for a fixed 5 MiB design. |
| `src/index.ts` | **Conflict.** Main now destructures values from `startupSettings`; PR inserts the former inline environment parsing beside it, including duplicate send-channel/boolean settings and removed `flag` calls. Move policy parsing/refusal into `src/config.ts`, then wire the approved option through startup. Keeping both blocks is wrong. |
| `src/server.ts` | Auto-merges. Adds reader lifecycle, schema selection, enabled classes, path/inline branching, and pre-read destination checks. Preserve newer upstream framing, timing, inline validation, and rollback behavior. |
| `src/slack-adapter.ts` | Auto-merges. Extracts upload destination checks and validates bounded Buffer input. Preserve current upstream upload/retry/error handling. |
| `src/tool-classes.ts` | Clean. Adds `files` beside `comms` only when paths are enabled. |
| `src/tools.ts` | Clean. Adds policy-dependent schema/description. The import conflict mentioned in the last author comment was against an earlier main and is already resolved in this PR head. |
| `src/upload-path.ts` | New, clean: 301 lines. Policy validation, pinned roots, isolated Python reader, unrestricted reader, caps, and cleanup. |
| `test/pathUploads.test.ts` | New, clean. Integration tests include real loopback uploads and CLI refusals; require adaptation to current startup and one-process execution. |
| `test/uploadPath.test.ts` | New, clean. Reader/race tests; existing tests include a `/dev/null` read attempt and broad temp-root probes, which must not be copied unchanged under this task's temp-only rule. |

Evidence: `merge-tree.txt`, `pr31-files.txt`, `pr31-stat.txt`, and
`pr31-production-numstat.txt`.

Current upstream already provides `upload_file` with UTF-8 `content` or canonical
`contentBase64`, a required filename, pre-allocation inline size validation,
5 MiB inline cap, Slack's three upload steps, destination checks, acknowledgement
cleanup, and rollback tracking. It does **not** implement local-path uploads,
`pathUploads`, `SLACK_PATH_UPLOADS`, or a `fileAccess`/`file-access` root reader.
Thus upstream solved the original inline dependency, not this feature.

Since the PR's latest main merge, upstream added sender framing and surrogate
handling, mcpl-core 0.4, centralized `startupSettings` (`9e6afe9`), and the
one-process suite (`2b887e8`); latest CI runs that suite once and builds/starts
on the other matrix entries. A clean textual merge alone proves none of these
behavioral integrations.

### 3. Fork comparison at 685b2deb

Inspected the fork's configuration, server/adapter integration, reader, and
`test/fileAccess.test.ts`, `test/pathAccessPolicy.test.ts`,
`test/pathUploads.test.ts`, and `test/uploadPath.test.ts`.

- Fork and #31 have identical `src/upload-path.ts`, `test/uploadPath.test.ts`,
  and `test/pathUploads.test.ts` (the three-file comparison is empty; see
  `fork-reader-delta.diff`). This is not a newly simplified reader.
- `SLACK_PATH_UPLOADS` selects restricted roots or unrestricted mode, with
  optional `maxBytes` from 1 to 1 GiB and default 5 MiB. The embedded option is
  `pathUploads`. Config objects/directories are copied and frozen.
- Restricted mode canonicalizes root aliases and pins descriptors. Below-root
  symlinks and `..` are refused. A Python 3.9+ worker traverses by directory
  descriptors with `O_NOFOLLOW`, verifies the opened leaf's descriptor path
  against the pinned root before and after reading, and bounds the read.
  Linux uses `/proc`; macOS uses `F_GETPATH`. Missing facilities fail closed.
- Unrestricted mode permits symlinks and ordinary account-wide file access.
  That is broader than this dispatch's root-confined acceptance criterion;
  carrying it forward is not automatically justified.
- Fork-only explicit access policy, membership/scope checks, recipient routing,
  and disabled-tool configuration are separate features, not appropriate to
  import with this rebuild. The fork's `optionalConfiguration` also refuses an
  obsolete boolean path setting. It is not upstream's `startupSettings`.
- `test/fileAccess.test.ts` is primarily Slack **download authorization**, not
  the local-path reader suite. Its fixture mocks `globalThis.fetch`; its
  redirect test mocks the same property again in the same TestContext. This
  is the known global-fetch leak pattern. Source inspection confirmed that
  nesting; this run did not rerun the fork suite or claim new reproduction of
  the leak. Keep that file out of the rebuild. New tests must use a single
  configurable mock per property/context or a loopback endpoint, and check
  restoration in the full one-process suite. Repeated isolated tests alone
  are insufficient to establish absence of cross-file pollution.

### 4. Threat model and plan, contingent on a scope decision

**Assets:** connector-readable files, Slack credentials, destination policy,
memory, and availability. **Untrusted inputs:** tool paths and metadata; file
names, links, growth, and concurrent changes in operator-authorized directories.
Enabling a root authorizes disclosure of its admissible files to otherwise
allowed Slack destinations; it must not authorize arbitrary account reads.

The implementation plan, whichever approved shape is selected:

1. Off by default, absent path schema when off, and explicit refusal of hidden
   path arguments. No unrestricted fallback. Keep the established inline API.
2. Parse opt-in/root values through `startupSettings`; malformed JSON, unknown
   keys, empty/relative/invalid roots, and unsupported capabilities return a
   clean refusal before Slack authentication. Do not echo raw values, outside
   paths, filesystem exceptions, credentials, or stack traces.
3. Canonicalize and establish the approved root. Reject `..`, prefix-collision
   siblings, absolute paths outside it, and disallowed symlinks. Do not equate
   string prefix tests or repeated pathname stats with race-safe containment.
4. Read from the same admitted descriptor, use no-follow opens where available,
   and verify descriptor location or descriptor-relative traversal as required
   by the selected platform. Refuse unverifiable roots/files; close every fd.
5. Verify regular-file type before reading. Nonblocking opens avoid waiting for
   FIFO writers; refuse directories, devices, sockets, and FIFOs. Preflight size
   and bound actual bytes to cap + 1 to detect growth; no partial upload on
   failure. A proposed smaller design uses a fixed 5 MiB cap.
6. Destination checks precede local reads and are repeated before Slack effects.
   Pass only validated bytes, never a pathname, through upstream's upload flow.
   Preserve rollback, existing scopes, and `comms`; add `files` when enabled.
7. Test all refusals, successful bytes, exact cap/growth, startup refusals, and
   deterministic leaf/ancestor swaps using only newly created temp fixtures.
   Capture red/green and two meaningful mutations (containment and byte cap).
   Run the specified same-SHA baselines, final-commit matrices, five repeats,
   changelog regex, and release fold only after implementation is authorized.

Hard links, mount changes by privileged actors, malicious filesystem servers,
process compromise, and equivalent account/sudo access are not solved by these
checks. Descriptor checks are observations, not immutable content snapshots or
perpetual containment. Do not claim a full OS sandbox.

## Options for the owner

**Counts below distinguish measured code from planning estimates.** No B/C
implementation has been written, so giving exact line counts for them would be
invented. Production means `src/`; tests and documentation are additional.

| Option | Net production lines / files | Platforms for enabled paths | Scope and boundary |
|---|---|---|---|
| **A — preserve #31, rebase and adapt startup** | **Measured +399 / 7** for existing feature; approximately **+410–440 / 8** with proper startup integration (estimate). | Linux and macOS with Python 3.9+ and required fd facilities; Windows refused. | Existing multi-root, aliases, unrestricted mode, configurable cap. Restricted mode retains descriptor-relative no-follow traversal and actual-fd checks. Requires an explicit size/file-limit exception and a decision on unrestricted mode. |
| **B — Node-only pathname/identity reader** | Estimate **+200–280 / 7**, keeping reader, config, entry point, server, adapter, tool schema, and class changes in their existing homes. | Linux/macOS can perform best-effort checks; Windows needs a different contract or refusal. **No platform gets the full adversarial swap guarantee from this recipe alone.** | Realpath boundary, leaf `O_NOFOLLOW`, `fstat` regular-file check, `dev`/`ino` match to `lstat`, and same-fd cap. Removes Python, but not a sufficient substitute for descriptor containment. Not acceptable under the current race requirement. |
| **⭐ C — narrow first PR: one root, direct regular-file children, fixed cap** | Estimate **+160–240 / 5**: `src/upload-path.ts`, `src/config.ts`, `src/index.ts`, `src/server.ts`, `src/slack-adapter.ts`. Conditional schema/class decoration stays local to server listing; no change to the shared default definitions. | **Linux with accessible `/proc/self/fd` only** for this proposed first version; explicit refusal on macOS/Windows. Inline uploads unchanged everywhere. | Pin one canonical root; accept only direct children, no recursive paths, no unrestricted mode, no aliases exposed as alternate input roots, fixed 5 MiB. Open the basename relative to the pinned fd through procfs with `O_NOFOLLOW`, check root/leaf descriptor locations before reads and before returning bytes. Needs owner approval of the narrowed platform/API contract and implementation probes. |
| **D — defer path uploads, retain upstream inline upload** | **0 / 0** | Existing upstream platforms. | No connector filesystem access is added; symlink/traversal/swap exposure from this feature is absent. Does not deliver the requested path convenience or avoid the model-context round trip. |

**Recommendation: C, only after owner approval.** It most closely fits the
small-review budget without replacing an actual-fd boundary with a misleading
pathname check. The Linux restriction is a real reduction from #31's advertised
macOS support, not something the implementer may choose silently. If macOS is
required now, prefer A with an explicit scope exception and a restricted-only
policy decision, rather than B with overstated safety. These are alternatives,
not a claim that C has already met its estimated budget or race contract.

### What B does and does not guarantee

- **`..` / static escapes:** strict lexical and canonical checks reject these
  on POSIX when the tree is stable. Windows additionally needs drive, UNC,
  separator, case/reparse-point and stream-name policy; POSIX tests do not prove
  those semantics.
- **Linux:** `O_NOFOLLOW` protects the final component, not ancestors. A
  `dev`/`ino` match identifies the opened object, not its containment: `lstat`
  also traverses ancestor links. The scratch probe below demonstrates outside
  bytes passing the proposed identity check. Linux descriptor paths can supply
  additional location evidence, but that is a stronger design, not an inherent
  property of inode comparison. See [Linux open](https://man7.org/linux/man-pages/man2/open.2.html)
  and the [kernel pathname lookup documentation](https://cdn.kernel.org/doc/html/latest/filesystems/path-lookup.html).
- **macOS:** the analogous leaf/no-follow and pathname identity checks do not
  establish an atomic ancestor boundary. macOS provides `F_GETPATH`, used by
  the existing helper; Node's documented `fs` API does not expose `fcntl`.
  A pure pathname fallback must not be described as equivalent.
  [Apple descriptor-path API](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html).
- **Windows:** Node documents that the necessary POSIX no-follow/nonblocking
  constants are not among those available on Windows. Do not silently OR an
  undefined flag into zero and claim protection. Windows has a native
  handle-path API, but using it needs an additional binding/helper and its own
  reparse-point design. Safest behavior for this small Node-only proposal is
  to refuse path enablement on Windows.
  [Node 22.23.3 filesystem constants](https://nodejs.org/download/release/v22.23.3/docs/api/fs.html#file-open-constants),
  [Microsoft handle-path API](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew).
- **All platforms:** checking `fstat` type and reading a bounded amount from that
  fd does enforce type/byte properties once admitted. It does not make a series
  of pathname checks atomic. Even pre/post location checks cannot promise that
  a file was never moved between observations or that contents were unchanged.

These platform conclusions are design analysis from the code, probe, and linked
primary references, not a macOS/Windows execution claim.

## Each #31 point → disposition

No finding is marked fixed: there is no rebuilt commit. This table covers the
PR author's stated design and follow-up points; there are no reviewer requests
to invent answers for.

| Point / who raised it | Treatment in the proposed rebuild or decision needed |
|---|---|
| Avoid inline model-context round trip — `theaspirational`, description | A/C deliver it; D defers it. |
| Off by default; explicit JSON policy; no boolean broad opt-in — author, description | Preserve off/default and strict startup refusals. C narrows to one restricted root. |
| Restricted and unrestricted choices — author, description | Unrestricted conflicts with root-confined acceptance; do not silently retain it. Decision required for A. |
| Exactly one input; connector-local absolute path; optional basename filename — author, description | Preserve source cardinality and connector-local explanation; C proposes only direct children and can retain explicit filename to minimize schema changes. |
| `comms` plus `files` when enabled — author, description | Preserve; default inline remains `comms`. |
| Canonical pinned roots, aliases, no inner symlinks, isolated Python, Linux/macOS actual-fd checks — author, description | A preserves; B is not security-equivalent; C deliberately narrows platforms and root/path shape. |
| Regular files, nonblocking FIFO handling, bounded growth, SDK receives bytes — author, description | Required for every implementable option. No live device reads in new tests. |
| Destination checks before read and again before upload; rollback intact — author, description | Required; reuse current upstream guards/upload steps. |
| No sandbox/snapshot promise; hardlinks, mounts and equivalent privileges excluded — author, description | Preserve and explain residual risk; never promote point-in-time checks to an atomic perpetual guarantee. |
| Exclude access policy, routing, bridge, deployment and new scopes — author, description | Preserve exclusion; do not import fork-only integration tests wholesale. |
| Old freeze/head/platform counts and claimed independent review — author, description | Replace with new same-SHA evidence if implemented; historical claims do not count as this run's gates. No maintainer review yet. |
| #26 dependency and #15/#29 history — author, description | #26's inline implementation is now upstream; remove stale stacked/unmerged language. Keep current upstream code rather than old dependency patches. |
| Three upload steps replace `filesUploadV2` — author, [comment 6253203856](https://github.com/anima-research/slack-mcpl/pull/31#issuecomment-6253203856) | Already upstream; reuse it. |
| Optional `maxBytes` up to 1 GiB, bounded allocation, unchanged inline cap, timeout/memory notes — author, same comment | A retains; C deliberately fixes cap at 5 MiB and defers adjustable limits. Report the operator-visible difference. |
| Node 24 macOS cleanup EISDIR and historical counts — author, same comment | Historical reported failure, not validated here; avoid claiming it resolved. New tests need reliable owned-temp cleanup. |
| Main merge c977d7d, all upload refusals begin “Nothing was uploaded”, pre-allocation inline checks (R1-1), README context explanation — author, [comment 6267422163](https://github.com/anima-research/slack-mcpl/pull/31#issuecomment-6267422163) | Preserve current upstream refusals/inline checks and README explanation. R1-1 is a referenced earlier inline finding, not a new review on #31. |
| Main merge bff8f10, tools import conflict, 621/621 vs 545/545, typecheck — author, [comment 6320921944](https://github.com/anima-research/slack-mcpl/pull/31#issuecomment-6320921944) | That import conflict is already resolved; present conflict is startup parsing. Replace old counts with current baseline if authorized. |
| Automated comments/reviews | None returned; no unaddressed automated finding identified. |

## Verification Gates

### Completed

1. Read-only upstream fetch and local merge/conflict inspection. These are
   inspection commands, not suite receipts.
2. Node on PATH: `/opt/node/bin/node`, **v22.23.3**.
3. `orgasmic dispatch gate node-only-race-preprobe -- timeout 900 node --test
   "$ORGASMIC_EVIDENCE_DIR/node-only-race-preprobe.cjs"`
   — **2 pass / 0 fail / 0 skip**. The gate ran with
   `NODE_OPTIONS=--require=<evidence>/loopback-only.cjs`; no listeners were
   created. All fixture operations were inside newly created temp directories,
   removed by the probe. No mocks were used.

The preprobe deliberately demonstrates the **unsafe alternative**, not a
production fix: canonicalize an inside path, optionally repeat that check,
swap its ancestor to an outside symlink, then open with `O_NOFOLLOW`, `fstat`,
and compare `dev`/`ino` against `lstat(canonical)`. Both identity checks pass
and outside bytes are read; Linux's actual-fd path detects the escape. It is
not a universal attack against every possible augmented Node-only reader.

Raw output: `node-only-race-preprobe.log`.
Gate receipt/log:
`gate-node-only-race-preprobe-01M62B9CG4ZMST2KRA4WG1KRA1.log`.
The receipt is attached to the untouched fork HEAD, because this standalone
scratch probe imports no repository implementation. It is not a final-commit
gate and cannot substitute for any requested suite.

`NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` were set from the
first command and on every shell invocation. No npm install was attempted.

### Not run because the pre-coding stop was confirmed

- Node 24.22.1 / 22.12.0 downloads and official SHASUMS verification.
- npm ci with empty external user/global configs, ignored scripts, npmjs
  registry, audit/fund off; typecheck/build matrices.
- Upstream baseline/full final-commit suite on all three runtimes, new-file
  five-repeat gate, implementation red/green, and two production mutations.
- Release dry fold and changelog CI regex for a new fragment.

No baseline counts, implementation pass claims, or final-commit receipts are
invented. No production-path/live Slack test was performed.

## SHA, diff stat, and fragment

- **New implementation commit:** none (stopped before coding).
- **Worktree diff:** empty.
- **Fetched upstream base:** `ca8f6b1193154384e4626921255f86923fc5edf3`.
- **Existing #31 delta:** 12 files, 1,131 insertions, 53 deletions;
  production subset 7 files, 446 insertions, 47 deletions, net +399.
- **New changelog fragment verbatim:** none. Creating a fragment claiming an
  unimplemented feature would be misleading. The existing PR fragment is
  preserved verbatim inside `pr31.diff`, not represented as a new deliverable.

Read `CONTRIBUTING.md`, `changelog.d/README.md`, the current changelog CI regex,
and the supplied project baseline. No additional repository AGENTS.md was
found in the applicable ancestor paths or worktree tree. Conventions/gotchas
were supplied as absent. No lockfile/generated-file side effects occurred.

## Draft replacement PR body — planning text only, not ready to publish

### Problem

`upload_file` already accepts inline text/base64. Uploading an existing local
file still requires reproducing its bytes in the tool call. The current path
upload branch conflicts with the latest startup-settings refactor.

### Changes

A rebuild is proposed on `ca8f6b1193154384e4626921255f86923fc5edf3`, but has not
been implemented. The existing feature adds 399 net production lines across
seven files before startup integration, beyond the agreed small-rebuild limit.
The open decision is whether to retain the Linux/macOS Python-backed reader
with a scope exception, or approve a smaller restricted-only platform contract.
Inline-only remains the default. A pathname realpath/inode comparison alone
will not be presented as protection against ancestor-swap races.

### Tests

Planning probe on Linux, Node 22.23.3: 2 pass / 0 fail, demonstrating that the
simpler pathname/identity recipe can admit outside bytes after an ancestor
swap. No rebuilt branch, current-main baseline, or final-commit test matrix
exists yet. Previous PR test counts are historical, not current verification.

### Not verified

No rebuilt production implementation, macOS/Windows runtime validation, or
live Slack upload. Platform and scope decisions remain open.

### Out of scope

Fork-only access policy, recipient routing, deployment, and additional scopes.

### Companion PRs

The old inline-upload dependency is now in upstream main; no longer stacked
on an unmerged #26. A final replacement body must be written after the owner
chooses the design and implementation gates finish.

AI-assisted investigation with OpenAI Codex. No new commit was authored.

## Short draft comment for #31 — not posted

I checked the branch against current main (`ca8f6b1`). The remaining textual
conflict is in `src/index.ts`, where main now uses `startupSettings`. Main has
inline uploads but not local-path access. The existing path feature is +399 net
production lines in seven files, so I stopped before rebuilding under the
agreed small-change limit. The next decision is whether to retain its
Linux/macOS helper with a scope exception or approve a smaller restricted-only
contract. No branch update or new test-matrix claim is being made yet.

## Unmet Criteria

The requested implementation, one local commit on upstream, review-ready final
PR text, README rows/new fragment, production refusal/happy-path tests,
red/green/mutations, and complete final-commit gates remain **unmet**. The explicit
scope/platform stop condition and manager's answer prohibit proceeding now.
Step 0 and the requested options analysis are complete; status is **blocked**,
not done. The owner needs to choose/authorize a design and any scope exception.

## Residual Risk

No new code was introduced, so this run adds no product behavior. PR #31 remains
conflicted and unverified against current upstream. Option estimates require
implementation review; none is a guarantee of final size. B's inode comparison
is not an adversarial race boundary. C would intentionally not support enabled
path uploads on macOS/Windows and must not be chosen without approval. A's
existing tests and public claims were inspected, not revalidated; its helper
and lifecycle complexity exceed this task's review budget. Every enabled path
option remains subject to the explicitly stated non-sandbox/content-mutation
limits.
