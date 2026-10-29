# Review — TASK-SYJYQ: repair #31 path uploads on current upstream main

Reviewed commit: `f1f9eee9e60ef8c80b9bfcf7385cae896c1701da`
Sole parent: `7274283fa719a17328ef8e085336ce25f6f22b08`, confirmed to still be
upstream main head (`git ls-remote upstream refs/heads/main`, read-only).
`git rev-list --count 7274283..f1f9eee` = **1**. The worktree was left clean at
`685b2de` (the chain's shared tree); all building, running and mutating was
done in a throwaway `git archive` export at `/tmp/rev-syjyq/src`, so the gate
receipts below are stamped with the worktree HEAD `685b2de`, not the reviewed
SHA. Each gate log's first line prints the Node version and the scratch cwd it
actually ran in.

## Verdict

**Approve — no blocking findings.** The design the owner chose is implemented
correctly and holds up under adversarial probing. I found **no containment
escape**, no fd or child-process leak, no refusal that echoes an outside path
in restricted mode, and no way to reach path access or unrestricted mode
without an explicit operator opt-in. All named gates pass on all three
runtimes (683 against a 583 same-SHA baseline I reproduced myself).

Two MEDIUM findings are worth fixing before the branch is offered to a
maintainer: one mutation-silent guard (test), and one unnamed consequence of
unrestricted mode in the docs (the connector can be made to upload its own
Slack tokens). Neither changes shipped behaviour.

## Findings

### MEDIUM

**MEDIUM `src/server.ts:716` (test) — the "host doesn't take file paths"
refusal is mutation-silent; deleting it leaves the suite 100/100 green.**
`test/pathUploads.test.ts:61` only asserts `isError === true` and
`started.length === 0`. I deleted the whole guard (`p5.py`,
`mut-M5-drop-hidden-path-refusal.log`) and the focused suite still reported
**100 pass / 0 fail**. The call does still fail closed, but by falling through
to `this.pathReader!.read(path)` on an `undefined` reader, so the agent gets an
internal diagnostic instead of the written refusal — verified through the real
server path:

```
unmutated : Nothing was uploaded: this host doesn't take file paths, so upload_file
            can't read path. Pass the file's bytes as content or contentBase64 instead.
M5 mutant : Nothing was uploaded: Cannot read properties of undefined (reading 'read')
```

Given CONTRIBUTING's "a test that can't fail on the unfixed code will be called
out", this is exactly what a maintainer will flag.
*Fix direction:* at `test/pathUploads.test.ts:61`, assert the refusal text
(e.g. `/doesn't take file paths/`), as the restricted-refusal test at line 177
already does for its prefix. One line.

**MEDIUM `README.md:206` (docs/security) — unrestricted mode lets the agent
read the connector's own credentials, and no document says so.**
`/proc/self/environ` is a regular file whose `st_size` is 0, so it passes the
pre-read size check and is then read by the growth loop. Proven through the
production reader (`probes/unrestricted.ts`, `security-probes.log`):

```
ALLOW  /proc/self/environ (own credentials): len=4113 "SHELL=/bin/bash npm_command=exec ..."
ALLOW  /proc/self/cmdline:                   len=56
ALLOW  /etc/passwd:                          len=2345
```

So with `{"mode":"unrestricted"}` an agent can have `SLACK_BOT_TOKEN` and
`SLACK_APP_TOKEN` uploaded into a Slack channel. README:208, the changelog
fragment and the draft PR body all say only "can expose sensitive files
readable by the connector account" / "any regular file readable by the
connector account". That is literally true but understates the case, and
self-credential exfiltration is precisely the fact a maintainer deciding
whether to keep this mode needs in front of them. Restricted mode is not
affected (`/proc` is not under a configured root).
*Fix direction:* add one sentence at README:208 and to the unrestricted bullet
of `changelog.d/31-path-uploads.added.md` and the PR body: unrestricted mode
includes the connector process's own `/proc/self/environ`, hence its Slack
tokens and any other secret in its environment, so enable it only where the
agent is already trusted with those credentials. No code change needed — this
is a disclosure gap, not a defect.

### LOW

**LOW `src/upload-path.ts:277` with `src/server.ts:747` (security/consistency)
— unrestricted-mode refusals echo raw `errno` text including the path, while
restricted mode is fully sanitized.** `await open(path, ...)` rejects with
Node's system error, which `server.ts:747` wraps verbatim. Production path:

```
unrestricted /etc/shadow       -> Nothing was uploaded: EACCES: permission denied, open '/etc/shadow'
unrestricted /no/such/dir/file -> Nothing was uploaded: ENOENT: no such file or directory, open '/no/such/dir/file'
restricted   /etc/shadow       -> Nothing was uploaded: Upload path is outside the configured directories or names a directory
```

Not an escalation (the path is the caller's own input, and in unrestricted mode
it may read those files anyway), but it turns the tool into an existence and
permission oracle for arbitrary absolute paths, and it is inconsistent with the
restricted-mode contract. `test/uploadPath.test.ts:160` currently pins the
`ENOENT` text, so this is a deliberate choice, not an oversight.
*Fix direction:* if uniform sanitization is wanted, map `open` failures in
`readUnrestricted` to a constant (`'Upload path is unreadable'`) and update that
assertion; otherwise leave it and say so in the README.

**LOW `src/tools.ts:289` (contract drift) — enabling path uploads drops
`filename` from `required`, but the handler still requires it for inline
uploads.** With paths enabled the schema's `required` is `['channelId']`
(pinned by `test/pathUploads.test.ts:72`), yet `server.ts:750` still calls
`requireString(args, 'filename')` on the inline branch. A client that validates
against the published schema can send `{channelId, content}` and only learn at
call time that `filename` was mandatory. The tool description does say
"required for inline data"; plain JSON Schema cannot express the conditional
without `oneOf`. *Fix direction:* acceptable as is; if a maintainer objects,
express it with `oneOf`/`dependentRequired`, or keep `filename` required and
make the basename an explicit affordance.

**LOW `README.md:184` (docs) — "`filename` is optional for a path and defaults
to its basename" omits that an explicitly empty `filename` is refused, not
defaulted.** `given('filename')` is true for `''` (`server.ts:700`), so
`server.ts:739` calls `requireString`, which rejects empty strings. This
contradicts the handler's own stated convention two lines above ("an optional
one given as an empty string names nothing", `server.ts:696`). It is tested
(`test/pathUploads.test.ts:99`), so the behaviour is intentional.
*Fix direction:* one clause in README:184, or treat `''` as absent in the path
branch.

**LOW `src/upload-path.ts:144` and `:206` (perf/availability, already
documented) — nothing bounds concurrent path reads.** `this.children` is
unbounded and each read holds the whole file several times over. Measured
resident cost on this box (`probes/large.ts`):

| file | restricted | unrestricted |
|---|---|---|
| 64 MiB | 78 ms, rss 206 MiB | 17 ms, rss 270 MiB |
| 256 MiB | 265 ms, rss 655 MiB | 62 ms, rss 847 MiB |
| 512 MiB | 533 ms, rss 1361 MiB | 114 ms, rss 1617 MiB |

So with `maxBytes: 1073741824`, a handful of parallel `upload_file` calls can
exhaust memory. README:174 explicitly says `maxBytes` "is a per-file byte cap,
not a total process-memory or concurrency limit", and the 1 GiB ceiling is an
accepted design point, so this is disclosed rather than hidden. The same
measurements confirm README's multiple-copies and 5 s-reader claims are
accurate rather than optimistic. *Fix direction:* none required; a maintainer
who wants a bound would add a semaphore over `readRestricted`/
`readUnrestricted`.

**LOW (process, not code) — the commit's author identity becomes public if #31
is updated with it.** Author and committer are
`orgasmic worker (devbox) <orgasmic@devbox>`. The diff text itself is clean: I
scanned every added line for internal references and found only the test
fixture names `internal-link`/`internal-dir` (false positives). The
`Co-Authored-By: GPT-6-Astra <noreply@openai.com>` trailer and the
`Generated with [Codex]` footer satisfy CONTRIBUTING's AI-attribution rule.
*Fix direction:* owner decision at push time; re-author if the devbox identity
should not appear upstream.

## Answers 1-5

### 1. Security

| Attack | Result | Evidence |
|---|---|---|
| `..` in a restricted path | refused (`cannot contain parent traversal`); also refused by root matching after `resolve` | `probes/containment.ts` |
| absolute path outside roots, `/etc/passwd` | refused (`outside the configured directories`) | same |
| leaf symlink to an outside file | refused (`contains a symlink`) | same |
| ancestor symlink to an outside directory | refused | same |
| symlink pointing back inside the root | refused (all below-root symlinks, as documented) | same |
| root replaced by a new inode at the same name | refused (`Configured upload root was replaced or moved`) | same |
| root alias (symlink) re-pointed after construction | still reads the pinned canonical root | `test/uploadPath.test.ts:105` |
| FIFO | refused (`must name a regular file`); `O_NONBLOCK` means no wait for a writer | `probes/containment.ts` |
| char/block device (`/dev/zero`, `/dev/null`) | refused (`must name a regular file`) | `probes/unrestricted.ts` |
| unix socket inside the root | refused (`unreadable...`, `ENXIO`) | `probes/containment.ts` |
| hard link inside root to an outside file | **allowed**, matching the documented out-of-scope boundary | same |
| leaf swapped file/symlink during the read, 7.6 k flips | 419 ok / 471 refused / **0 leaks** | `race-probes.log` RACE1 |
| ancestor dir swapped dir/symlink during the read, 7.5 k flips | 399 ok / 413 refused / **0 leaks** | RACE2 |
| file growing past the cap while being read, 1558 attempts | 412 ok / 1146 refused / **0 over cap** | RACE3 |
| deterministic race schedules (moved leaf/parent, returned parent, unlink, post-read move) | refused `OUTSIDE`/`ROOT_CHANGED` with zero stdout | `test/uploadPath.test.ts:246-362`, reproduced by my M2 mutation |
| huge `maxBytes` | `1073741824` accepted; `1073741825`, `0`, `1.5`, `"8388608"`, `NaN`, `Infinity`, `MAX_SAFE_INTEGER+2` refused, pre-auth | `test/uploadPath.test.ts:60` and the CLI probe below |

**`src/upload-path.ts` is byte-identical to #31's.** Not a textual diff —
identical git blobs: `ddf9212:src/upload-path.ts` and
`f1f9eee:src/upload-path.ts` are both
`bf72aff74d9b065b0f42cad23c1f9023941a709d`. (`ddf9212` is #31's head per the
captured API record: PR 31, open, base `main`, `mergeable: False / dirty` — the
task premise holds.)

**Worker isolation — confirmed, including from `/proc`.** I wrapped the
production `spawn` and read the child's real environment
(`probes/childenv.ts`):

```
spawn opts.env keys: [ 'PATH' ]
  cwd= /  shell= false  argv[0..2]= ["-I","-S","-c"]  stdio len= 4
  /proc/<pid>/environ: ["PATH=/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"]
  credential leak into child env: none
```

Active injection attempts all failed (`probes/isolation.ts`): a malicious
`python3` placed first on the parent's `PATH` was **not** used
(`python used: /usr/bin/python3`, the fixed `PYTHON_PATH`), and `PYTHONPATH`
plus `sitecustomize.py`, `usercustomize.py`, `PYTHONSTARTUP` and `PYTHONHOME`
were all ignored (`-I -S`). The worker source references no credential and no
`process.env`. The constructor's `spawnSync` capability probe uses the same
`{ PATH }` env, `shell: false`, `cwd: '/'`, `maxBuffer: 4096` and a 5 s
timeout, and fails closed on any stderr at all.

**Refusals.** Restricted mode never echoes a path or raw config: every failure
resolves to one of the fixed strings in `WORKER_ERRORS` or the matcher's
constants; worker stderr is bounded at 1 KiB and anything unrecognized
collapses to `Restricted upload reader failed`
(`test/uploadPath.test.ts:310`, and my production probe `probes/echo.ts`). The
one exception is unrestricted mode's `errno` echo — the LOW finding above.

**Unrestricted mode is explicit-only.** There is no default mode
(`validatePathUploadPolicy` refuses `{}`, `null`, `true`, `[]`,
`{"mode":"unknown"}`), no boolean opt-in, and a restricted policy whose Python
support is missing fails closed rather than downgrading
(`test/pathStartup.test.ts:67`, `src/upload-path.ts:200`).

**Path uploads off:** `path` is absent from the schema and `required` stays
`['channelId','filename']`; a hidden call is refused before any Slack contact
(`conversations.info calls: 0`) — verified on the real server, not a stub:

```
refusal: "Nothing was uploaded: this host doesn't take file paths, so upload_file
          can't read path. Pass the file's bytes as content or contentBase64 instead."
schema has path: false | required: ["channelId","filename"]
```

### 2. Integration with current main

- **Startup refusals land before Slack auth.** `startupSettings`
  (`src/config.ts:53-67`) parses the policy after the token check (`:37`) and
  before `connectSlack` (`src/index.ts:52`). Reproduced on the **built `dist/`
  bin** with an empty environment:

  ```
  policy=not-json                                       exit=1 stdout=0B stderr="SLACK_PATH_UPLOADS must configure restricted directories or explicit unrestricted mode, with optional maxBytes from 1 to 1073741824, as JSON"
  policy={"mode":"unrestricted","maxBytes":0}           exit=1 stdout=0B  (same line)
  policy={"mode":"unrestricted","maxBytes":1073741825}  exit=1 stdout=0B  (same line)
  policy={"mode":"restricted","directories":["/no-such-root-xyz"]} exit=1 stdout=0B stderr="SLACK_PATH_UPLOADS requires Linux/macOS; restricted mode also requires Python 3.9+, descriptor-path support and readable directory roots"
  policy={"mode":"restricted","directories":["/etc/passwd"]}       exit=1 stdout=0B  (same line)
  ```

  One sanitized line, exit 1, nothing on stdout, no path or raw value echoed.
  CI's byte-exact "start without credentials" check also still passes on the
  built bin (stderr `cmp`-identical to the expected single line, stdout empty).
- **No duplicate env parsing.** `SLACK_PATH_UPLOADS` is read in exactly one
  place (`src/config.ts:54`); `src/index.ts` touches `process.env` only to call
  `startupSettings`. No inline parser survives from #31.
- **Framing, inline validation, three steps, rollback, acks preserved.** The
  inline branch keeps upstream's exact check order (`filename`, exactly-one,
  type/empty, lone-surrogate, pre-allocation size, bytes, then
  `comment`/`title`/`messageId`), so inline refusal wording and ordering are
  unchanged; all 583 pre-existing tests still pass. The upload itself is
  untouched: `getUploadURLExternal`, POST of the `Buffer`,
  `completeUploadExternal`, with `filesLeft`/`recordUploaded` rollback and
  `clearAck` as before. Reader refusals are introduced with the existing
  `Nothing was uploaded: ` prefix.
