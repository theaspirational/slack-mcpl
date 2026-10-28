TASK-E40F7: build upstream PR 3 (disabled-tool controls) for anima-research/slack-mcpl.

Rules:
- Local commits only. No push, no PR, no GitHub comment. Public-safe text, with no agent, host or private names.
- `NO_UPDATE_NOTIFIER=1` and `npm_config_update_notifier=false` from the first command.
- `npm ci --ignore-scripts --registry=https://registry.npmjs.org` with two distinct empty npm user/global config files outside the repo; audit/fund off.
- Node 22.23.3 on PATH. Node 24.22.1 goes in scratch outside the repo, checked against the official SHASUMS256.txt.
- A loopback-only guard is in force for test servers: `NODE_OPTIONS=--require=<guard>`, rejecting listeners not bound to 127.0.0.1/::1.
- Wrap every suite in `orgasmic dispatch gate <name> -- timeout 900 …`.

Start commit: current upstream main. Fetch it read-only. It was `d3e4f7c9d2e4753f276232f07a4f7eb02dae5e34`; if it moved, use the new head and say so.

Inputs (read-only):
- The fork plan `docs/FORK-VS-UPSTREAM.md` on branch `task-nnewz-r2` (`a2295638`): the disabled-tools row and order 3.
- Its review's M1: the fork's extraction adds its own `src/configuration.ts` parser that throws (`Fatal error` with stack). Rebuild it inside upstream's `startupSettings`, so a bad value gives the same clean refusal other settings give, naming the bad value.
- The review also said the `src/index.ts` wiring is untested, and that one sibling area should be folded in. Read the document and follow what it says, and report how you interpreted it.
- The fork implementation is on fork main `685b2deb` (theaspirational/slack-mcpl). Use it as the reference for behaviour, not as code to copy blindly.

Step 0 (report before coding, in the report only):
- Exact fork behaviour: env var name(s), syntax, which tools can be disabled, what the model sees (the tool absent, or a refusal), and the interaction with explicit/required tools.
- How upstream's `startupSettings` validates and refuses today, with file:line.
- The smallest upstream shape that matches the fork's behaviour.
- If the fork behaviour can't be expressed cleanly in startupSettings, or the change would exceed about 250 net production lines or 4 production files, STOP and report the options instead of building.

Build:
- One commit on upstream main, only the files needed.
- Tests in `test/config.test.ts` (parsing and refusal) and `test/operatorControls.test.ts` (end to end: the disabled tool isn't offered or callable, and the others are unchanged), plus a test that covers the `src/index.ts` wiring.
- Never nest two mocks of the same property in one TestContext; the one-process runner leaks them.
- `changelog.d/` fragment per changelog.d/README.md and CONTRIBUTING.md, plus a README row.
- Commit title plain and descriptive, body wrapped at 72, trailer `Co-Authored-By: GPT-6-Astra <noreply@openai.com>`. Default author; it gets re-authored at push.

Evidence:
- Red/green: the new tests fail on upstream main and pass with the change.
- One mutation of your own that goes red.
- Fresh gates at the final commit: npm ci, typecheck, build, full suite on Node 22.23.3 and 24.22.1, with counts vs the upstream baseline.
- Release-changelog dry fold in scratch; changelog CI regex check.

Report: Step 0, final sha, diff stat, fragment verbatim, gates, a PR body draft (plain markdown, public-safe), unmet items and residual risk.