# Agent rules

- `bun run dev` applies migrations to the local D1 database in `.wrangler/state`
  and `bun run db:seed` writes demo data to it. Neither touches production. Only
  `bun run db:migrate:production` and `bun run deploy` do.
- Do not edit `worker-configuration.d.ts`. Regenerate it with `bun run typegen`.
- Wrap every server action in `protectedAction` or `authenticatedAction`.
- A schema change is a change to `src/lib/db/schema/` plus a migration from
  `bun run db:generate`. Commit both.
- Before you finish, run `mise run check`: format check, lint, type check and
  tests.
- Format Markdown with `bun run format`.
- Code layout is in `architecture.md`. Behavior is in `docs/`.