- **Destination checked before the read and again before the upload.**
  `server.ts:745` calls `requireUploadDestination` before `pathReader.read`,
  and `slack-adapter.ts:1274` calls it again at the top of `uploadFile`. Proven
  by mutation (M3 below) and by `test/pathUploads.test.ts:109-129`. The second
  call is not an extra Slack round trip: `assertNotDm` short-circuits on
  `channelIds`, which the first call populated.
- **Reader closed at shutdown, no leaks.** `src/index.ts:74` calls
  `server.close()`, hence `pathReader.close()`, on SIGTERM/SIGINT and when
  stdio closes (`index.ts:86`). Measured (`probes/leaks.ts`): 20 sequential
  restricted reads, `close()` with 8 reads in flight (all rejected
  `Path upload reader is closed`), 30 full reader lifecycles and 50
  unrestricted reads left the process at **fd count -4 versus baseline and zero
  stray children**.

### 3. Tests

- **Red/green is real.** The implementer's receipts reproduce
  (`red-startup-network.log` 1 pass / 21 fail on upstream `config.ts`;
  `red-path-schema.log` 0/2 on upstream `server.ts`;
  `mutation-containment.log` 2/4; `mutation-byte-cap.log` 0/2).
- **My own six mutations** (`p1.py`-`p6.py`, `mut-*.log`), focused-set baseline
  100 pass / 0 fail:

  | # | Mutation | Result |
  |---|---|---|
  | M1 | drop the `..` guard in `read()` | **1 fail** (`unrestricted ... while restricted mode refuses them`) |
  | M2 | drop the post-read `beneath(file, canonical)` | **1 fail** (`file-after-read`) |
  | M3 | drop the pre-read `requireUploadDestination` | **2 fail** (destination and DM guards) |
  | M4 | expose `path` in the schema regardless of policy | **1 fail** (inline-only default) |
  | M5 | drop the "host doesn't take file paths" refusal | **0 fail, survived** (MEDIUM above) |
  | M6 | drop `O_NOFOLLOW` from the worker's leaf open | **1 fail** (inner-symlink test) |

  Sources were restored and re-verified byte-identical to `f1f9eee`; restored
  focused run 100/100 (`mut-restored.log`).
