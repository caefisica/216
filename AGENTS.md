# Agent rules

- Run `bun run dev` and `bun run db:sync` only with a `DATABASE_URL` you created
  for the task. Sync pushes schema changes with `drizzle-kit push` and seeds the
  database. It applies no statement that loses data, but it does write to it.
- Do not edit `worker-configuration.d.ts`. Regenerate it with `bun run typegen`.
- Wrap every server action in `protectedAction` or `authenticatedAction`.
- Before you finish, run `mise run check`: format check, lint, type check and
  tests. It needs Docker for the test database.
- Format Markdown with `bun run format`.
- Code layout is in `architecture.md`. Behavior is in `docs/`.
