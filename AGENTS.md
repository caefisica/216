# Agent rules

- `bun run dev` applies migrations to the local D1 database in `.wrangler/state`
  and `bun run db:seed` writes demo data to it. Neither touches production. Only
  `bun run db:migrate:production`, `bun run deploy` and the `--remote` forms of
  `bun run admin:create` and `bun run covers:fetch` do.
- `worker-configuration.d.ts` is generated, ignored by git and rewritten by
  `bun run typegen`, `bun run typecheck` and `bun run build`. Do not edit it or
  commit it.
- Wrap every server action that changes data in `staffAction` (catalogue and
  loan mutations), `protectedAction` or `authenticatedAction`. The public reads
  `getBooks` and `getBookById` and the actions in `src/features/auth/actions/`
  are the only exceptions.
- A schema change is a change to `src/lib/db/schema/` plus a migration from
  `bun run db:generate`. Commit both.
- Before you finish, run `bun run check`: lint and format check, type check,
  tests and build.
- Format code and Markdown with `bun run fix`.
- Code layout is in `docs/architecture.md`. Behavior is in `docs/`.