- **No leaks across the one-process suite.** No `process.env` writes in the
  three new files; the only global mutations are `t.mock.method` on
  `fs`/`fs/promises`/`child_process` with `syncBuiltinESMExports()` restored in
  `t.after`, plus a `process.platform` redefine inside a synchronous test's
  `try/finally`. Temp residue measured by an `ls /tmp` diff around a full
  suite: **28 new entries at the commit and 28 at the upstream baseline**, all
  `release-changelog-*`/`slack-mcpl-*`, i.e. pre-existing upstream behaviour;
  the new files leave nothing (three measured runs). The shared
  `uploadEndpoint()` registry is keyed per fixture with a random `F...` prefix
  and its `bytes`/`posts` entries are deleted in `t.after`
  (`test/pathUploads.test.ts:21,44`), so it does not collide with
  `uploadSteps`/`uploadValidation`/`sendChannels`, which all use `F1`, `F2`, and
  so on.
- **Repeats and load.** Five separate runs of the three new files: 100/100 each
  (`rev-new-tests-repeats` gate). Three more runs with 32 busy-loops on 16
  CPUs: **100/100 each**, no flake near the 5 s worker timeout
  (`load-1..3.log`). Order sensitivity: full suite with the new files placed
  **first** and **last** — 683/683 both ways (`order-newfirst.log`,
  `order-newlast.log`).

