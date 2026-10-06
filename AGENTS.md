# Agent rules

- Never run `bun run dev` or `bun run db:sync` with a `DATABASE_URL` you did not
  create for the task. Sync runs `DROP SCHEMA public CASCADE`.
- Do not edit `worker-configuration.d.ts`. Regenerate it with `bun run typegen`.
- Wrap every server action in `protectedAction` or `authenticatedAction`.
- Before you finish, run `bunx oxfmt --check .`, `bun run lint` and
  `bun x tsc --noEmit`.
- Format Markdown with `bun run format`.
- Code layout is in `architecture.md`. Behavior is in `docs/`.
