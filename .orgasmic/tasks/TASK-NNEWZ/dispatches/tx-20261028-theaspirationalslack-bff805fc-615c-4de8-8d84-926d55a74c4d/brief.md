Round 2 of TASK-NNEWZ (fresh start; an earlier attempt was interrupted by a daemon restart before committing anything, and its recovery never started). Refresh `docs/FORK-VS-UPSTREAM.md` against current upstream. Rules: edit only that one file, commit locally on your task branch, no push, no PR, no GitHub comment, no credentials, public-safe text only (no agent, host or private names), update notifiers off from the first command (NO_UPDATE_NOTIFIER=1, npm_config_update_notifier=false). Network: `git fetch` from https://github.com/anima-research/slack-mcpl.git and https://github.com/theaspirational/slack-mcpl.git, unauthenticated GET calls to the public GitHub REST API, and `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with two distinct empty user and global npm config files.

Preflight: `git rev-parse HEAD` must print d63db80fb5998a1d10ddc3e294a2d9391278d828 and the tree must be clean, else stop.

Evidence from the interrupted attempt may exist under /home/orgasmic/.orgasmic/runs/run-01M61Z5X4QD0ZJ7H2RJHAEBX8R/evidence/ (round2-apply.py, round2-test-pr31.sh, round2-test-existing.sh and their gate logs). You may read and reuse its scripts as a starting point, but rerun anything you cite; do not cite its results as yours. Its composed-suite gate started and never ended; find out why before repeating it.

Keep long test suites bounded: run each suite through `orgasmic dispatch gate` wrapped in `timeout 900`; if one hangs, record it as "hung / not established" with the last log lines and move on.

What changed since round 1 (check each):
- Upstream main moved from 439a81b502388ab3a77b4bbb0e62a380e1b50605 to d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34 (their PR #49: whole suite in one process with `--experimental-test-isolation=none`, test waits on a virtual clock). If it has moved again, use the new head and say so.
- PR 1 of your plan (descriptor-label quoting) is open upstream as https://github.com/anima-research/slack-mcpl/pull/50 (one commit 7fc1acade0c089d491d77fcf3c182fc88aaa877f on d3e4f7c9, fork branch `channel-label-framing`). Fork main is still 685b2debff12ed5cfdcae9070ddb131842c5a6d0 and does not contain it.
- Re-check the states of our upstream PRs #12 and #31 and any other open PR of ours.

Do:
1. Recompute ancestry and the diff (fork main vs current upstream main). Update every row whose status, files or base changed; mark the label-quoting row as open PR #50.
2. For each proposed PR, in a scratch clone outside the worktree, check whether its commits (or the fork's version of its files) apply to current upstream main: clean / conflicts (with paths) / not checked. Note any test file that relies on per-file process isolation or real timers and would break under #49's runner. Run the suite for at least the next two candidates; say which you ran.
3. Revise the PR order if the new facts change it, and say why. Name the next one or two PRs to start, with scope, size and tests they carry.
4. Add a short "changes since d63db80f" section at the top.

Finalize: one local commit, then the report: final sha, what changed in the table, apply and test results per PR, the revised order, what you could not establish. Gate your own consistency check through `orgasmic dispatch gate` at the final commit.