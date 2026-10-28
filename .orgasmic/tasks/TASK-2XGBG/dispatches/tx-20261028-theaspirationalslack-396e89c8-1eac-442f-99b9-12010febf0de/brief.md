TASK-2XGBG: rebuild our open upstream PR anima-research/slack-mcpl#12 (thread status) on current upstream main, answering its review.

Rules:
- Local commits only. No push, no PR edit, no GitHub comment. Public-safe text.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with two empty npm user/global configs outside the repo; audit and fund off.
- Node 22.23.3 on PATH. Node 24.22.1 and 22.12.0 in scratch, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test listeners (`NODE_OPTIONS=--require=<guard>`).
- Suites run in `orgasmic dispatch gate <name> -- timeout 900 …`.
- Never nest two mocks of one property in one TestContext.
- Read-only public GitHub reads are fine. If you hit rate limits, wait and say so.

Start: fetch upstream main read-only (it was `ca8f6b11` recently) and build on its head. Report the sha.

Step 0 (in the report, before coding):
1. Read PR #12 in full: description, head commit (`21a7ebcb` per our notes; verify), diff, and every review and comment (the 2026-10-21 review requested changes). List each review point verbatim or closely, with who raised it.
2. Show how #12's diff conflicts with current main, file by file.
3. Feature sets: how `src/feature-sets.ts` derives grants (fail-closed). Propose the shape for typing: a separate feature set (e.g. `slack.status` / `slack.typing`) or an optional use within messaging, if upstream's mechanism supports optional uses. Show which one the review asks for, or which fits upstream's existing patterns. Check whether other optional capabilities in that file have the same problem, and report them; fix only typing unless the review asks for more.
4. Plan for each review point.
STOP and report options instead of building if: a review point needs a maintainer decision you can't infer; the change would exceed about 300 net production lines or 5 production files; or #12's feature now overlaps something upstream already merged.

Build:
- One commit on upstream main with only the needed files. Tests in upstream's homes, including one where the host grants the harness set WITHOUT `channels.typing`: messaging still works, and no thread status is attempted. It must be red on #12's approach and green after.
- Red/green for each review point you fix, plus at least one mutation of your own.
- `changelog.d/` fragment per changelog.d/README.md and CONTRIBUTING.md; README if behaviour is documented there.
- Commit title plain, body wrapped at 72, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`, default author.

Gates at the final commit:
- npm ci, typecheck and build on Node 22.23.3 and 24.22.1.
- Full suite on both, with counts vs a baseline you measure on the same upstream sha.
- Node 22.12.0 for the touched test files.
- Release dry fold in scratch, and the changelog CI regex.

Report:
- Step 0
- final sha, diff stat, fragment verbatim
- gates
- a table of each review point → how addressed (commit/test) or why not
- a draft reply to the reviewers (public-safe, short, per point)
- a PR body draft
- residual risk