### 4. Fresh full suites, typecheck, build

All via `orgasmic dispatch gate ... -- timeout 900 ...`, loopback guard in
`NODE_OPTIONS`, `npm ci --ignore-scripts --registry=https://registry.npmjs.org`
with two empty configs, `npm_config_audit=false`, `npm_config_fund=false`,
`NO_UPDATE_NOTIFIER=1`. Node 24.22.1 and 22.12.0 reused from the verified
scratch installs; every gate log prints `node -v` and asserts the expected
version.

| Gate | Runtime | Result |
|---|---|---|
| `rev-baseline-suite-22.23.3` (upstream `7274283`) | 22.23.3 | **583 pass / 0 fail / 0 skip / 0 cancelled** |
| `rev-suite-22.23.3` | 22.23.3 | **683 / 0 / 0 / 0** |
| `rev-suite-24.22.1` | 24.22.1 | **683 / 0 / 0 / 0** |
| `rev-suite-22.12.0` | 22.12.0 | **683 / 0 / 0 / 0** |
| `rev-typecheck`, `rev-build` | 22.23.3 | pass |
| `rev-typecheck-24.22.1`, `rev-build-24.22.1` | 24.22.1 | pass |
| `rev-new-tests-repeats` | 22.23.3 | 5 x 100/100 |
| `rev-security-probes`, `rev-race-probes` | 22.23.3 | pass, logs above |

