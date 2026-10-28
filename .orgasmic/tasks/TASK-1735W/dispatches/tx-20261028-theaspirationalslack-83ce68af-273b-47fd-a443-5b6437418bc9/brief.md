PUBLIC repository and ledger: write only public technical facts. No agent, host, person, company-internal or private-system names anywhere (doc, commit, report).

Task TASK-1735W: on branch task-1735w-impl starting from b956350d4e77f09df76240439b3d35d512061899 (= fork main 3302d700c058f9de3a833ab7ee021903dd05cc1c merged with upstream anima-research/slack-mcpl main 439a81b502388ab3a77b4bbb0e62a380e1b50605, plus one fix commit), write docs/FORK-VS-UPSTREAM.md and commit it (one commit, no push).

Content:
1. Table, one row per fork-only change, grouped by feature (use `git log --first-parent 439a81b5..b956350d`, `git log 439a81b5..3302d700`, and diffs; merge-base bff8f10c1c3ce493abc10fb9946f0559e2f89e05). Columns: feature; what it does (user-visible behaviour, 1-2 lines); key commits; already upstream in another form? (compare behaviour, not text: cite the upstream commit/PR if the same need is met differently); open upstream PR (check `gh pr list -R anima-research/slack-mcpl --state all` read-only; known open ones include #12 thread status and #31 path uploads); recommendation: send upstream / keep fork-only / drop, with a one-line reason.
2. Section "Which should I use": upstream main is the stable target; the fork carries behavioural fixes on their way upstream; name which rows a user would actually notice.
3. Note the merge itself: which upstream fixes (e.g. PR 45, 47, 48) the fork now includes, and the one fork-side correction made during the merge (explicit DM scope preflight).
Every claim must cite a commit sha or file:line. Keep it under ~250 lines. If something is uncertain, say so in the row rather than guessing.
Gate: markdown only; run `npm run build` once to confirm the tree still builds. Report: the doc's sha256 and byte size, and the table in your report.