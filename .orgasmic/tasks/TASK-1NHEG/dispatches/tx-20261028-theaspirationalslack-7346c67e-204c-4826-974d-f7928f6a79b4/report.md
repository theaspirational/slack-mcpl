# PR #50 follow-up

## Changed

Final commit: `7e97972721fef609383616191447e05b81cd1018`. Exactly one local commit on
`7fc1acade0c089d491d77fcf3c182fc88aaa877f`; no push, PR, or GitHub comment.
The fork's `channel-label-framing` branch matched that base before reset;
`git log -1` and the clean tree were confirmed. Final tree is also clean.
No production files, dependencies, lockfiles, or tracked generated files changed.
Build output remains ignored under `dist/`.

```text
 changelog.d/channel-label-framing.fixed.md |  2 +-
 test/harness.ts                            |  4 ++-
 test/senderFraming.test.ts                 | 56 +++++++++++++++++++++++++++++-
 3 files changed, 59 insertions(+), 3 deletions(-)
```

Read `CONTRIBUTING.md`, the supplied project baseline, and the applicable
worker instructions. No additional conventions or gotchas were supplied;
no applicable `AGENTS.md` was found.

### Review asks and disposition

Read both requested public REST endpoints directly, without authentication;
responses are saved as `reviews.json` and `comments.json`. Initial requests
were rate-limited; retries after the advertised reset succeeded.