683 against 583 as predicted; the +100 delta is exactly the three new files.
`package.json` and `package-lock.json` are untouched by the commit.

### 5. Docs

Accurate and public-safe, and in line with CONTRIBUTING and the PR template.
Claims I checked against the code or measured:

- `maxBytes` 1 to 1073741824, default 5242880; inline stays 5 MiB
  (`MAX_UPLOAD_BYTES`) — correct.
- "5 s to read the file" is `WORKER_TIMEOUT_MS`; "10 s for the POST of the
  bytes" is `SLACK_CLIENT_OPTIONS.timeout`, used by `postFileBytes` — both
  correct. The "call's 25 s" figure is pre-existing README text (upstream
  README:259), not a new claim.
- "runs with `-I -S` in a clean environment, without a shell or connector
  credentials" and "never changes its working directory" (the child gets
  `cwd: '/'`, the parent is untouched), and "`comms` plus `files` when enabled"
  — all correct and measured above. `files` is in `TOOL_CLASS_VOCABULARY`.
- "Inline-only and unrestricted modes ... require no Python" — correct: the
  Python probe sits inside the `mode === 'restricted'` branch and
  `test/pathStartup.test.ts:67` asserts exactly one `spawnSync` call.
- "multiple copies in Node and the Python worker" — correct and conservative:
  512 MiB measured 1361 MiB RSS restricted, 1617 MiB unrestricted.
