TASK-SYJYQ: rebuild our open upstream PR anima-research/slack-mcpl#31 (upload files by local path) on current upstream main, so a maintainer can review it.

Rules:
- Local commits only. No push, no PR edit, no GitHub comment. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with two empty npm user/global configs outside the repo; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners (`NODE_OPTIONS=--require=<guard>`).
- Suites run in `orgasmic dispatch gate <name> -- timeout 900 …`.
- Never nest two mocks of one property in one TestContext.
- Tests touch only temp directories you create.
- Read-only public GitHub reads are fine.

Start: fetch upstream main read-only (it was ca8f6b1193154384e4626921255f86923fc5edf3 recently) and build on its head.

Step 0 (in the report, before coding):
1. Read PR #31 in full: description, head, diff, and every review or comment, automated ones included. List each point with who raised it. Note there is no maintainer review yet.
2. Show how #31 conflicts with current main, file by file. Check what upstream already has for uploads (`upload_file` with content? `fileAccess`?) and whether upstream since solved part of this.
3. The fork's current version of the feature (theaspirational/slack-mcpl main 685b2deb) for comparison: settings, root confinement, and its tests (`test/fileAccess.test.ts`). Note the known fetch-mock leak: in a one-process suite that test leaked a global fetch mock. Upstream now runs one process, so your tests must not leak.
4. Plan, in a threat-model style. Off by default. An operator-configured allowed root (or roots). Resolve with realpath and refuse escapes via `..`, absolute paths outside, and symlinks (including a symlink swapped after the check: open with O_NOFOLLOW where possible, or check the opened fd's real path). Regular files only. A size cap. No reading of device files or FIFOs. Clear refusal messages that leak no paths outside the root. Reuse upstream's startupSettings for config parsing, with clean refusals for bad values (like the disabled-tools PR).
STOP and report options instead of building if: the shape needs a maintainer decision you can't infer; the change exceeds about 300 net production lines or 5 production files; or upstream already covers it.

Build:
- One commit on upstream main with only the needed files.
- Tests in upstream's homes: each refusal case (escape, symlink, symlink swap if testable, non-regular file, too big, feature off), a happy path, and the startupSettings refusals.
- Red/green, plus at least two mutations of your own (e.g. drop the realpath check, drop the size cap).
- `changelog.d` fragment per its README; README rows.
- Commit title plain, body wrapped at 72, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`, default author.

Gates at the final commit:
- npm ci, typecheck and build on Node 22.23.3 and 24.22.1.
- Full suite on 22.23.3, 24.22.1 and 22.12.0, with counts vs a baseline measured on the same upstream sha.
- The new test file run 5× in a row.
- Release dry fold in scratch, and the changelog CI regex.

Report:
- Step 0
- the sha, diff stat, fragment verbatim
- gates
- a table of each #31 point → how addressed
- a replacement PR body for #31, and a short draft comment for #31 explaining the rebuild
- residual risk