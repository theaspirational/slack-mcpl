PUBLIC LEDGER AND PUBLIC REPOSITORY: write only public technical facts. No host, agent, person or private-system names in commits, comments or the report.

Task: on branch task-0901y-impl (from fork main 3302d700c058f9de3a833ab7ee021903dd05cc1c), create ONE merge commit of upstream anima-research/slack-mcpl main 439a81b502388ab3a77b4bbb0e62a380e1b50605 (remote `upstream` is configured in the source clone; fetch it into your worktree if missing: https://github.com/anima-research/slack-mcpl.git). Do not rebase, do not rewrite fork history, do not push.

Known: merge-base bff8f10c1c3ce493abc10fb9946f0559e2f89e05; fork 45 ahead / upstream 10 ahead. Trial merge-tree conflicts: src/server.ts, src/slack-adapter.ts, test/harness.ts. Upstream's 10 commits include PR 45 (refuse lone surrogates in text/ids before calling Slack), PR 47 (sender-framing forgery fix), PR 48 (@animalabs/mcpl-core ^0.4.0).

Resolution rules:
1. Keep every fork behaviour AND every upstream behaviour. Where both guard the same call, keep the fork's scope-aware writability check and upstream's text check, in the order upstream documents (allow-list/writability refusal first, then text validation, both before any Slack API call).
2. Security fixes from upstream (PR 47 framing) must hold on every fork code path that builds sender framing, including fork-only paths. Search for them; if a fork-only path bypasses the fix, extend the fix there and say so.
3. Dependency bump (mcpl-core ^0.4.0): update the lockfile with npm, and check every fork-only use of mcpl-core APIs against 0.4.0. Report any API change you adapted.
4. If a conflict cannot be resolved without choosing between behaviours, stop and ask with the two options.

Gates (report exact commands and counts): npm ci; tsc (or the repo's build); the full test suite on base fork main, on upstream main, and on the merge, with counts; name every test that is red on the merge and whether it is red on either parent. Upstream's new tests must pass on the merge.

Report: per-conflict hunk explanation (what each side did, what you kept and why); the framing-fix coverage of fork paths; dependency notes; gate tables; remaining risks. Commit message: "Merge upstream main 439a81b5 into fork main".