- Hard links, privileged mounts and equivalent account access are named as
  outside the boundary in README:224, the fragment and the PR body — and the
  hard-link case is exactly what my probe showed as allowed.
- **Changelog fragment** `changelog.d/31-path-uploads.added.md`: flat, valid
  `added` suffix, matches the workflow regex
  `^changelog\.d/[^/]+\.(breaking|added|changed|fixed)\.md$` against the
  commit's added-file list; no headings or horizontal rules; audience-scoped
  `**Operators:**` bullets with two-space continuations. I folded it for real
  in a scratch copy: `scripts/release-changelog.mjs` consumed 34 fragments,
  emitted its bullets under `### Added`, and left exactly one `## Unreleased`
  heading. Repository release files untouched.
- **PR body** follows the template's Problem / Changes / Tests / Not verified
  (plus Out of scope and Companion PRs) and the checklist, states suite counts
  numerically against a named baseline as CONTRIBUTING demands, and names what
  was not verified. The Codex footer and the `Co-Authored-By: GPT-6-Astra`
  commit trailer satisfy the AI-attribution convention ("or equivalent for your
  tooling").
- **#31 comment draft** is accurate: zero formal reviews and zero inline review
  comments in the captured collections (`pr31-reviews.json` and
  `pr31-review-comments.json` are both empty; the three issue comments are all
  the author's own merge notes), so "no automated review findings to answer" is
  a true statement, not an omission.
- The two disclosure gaps are the MEDIUM (`/proc/self/environ`) and the LOW
  (empty `filename`) above.

## Verification Gates

Receipts in `$ORGASMIC_EVIDENCE_DIR`:

- `gate-rev-baseline-suite-22.23.3-01M633FTKXF81PN732NB9AR1KG.log` — 583 pass
- `gate-rev-suite-22.23.3-01M633DRS7AXSS0FEDES86R6WJ.log` — 683 pass
- `gate-rev-suite-24.22.1-01M633E8JSV77XXEB8RDGZDMM6.log` — 683 pass
- `gate-rev-suite-22.12.0-01M633ERYYNQNY1WZ30D9Z7Q22.log` — 683 pass
- `gate-rev-typecheck-01M633GEAMPRJMFCP102AWFP9N.log`,
  `gate-rev-build-01M633GENRR3GWYC3JGW3CZHXY.log`
- `gate-rev-typecheck-24.22.1-01M6343761XAHGSWA0B0JP4HFE.log`,
  `gate-rev-build-24.22.1-01M63437E1PSTPXDKP2SM01K4P.log`
- `gate-rev-new-tests-repeats-01M63437P2YPDQGTB6K83P3615.log` — 5 x 100/100
- `gate-rev-security-probes-01M634CGCPR3H2Y3NB7QQXHZ0X.log` (also
  `security-probes.log`)
- `gate-rev-race-probes-01M634CPYM4EPXRT6QT9F6XZNR.log` (also
  `race-probes.log`)

Unwrapped (no reusable receipt, logs kept): the six mutations (`mut-*.log`,
`p1.py`-`p6.py`), the three CPU-load runs (`load-1..3.log`), the two ordering
runs (`order-newfirst.log`, `order-newlast.log`), the built-bin CLI refusal and
CI-start reproduction, the large-file measurements, and the release-fragment
fold. `run-suite.sh`, `env.sh`, `loopback-only.cjs` and `probes/` are archived
so every one of them can be re-run verbatim.

Reused from the implementer's run without re-running: the red/green and
mutation logs (spot-checked and consistent with their report) and the
`pr31*.json` API captures (head SHA re-confirmed against the local object
database, upstream head re-confirmed by `ls-remote`). The named
`node-only-race-preprobe` receipt was read, not re-run.

## Unmet criteria / test gaps

Acceptance criteria are met: one commit on current upstream main; path access
off unless enabled, confined to configured roots, and safe against symlinks,
`..`, races and size abuse with a test for each; red/green plus mutations; full
one-process suite on all three runtimes; changelog fragment and README; public-
safe text. No automated review comments existed to answer.

Remaining gaps, none blocking:

1. **The hidden-path refusal is mutation-silent** (MEDIUM above) — the only
   guard I could delete without turning the suite red.
2. **The `..` guard has thin coverage.** M1 fails exactly one test, and only
   because that test pins restricted/unrestricted divergence; the escape it
   superficially guards is independently caught by root matching after
   `resolve`. That is defence in depth working as intended, but a maintainer
   reading the diff should know the guard is a usability and clarity rule, not
   the containment barrier.
3. **No concurrency test.** Nothing exercises several simultaneous path reads,
   so the unbounded-`children` memory behaviour is documented but unmeasured in
   the suite (I measured it out of band).
4. **macOS and Windows are not executed.** `F_GETPATH`, the alias and
   `/private` canonicalization that matters most on macOS, and the Windows
   refusal are covered only by Linux runs and platform substitution. The report
   and PR body both say so.
5. **No live Slack, OAuth or real MCPL host.** Declared.

## Residual Risk

- Descriptor checks are admission observations at three points, not an atomic
  or perpetual boundary. Hard links (demonstrated allowed), privileged mount or
  namespace changes, and equivalent account or sudo access remain outside the
  claim — stated in README, the fragment and the PR body.
- Unrestricted mode has no root boundary and reaches the connector's own
  secrets (MEDIUM above). It stays an explicit opt-in; dropping it is a
  reasonable maintainer choice, as the implementer's own report says.
- `maxBytes` up to 1 GiB with no concurrency bound can exhaust memory;
  disclosed, not bounded.
- The startup probe is not a snapshot: a filesystem or runtime change between
  `startupSettings` and `new SlackMcplServer` makes the server constructor
  throw **after** Slack authentication, surfacing as
  `[slack-mcpl] Fatal error: ...` and exit 1. The message is the sanitized
  constant, so nothing leaks, but the failure is noisier than a pre-auth
  refusal. Two Python capability probes run per boot (startup plus server).
- The gate receipts carry the worktree SHA `685b2de`, not `f1f9eee`, because
  the reviewed commit was exported to scratch to keep the shared worktree
  untouched. Each log names its scratch cwd and Node version.
- `release-changelog-*`/`slack-mcpl-*` temp-dir residue is identical at
  baseline and at this commit — a pre-existing upstream test-hygiene issue, out
  of scope here.

## Fix Directions

1. `test/pathUploads.test.ts:61` — assert the hidden-path refusal text so the
   guard at `src/server.ts:716` cannot be deleted silently. One line.
2. `README.md:208`, the unrestricted bullet of
   `changelog.d/31-path-uploads.added.md`, and the PR body's unrestricted
   paragraph — state that unrestricted mode includes the connector's own
   `/proc/self/environ`, and therefore its Slack tokens.
3. `README.md:184` — note that an explicitly empty `filename` is refused rather
   than defaulted to the basename (or treat `''` as absent at
   `src/server.ts:739`).
4. Optional: sanitize `readUnrestricted`'s `open` failures
   (`src/upload-path.ts:277`) to match restricted mode, updating
   `test/uploadPath.test.ts:160`.
5. Optional, for the maintainer conversation: add a concurrency bound over
   `PathUploadReader.read`, or say explicitly in the PR body that none exists.
