# Agent rules

- `mise run dev` applies migrations to the local D1 database in
  `.wrangler/state` and `mise run db:seed` writes demo data to it. Neither
  touches production. Only `mise run db:migrate:production`, `mise run deploy`
  and the `--remote` forms of `mise run admin:create` and
  `mise run covers:fetch` do.
- `worker-configuration.d.ts` is generated, ignored by git and rewritten by
  `mise run typegen`, `mise run typecheck` and `mise run build`. Do not edit it
  or commit it.
- Wrap every server action that changes data in `staffAction` (catalogue and
  loan mutations), `protectedAction` or `authenticatedAction`. The public reads
  `getBooks` and `getBookById` and the actions in `src/features/auth/actions/`
  are the only exceptions.
- A schema change is a change to `src/lib/db/schema/` plus a migration from
  `mise run db:generate`. Commit both.
- Before you finish, run `mise run check`: lint and format check, type check,
  tests and build.
- Format code and Markdown with `mise run fix`.
- Code layout is in `docs/architecture.md`. Behavior is in `docs/`.
