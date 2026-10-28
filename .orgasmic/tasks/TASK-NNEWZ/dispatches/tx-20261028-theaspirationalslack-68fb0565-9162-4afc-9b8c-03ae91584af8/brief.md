Task TASK-NNEWZ holds the goal and acceptance. This brief is the procedure. READ-ONLY analysis: do not edit tracked files except to add exactly one new file, `docs/FORK-VS-UPSTREAM.md`, committed locally on your task branch. No push, no PR, no GitHub comment, no credentials. Public facts only: no agent, host or private names anywhere in the file or the report.

Network: read-only `git fetch` from https://github.com/anima-research/slack-mcpl.git and unauthenticated GET requests to the public GitHub REST API for anima-research/slack-mcpl pulls, reviews and issues are allowed. Nothing else. Update notifiers off (NO_UPDATE_NOTIFIER=1). No dependency install is needed; if you run tests, use `npm ci --ignore-scripts` from the public registry with two empty npm config files.

Preflight: `git rev-parse HEAD` must print 685b2debff12ed5cfdcae9070ddb131842c5a6d0, else stop. Fetch upstream main and confirm it is 439a81b502388ab3a77b4bbb0e62a380e1b50605 (if it moved, use the new head, say so and recompute everything against it).

Method:
1. `git diff 439a81b5..HEAD` in full and `git log --no-merges 439a81b5..HEAD`. Group changes into areas (access policy incl. group DMs and history fallback; recipient routing; host compatibility; path uploads; thread status; history fixes; enterprise user ids; stale pinned channel; typing context; changelog/docs).
2. For each area: files, commits, status (already upstream / open upstream PR #N / needs PR / fork-only), dependencies on other areas, and whether it needs a matching change in agent-framework or connectome-host (name the interface, not deployments).
3. Upstream PRs #12 and #31: read their head commits, reviews and conversation via the public API. For each: what the fork carries beyond the PR head (`git diff <pr-head> HEAD -- <its files>`), the review requests, and what it needs to land. For #12 the maintainers asked that channels.typing be optional.
4. Recipient routing and host compatibility: explain from source what it does, what it requires from the host, and what upstream would need to accept it or what a generic equivalent could be. Mark it as the critical path for running upstream main.
5. Propose a PR order, smallest and most independent first. Per PR: scope, base, approximate size, tests that travel with it, risk.
6. Note that TASK-9YJZP fixes a descriptor-label quoting bug that also exists on upstream main (verify at 439a81b5 `src/channels.ts`).

Deliverable: `docs/FORK-VS-UPSTREAM.md` committed locally, and a report with the final sha, a summary of the table, the proposed PR order, and what you could not establish. Finalize with that report.