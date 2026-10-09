# Agent rules

- `bun run dev` applies migrations to the local D1 database in `.wrangler/state`
  and `bun run db:seed` writes demo data to it. Neither touches production. Only
  `bun run db:migrate:production` and `bun run deploy` do.
- `worker-configuration.d.ts` is generated, ignored by git and rewritten by
  `bun install` and `bun run lint`; `mise run check` deletes it when it
  finishes. Do not edit it or commit it.
- Wrap every server action in `staffAction` (catalogue and loan mutations),
  `protectedAction` or `authenticatedAction`.
- A schema change is a change to `src/lib/db/schema/` plus a migration from
  `bun run db:generate`. Commit both.
- Before you finish, run `mise run check`: format check, lint, type check and
  tests.
- Format Markdown with `bun run format`.
- Code layout is in `docs/architecture.md`. Behavior is in `docs/`.
