# Round 2: changelog wording

## Changed

Amended commit: `67fdf65af8678585b9e79cfcd71e8bf48bb9b725`.
Replaces `7e97972721fef609383616191447e05b81cd1018`; still exactly one
follow-up commit on `7fc1acade0c089d491d77fcf3c182fc88aaa877f`.
Preflight confirmed the required old HEAD and a clean tree.

Applied the supplied last-two-sentence wording verbatim. Earlier sentences
are byte-for-byte unchanged; the fragment remains one bullet without a
heading. Commit message, trailer, author identity and author date are
unchanged. No other file changed this round. No push, PR or GitHub comment.

`git diff 7e979727 --stat` at the amended commit:

```text
 changelog.d/channel-label-framing.fixed.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

Word counts use whitespace-separated words, excluding the leading bullet
marker: **whole fragment 131 → 124; last two sentences 73 → 66** (7 fewer).
Recorded in `round2-word-count.json`.

### Fragment verbatim

- An ordinary or private channel's name and the workspace's name in a conversation's label now follow the name rule: quoted when not plain, with the channel's `#` inside the quotes. Plain names are unchanged; an empty workspace name is omitted rather than shown in parentheses. These labels reach `channels/register`, `channels/changed`, `channels/list`, `channels/open`, `refresh_channels`' `added`, and a write's `to`. A non-plain workspace name changes every conversation's label in that workspace, even one whose own name is plain. A host keeps the label a conversation was first announced with and a refresh doesn't re-announce a known one, so after an upgrade a host's conversations keep their old labels, raw hostile names included, while a write's `to` gives the server's new label and may no longer match.

## Verification Gates

All gates below ran freshly at `67fdf65af8678585b9e79cfcd71e8bf48bb9b725` on Node **22.23.3**
(npm 10.9.9), with clean trees at entry and exit. Each command was wrapped as
`orgasmic dispatch gate <name> -- timeout 900 <command>`.
Log paths are relative to this round's `$ORGASMIC_EVIDENCE_DIR`.

| Gate | Command after `timeout 900` | Result | Log |
| --- | --- | --- | --- |
| `round2-npm-ci-node22` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | `gate-round2-npm-ci-node22-01M623WQX7TBD48K7P0BGZ6V5C.log` |
| `round2-typecheck-node22` | `npm run typecheck` | pass | `gate-round2-typecheck-node22-01M623WRQWXQWBWB667NBZNQAM.log` |
| `round2-build-node22` | `npm run build` | pass | `gate-round2-build-node22-01M623WRZVTHQVXX0TG5BYS9M5.log` |
| `round2-suite-node22` | `npm test` | 605 pass / 0 fail | `gate-round2-suite-node22-01M623WS7SN5JE54PHNPXTW5W7.log` |
| `round2-fragment-release` | `python3 "$ORGASMIC_EVIDENCE_DIR/round2-fragment-probe.py"` | pass | `gate-round2-fragment-release-01M623X5ZCFWM858DE2C95MQWQ.log` |

Full suite: **605 tests, 605 pass, 0 fail, 0 skipped, 0 cancelled, 0 todo**.

The release probe copies `package.json`, `CHANGELOG.md`, all fragments and
`scripts/release-changelog.mjs` to a temporary scratch directory outside
the repository and evidence. It runs `node scripts/release-changelog.mjs`
there and confirms that the exact bullet appears once under `Fixed`, the
fragment is consumed only in scratch, and the real worktree stays clean.
All 34 pending fragments folded successfully. The folded output is retained
as `round2-folded-CHANGELOG.md`; the reproducible probe is
`round2-fragment-probe.py`. The same gate checks the single-file diff,
preserved earlier sentences, commit metadata and `git diff --check`.

npm ci used two distinct empty user/global npm config files outside the
repository, selected via `npm_config_userconfig` and
`npm_config_globalconfig`, with scripts ignored and the explicit public
registry. Update notifiers were disabled from this round's first command
with `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false`.

### Inherited evidence and unchanged scope

No prior gate receipt was reused or represented as an amended-commit pass.
The amendment is not a descendant of the replaced commit.

Round 1's red/green experiment remains relevant historical behavioral
proof because `git diff 7e979727 HEAD -- src test package.json
package-lock.json scripts` is empty: production, tests, dependencies and
scripts are unchanged. Its three new tests failed against the parent
`src/channels.ts`, then passed after byte-for-byte restoration. Copies are
retained here as `inherited-final-new-tests-red-node22-console.log`,
`inherited-final-new-tests-green-node22-console.log` and
`inherited-final-mutation-result.txt`. These are historical evidence, not
fresh gate receipts. The earlier source-based label-retention reasoning
also has unchanged production inputs. This round independently verifies
the new wording's release folding and reruns every assigned Node 22 gate.

## Unmet Criteria

None. All assigned checks passed. Final worktree is clean.

## Residual Risk

- No live Slack or external host migration was exercised; this round
  changes documentation wording only.
- Node 24 was not rerun: the narrowed brief requires Node 22 only. No
  amended-commit Node 24 pass is claimed.
- npm ci again reported two high-severity dependency vulnerabilities,
  matching the prior round's baseline warning. Dependencies were not changed.
