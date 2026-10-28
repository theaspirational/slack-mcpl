Task TASK-1YAJK in this project holds the goal. This brief is the procedure. Local commits on your task branch only: no push, no GitHub comment, no merge to any shared branch. No credentials. Public facts only in your report: no agent, host or private names.

Environment: Node 22.23.3 is on PATH. Keep update notifiers off from the first command (`NO_UPDATE_NOTIFIER=1 npm_config_update_notifier=false`). Dependencies come only from the public npm registry with `npm ci --ignore-scripts` and an empty user/global npm config. If `npm ci` refuses (lockfile out of sync), STOP and report; do not switch to `npm install` and do not edit the lockfile. Node 24: if no Node 24 is on PATH, download the official Node 24.x Linux x64 tarball from nodejs.org into a scratch directory OUTSIDE the repository, verify it against the published SHASUMS256.txt, and report the exact version. Do not install anything globally.

Preflight (stop and report if any step fails):
1. `git rev-parse HEAD` must print b956350d4e77f09df76240439b3d35d512061899.
2. `git fetch origin pull/1/head:pr1-head`; `git rev-parse pr1-head` must print 6a1946d072bfcc99d67a837d2fcc6132e677fcf7.

Step 1, baseline: on b956350d run `npm ci --ignore-scripts`, `npm run build`, typecheck, and the full test suite on Node 22.23.3. Record pass/fail/skip counts and which tests fail, if any. Failures here are base failures: report them, do not fix them.

Step 2, merge: `git merge --no-ff pr1-head` on your task branch. The expected conflict is only test/accessPolicy.test.ts (one end-of-file hunk: HEAD adds send/edit malformed-text authorization-order tests, explicit-policy DM malformed-text tests and three missing-scope preflight tests; the PR adds its group-DM fixture and tests). Resolve by keeping BOTH blocks intact and in a sensible order; do not rewrite, reorder inside, or drop any test from either side. If any other file conflicts, or any production file needs a change to compile, STOP and report it. Commit the merge with the repository's configured identity; do not change git config.

Step 3, four new deny cases, as tests only (a new test file is allowed if the existing one gets unwieldy). Use the existing harness and patterns in the repository; do not invent a new test framework.
 (a) Hostile group-DM content, display name and attachment name/type with the explicit policy, asserted at the level of the final server-rendered text delivered to the model (not only at adapter admission). Include newlines, fake sender/role markers and a forged 'this bot' style label, whatever the existing framing tests use.
 (b) An incoming group-DM event when the mpim scopes are missing (read and history separately): nothing is delivered and no history call is made.
 (c) Recipient routing with readJoinedChannels:false and a listed group DM: refused. The existing routing group test is gated to Node 24; run yours on Node 24 and report if it is skipped on 22.
 (d) A group-DM send or reply without the write scope, or to an unlisted destination: refused BEFORE malformed-text validation and before any Slack call.
For each new test, show it can fail: temporarily weaken the single guard it covers (a throwaway edit, never committed), run the test, record the red result, restore the file byte-for-byte (`git diff` empty for production files), then record the green result. If a guard is covered by no single line, say so and describe how you weakened it. If a new test fails on the unmodified merged code, that is a finding: do not fix production code; stop that case, keep the failing test out of the commit, and report it with the output.

Step 4, verification on the final commit: `npm ci --ignore-scripts`, build, typecheck and the full suite on Node 22.23.3; the routing test file and, if feasible, the full suite on Node 24. Report counts per engine and a base-vs-final comparison (Step 1 versus now): tests added, any difference in failures. Run each gate through `orgasmic dispatch gate`; do not reuse earlier results for the final claim.

Limits: tests only. Production source changes are out of scope; if you believe one is needed, report it with file:line and stop. If the net new test lines exceed about 400 or a file other than the test directory is touched, stop and report.

Report: the final commit sha (full), the merge result, a list of the new tests, the red/green evidence per test, counts per engine, the base-vs-final table, what you could not run, and anything unexpected. Finalize with that report and a local commit.