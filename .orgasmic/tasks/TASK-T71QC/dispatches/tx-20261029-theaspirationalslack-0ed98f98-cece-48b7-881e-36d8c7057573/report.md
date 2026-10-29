# Changed

- Amended SHA: `ccbbb766614b3c612887d79060c75fc125c9ebcc`. Exactly ONE commit directly on `f6e628352013751a8d89b76f93486ff4ac2931fe`, retaining `Co-Authored-By: GPT-6-Astra`.
- Round-two diff against reviewed `9592c649e55ba22f08d30765613be653b57fa206`:

```text
test/groupDmAccess.test.ts | 8 ++++++++
 1 file changed, 8 insertions(+)
```

- Added one direct unit row, `group write pin is enforced directly by the policy`, in `test/groupDmAccess.test.ts:60`. With `writeChannels: []`, readability succeeds but `policy.requireWritable('G1', group(), scopes, 'chat:write')` throws `/not allowed by the Slack access policy/`. No adapter participates.
- No production code changed. `git diff 9592c649..HEAD -- src` is empty. Worktree clean; `git diff --check` passes.
- Refetched upstream main: still `7274283fa719a17328ef8e085336ce25f6f22b08`, unchanged.
- Updated the public PR body below with all four requested clarifications: MPIM membership verification before activation, the base count, listing lookup cost, and omit-versus-undefined behavior.
- No push, PR, GitHub comment, merge or main-checkout edit.

# Verification Gates

All checks freshly run this round via `timeout 900 orgasmic dispatch gate <name> -- <command>`; no prior gate pass was assumed or reused. Final checks ran at `ccbbb766614b3c612887d79060c75fc125c9ebcc`, with a clean tree at start/end. The installation and pre-fix M6 probe ran at reviewed `9592c649` before amendment.

- Notifiers off from the first command. `npm ci --ignore-scripts` used distinct empty user/global configs and installed 51 packages; lockfile unchanged.
- Loopback-only listener guard remained loaded through `NODE_OPTIONS`. `env.sh` and `loopback.cjs` copies are in this evidence directory.
- `r2-typecheck-*`: `npm run typecheck`, PASS on 22.23.3, 24.22.1 and 22.12.0.
- `r2-suite-*`: `npm test`, **695 pass / 0 fail** on each of those three versions.
- `r2-group-repeat-*`: `node --import tsx --test --experimental-test-isolation=none test/groupDmAccess.test.ts`, **23 pass / 0 fail**, five runs on 22.23.3.
- `r2-m6-before`: `python3 "$ORGASMIC_EVIDENCE_DIR/m6-probe.py" 0`; exact reviewer M6 exemption (`kind !== 'dm' && kind !== 'group_dm' && !this.writeChannels.has(channelId)`) survives the original group tests: **22 pass / 0 fail**.
- `r2-m6-killed`: same script with argument `1`; mutated run is **22 pass / 1 fail**, exactly the new direct row, with `Missing expected exception`. The gate harness passes only when that expected mutation failure is observed. The production source is restored byte-for-byte in `finally`; no mutation is committed.
- `r2-base-suite`: `bash -c 'cd dist/r2-baseline && npm test'`, **672 pass / 0 fail** on 22.23.3. Fresh base archive from `f6e62835`, ignored under the worktree's `dist/`, sharing the installed dependency directory; base/current lockfiles match. No build/cache stored in evidence.
- Exact commands and ownership: `final-gates.sh`, `final-gates-owner.log`, `m6-probe.py`, `m6-before-owner.log`, `install-owner.log`.

Logs below are relative to this report's evidence directory.

| Gate | Result | Log |
|---|---|---|
| `r2-install` | PASS | `gate-r2-install-01M63ZZFRFT0X73TW3QTJ6P5RA.log` |
| `r2-m6-before` | PASS | `gate-r2-m6-before-01M64018VSSWTSX8KB624C9NCJ.log` |
| `r2-m6-killed` | PASS | `gate-r2-m6-killed-01M6402R24VPB9S33S43E04Z90.log` |
| `r2-base-suite` | PASS | `gate-r2-base-suite-01M6402VB1BZ6DT6RTN9S241HK.log` |
| `r2-typecheck-22.23.3` | PASS | `gate-r2-typecheck-22.23.3-01M64039VMBPEJJNX636B7M3G1.log` |
| `r2-suite-22.23.3` | PASS | `gate-r2-suite-22.23.3-01M6403A3H9Z6NFSPDWX1CARRD.log` |
| `r2-typecheck-24.22.1` | PASS | `gate-r2-typecheck-24.22.1-01M6403RBGW6BBRB9C590XKYV4.log` |
| `r2-suite-24.22.1` | PASS | `gate-r2-suite-24.22.1-01M6403RKQ5P9GHWMME4ZK6YBZ.log` |
| `r2-typecheck-22.12.0` | PASS | `gate-r2-typecheck-22.12.0-01M64046TVC6544XAFNCXJ3J8P.log` |
| `r2-suite-22.12.0` | PASS | `gate-r2-suite-22.12.0-01M640472SXKCSE0PDZ3NRFVKZ.log` |
| `r2-group-repeat-1` | PASS | `gate-r2-group-repeat-1-01M6404P0C4AHBAKYJVG8GCYJ4.log` |
| `r2-group-repeat-2` | PASS | `gate-r2-group-repeat-2-01M6404S69H5DD2N2KS07GYZ57.log` |
| `r2-group-repeat-3` | PASS | `gate-r2-group-repeat-3-01M6404WC29QQHKFFWG6ASAFY3.log` |
| `r2-group-repeat-4` | PASS | `gate-r2-group-repeat-4-01M6404ZHYV9ZPWF4EHMW8ZXN1.log` |
| `r2-group-repeat-5` | PASS | `gate-r2-group-repeat-5-01M64052QN2D1QAXPSV22B3KD3.log` |

