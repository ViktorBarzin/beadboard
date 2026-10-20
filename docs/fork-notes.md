# Fork notes

This repository is a fork of [zenchantlive/beadboard](https://github.com/zenchantlive/beadboard), deployed in the homelab at `beadboard.viktorbarzin.me` (`stacks/beads-server` in the infra repo). This page lists what the fork does differently and what it leaves as upstream has it.

## bd in the image

The image ships `bd`, built from source against musl in the Dockerfile's first stage. `BD_VERSION` there and in `.github/workflows/build.yml` must match the bd version the rest of the homelab runs against the shared beads database; the procedure is `docs/runbooks/beads-bd-upgrade.md` in the infra repo.

## Tests

`npm test` runs the suites listed in the `test` script in `package.json`, plus `skills/beadboard-driver/tests/run-tests.mjs`. GitHub Actions runs it, with bd installed, before every image build, and it is green as of 2026-10-20 (63 suites).

The 69 test files under `tests/` that the `test` script does not list come from upstream and are dormant here: nothing runs them, and the fork does not maintain them, to keep its divergence from upstream small. On 2026-10-20, 30 of them failed when run one by one (two of those, `tests/api/events-route.test.ts` and `tests/lib/watcher.test.ts`, did not finish within 120s). `tests/server/beads-fs.test.ts` also writes to `.beads/archetypes/*.json` and `.beads/templates/*.json` in the working tree when run. Check `git status` after running any of them.

The failing dormant files on 2026-10-20:

- `tests/api/events-route.test.ts`
- `tests/api/projects-route.test.ts`
- `tests/api/swarm/archetypes.test.ts`
- `tests/components/graph/graph-node-liveness.test.ts`
- `tests/components/social/social-card-liveness.test.ts`
- `tests/components/social/social-card.test.tsx`
- `tests/components/swarm/swarm-mission-picker.test.tsx`
- `tests/components/swarm/swarm-workspace.test.tsx`
- `tests/guards/graph-responsive-contract.test.mjs`
- `tests/guards/no-inline-style-in-kanban.test.mjs`
- `tests/guards/ui-foundation-contract.test.mjs`
- `tests/hooks/use-responsive.test.ts`
- `tests/hooks/use-url-state.test.ts`
- `tests/lib/agent-liveness.test.ts`
- `tests/lib/agent-mail.test.ts`
- `tests/lib/agent-registry-bd.test.ts`
- `tests/lib/agent-reservations.test.ts`
- `tests/lib/agent-sessions-liveness.test.ts`
- `tests/lib/agent-takeover.test.ts`
- `tests/lib/coalescer.test.ts`
- `tests/lib/project-context.test.ts`
- `tests/lib/realtime.test.ts`
- `tests/lib/scanner.test.ts`
- `tests/lib/snapshot-differ-stress.test.ts`
- `tests/lib/social-cards.test.ts`
- `tests/lib/swarm-molecules-simple.test.ts`
- `tests/lib/swarm-molecules.test.ts`
- `tests/lib/watcher.test.ts`
- `tests/scripts/bb-init.test.ts`
- `tests/server/beads-fs.test.ts`