1. [Documentation finding](https://github.com/anima-research/slack-mcpl/pull/50#discussion_r4404439456):
   > It should say that conversations already known to a host keep their old label

   Also:
   > non-plain workspace names change for every conversation

   **Reasoning checked before editing: accurate for the stated retained-host-label
   case.** `src/server.ts:1194-1207` updates each server-side descriptor but adds
   only previously unknown IDs to `channels/changed`. Its comment at
   `src/server.ts:1257-1261` explicitly states that the host retains the
   first-announced label and refresh does not re-announce known conversations.
   `recipient()` at `src/server.ts:985-992` reads `to` from the server registry,
   not from the host's retained label. `serve()` creates a fresh registry per
   connection, and `toDescriptor()` applies the workspace suffix to all
   conversation kinds. Thus `to` may differ from a retained host label; this
   does not claim that a newly announced conversation has mismatched labels.
   Added the caveat and workspace-wide effect to the existing single bullet.
   No production correction was needed.

2. [Coverage finding](https://github.com/anima-research/slack-mcpl/pull/50#pullrequestreview-5687613062):
   > Make the harness's team name configurable and add a case with a hostile workspace name, plus one through `refresh_channels`.

   Added optional `HarnessOptions.teamName`, defaulting to `acme` with `??`
   so an explicitly empty name is preserved. Two end-to-end cases exercise
   hostile and empty workspace names through `channels/register` and
   `send_message`'s `to`, for both an ordinary channel and a DM. The hostile
   name must contain no raw framing characters and must decode losslessly;
   the empty name must have no parenthesized suffix. A third case introduces
   a DM after registration, checks `refresh_channels.added`, the actual
   `channels/changed` notification, and a write's `to`, then checks that a
   repeat refresh does not re-announce known conversations. These tests use
   the real server and adapter with fake Slack and an in-memory MCPL connection.

3. [Naming finding](https://github.com/anima-research/slack-mcpl/pull/50#pullrequestreview-5687613062):
   > The name should mention channels too

   Renamed the descriptor test to
   `channel, DM and group DM labels name conversations and workspaces by the name rule`.

### Fragment verbatim

- An ordinary or private channel's name and the workspace's name in a conversation's label now follow the name rule: quoted when not plain, with the channel's `#` inside the quotes. Plain names are unchanged; an empty workspace name is omitted rather than shown in parentheses. These labels reach `channels/register`, `channels/changed`, `channels/list`, `channels/open`, `refresh_channels`' `added`, and a write's `to`. A non-plain workspace name changes the label of every conversation in that workspace, even when the conversation's own name is plain. A host keeps the label a conversation was first announced with, and a refresh does not re-announce a known conversation: conversations already known to a host keep their old label, including any raw hostile name, while a write's `to` uses the server's new label and may no longer match the host-held label.

## Verification Gates

All suites and checks below ran through
`orgasmic dispatch gate <name> -- timeout 900 <command>`.
Log paths below are relative to `$ORGASMIC_EVIDENCE_DIR`.
All five required final gates passed on the final commit with clean trees at
both ends. Baseline gates ran on `7fc1acad` before edits.

| Gate | Command after `timeout 900` | Result | Log |
| --- | --- | --- | --- |
| `base-npm-ci-node22` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | `gate-base-npm-ci-node22-01M622J5WPFWZRKQ5J0QYRERB8.log` |
| `base-suite-node22` | `npm test` | 602 pass / 0 fail | `gate-base-suite-node22-01M622JG4FESF89AFMGDW19WJM.log` |
| `base-suite-node24` | `npm test` | 602 pass / 0 fail | `gate-base-suite-node24-01M622K4HGR75RC4YZH3XGTK67.log` |
| `final-npm-ci-node22` | `npm ci --ignore-scripts --registry=https://registry.npmjs.org` | pass | `gate-final-npm-ci-node22-01M622R4VPQB3VC2MMJJG603ET.log` |
| `final-typecheck-node22` | `npm run typecheck` | pass | `gate-final-typecheck-node22-01M622R5CZ223SEBPQJXXNEWCF.log` |
| `final-build-node22` | `npm run build` | pass | `gate-final-build-node22-01M622R5MY76M07FBT6E8BBX3Z.log` |
| `final-suite-node22` | `npm test` | 605 pass / 0 fail | `gate-final-suite-node22-01M622R5WWP9JSVMRK0FEK2BME.log` |
| `final-suite-node24` | `npm test` | 605 pass / 0 fail | `gate-final-suite-node24-01M622RS9EQJH9QQE94TV4QXPQ.log` |
| `final-new-tests-red-node22` | `targeted command below` | 0 pass / 3 fail (expected mutant failure) | `gate-final-new-tests-red-node22-01M622SEZADRE6AYVXBGJWGVPF.log` |
| `final-new-tests-green-node22` | `targeted command below` | 3 pass / 0 fail | `gate-final-new-tests-green-node22-01M622SF78YDFFTCNXB82R590C.log` |

| Engine | Base tests | Final tests | Delta |
| --- | --- | --- | --- |
| Node 22.23.3 | 602 pass / 0 fail | 605 pass / 0 fail | +3 |
| Node 24.22.1 | 602 pass / 0 fail | 605 pass / 0 fail | +3 |

Both full-suite runs on each engine had zero skipped, cancelled, or todo tests.
Node 22.23.3 was checked explicitly. Node 24.22.1 was downloaded to scratch
outside the repository from nodejs.org and verified against its
`SHASUMS256.txt` before extraction. Evidence: `node24-SHASUMS256.txt`,
`node24-checksum.txt`, `final-node22-environment.txt`, and
`final-node24-environment.txt`.

Update notifiers were disabled from the first command with
`NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false`.
Both npm ci invocations used distinct empty user/global npm config files
outside the repository, selected by `npm_config_userconfig` and
`npm_config_globalconfig`, and the explicit public registry with scripts ignored.

### Red/green proof

Targeted command, run under both final red and green gate names:

```sh
node --import tsx --test --experimental-test-isolation=none \
  --test-name-pattern='workspace name survives|refresh_channels quotes a hostile workspace' \
  test/senderFraming.test.ts
```

Temporarily replaced only `src/channels.ts` with
`git show d3e4f7c9:src/channels.ts`. All three new tests failed (exit 1):
hostile workspace names leaked raw characters in registration and refresh,
and the empty workspace produced `#general ()` rather than `#general`.
Restored the saved production file byte-for-byte, checked it with `cmp` and
`git diff --exit-code 7fc1acad -- src/channels.ts`, then reran the exact
selection: all three passed (exit 0). No mutant was committed.
`final-mutation-result.txt` records restoration and SHA-256
`8e06c542a4508e192f0bd08107c146b422b4bf14fa277aeca8d4cf908d03707d`.
The expected red gate was dirty; the restored green gate was clean.

Additional scoped checks: all 27 tests in `test/senderFraming.test.ts` passed,
and typecheck passed before committing. `git diff --check` passed; the final
`src/` diff from the base is empty, and `git rev-list --count 7fc1acad..HEAD`
is 1. Commit body lines are within 72 columns and the requested co-author
trailer is present; the default worktree author was left unchanged.

## Unmet Criteria

None. Every required gate ran successfully. Nothing required was omitted.

## Residual Risk

- No live Slack workspace or external host upgrade/migration was exercised;
  host-label retention was checked against the authoritative server code,
  and protocol paths were exercised with the local harness.
- Both baseline and final npm ci reported two high-severity dependency
  vulnerabilities. This is a pre-existing dependency warning; dependency
  remediation is outside this documentation/test-only change.
- Existing host-held raw labels are not rewritten by this follow-up; the
  fragment now explains that limitation. No production behavior changed.