## Inherited evidence and unchanged scope

- Reviewed the relevant findings in `/home/orgasmic/.orgasmic/runs/run-01M63YT2KV47RM7M28VNN7BB6S/evidence/report.md`. Its M6 source edit matches current `requireWritable`; survival was reproduced on the original group tests, then killed after adding the direct row. Its 672-test base count was freshly reproduced rather than merely copied.
- Round-one implementation report: `/home/orgasmic/.orgasmic/runs/run-01M63Y0S24ZECY2XWTDG35C40M/evidence/report.md`. The legacy A/B artifacts (`legacy-baseline.json`, `legacy-current.json`) and six mutation probes remain applicable supporting evidence because production sources, dependencies and existing test assertions are unchanged; this round only adds one test. They are not represented as newly run gates.
- The reviewer’s broader legacy/policy-without-groupDms A/B findings remain corroborating historical evidence, not a replacement for this round’s fresh checks.
- The earlier manager-approved shared upload/delete write-guard effect is unchanged. File/attachment read paths remain untouched.

# Unmet Criteria

None for this polish round. Live MPIM membership confirmation is deliberately deferred to activation, as requested; no production admission logic was changed.

# Residual Risk

MPIM `conversations.info` may omit `is_member`; admission then fails closed. No live-workspace check has established this field or live mpim scope behavior. The activation PR must confirm membership or select another signal. Listing cost scales with all listed MPIMs, not only named ones. Explicit `groupDms: undefined` is refused; callers must omit the key. These caveats are now stated in the public PR body.

# PR body

## Problem

The dormant explicit access policy rejects group DMs even when an operator deliberately names them.

## Changes

- Add a strict optional `groupDms` list of exact G-prefixed conversation IDs, with fresh membership and mpim scope checks for listing, reads and writes, independently of `readJoinedChannels`.
- Require a separate exact write-channel pin and the operation's scope for writes. A direct policy unit test now verifies the write pin independently of the adapter and kills the mutation that exempts group DMs from it.
- Add policy-only group-DM labels with existing framing protections; preserve legacy behavior.
- Named group DMs are writable for uploads and deletes through the same guard; upload/delete implementations and file/attachment readers are unchanged.
- Remain dormant: no setter, setting or environment variable enables this policy. Unsupported history-membership fallback input remains refused, including overlapping IDs.

Callers must omit the `groupDms` key when unused, not pass `groupDms: undefined`.

With a non-empty `groupDms` list and `mpim:read`, listing requests mpim and costs one `conversations.info` per listed mpim, including unnamed ones.

## Tests

- Base `f6e62835`: 672 pass / 0 fail; this change: 695 pass / 0 fail (+23 tests, no additional failures).
- Typecheck and full suite pass on Node 22.23.3, 24.22.1 and 22.12.0.
- All 23 group tests pass five consecutive runs.
- The write-pin exemption mutation previously survived the group tests; it now fails exactly the new direct policy row. Earlier coverage also catches six admission/scope/label mutations.
- Real server upload/rollback and hostile-label coverage; baseline/current legacy payload and write-request bytes match, excluding generated checkpoint UUIDs.

## Before activation

Admission requires `conversations.info` to return `is_member === true`. This is unverified for MPIMs against a live workspace and fails closed: absent or false membership refuses admission. The activation PR must confirm this signal against a live workspace or choose another membership signal before enabling the policy.

## Out of scope

Policy activation, history-membership fallback support, directory confinement, and file/attachment reads. No live Slack workspace testing was performed.

## Companion PRs

Depends on #56; merge #56 first. This remains dormant after merging.

AI-assisted implementation with GPT-6-Astra.
