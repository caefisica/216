# Contributing

## Set up

Follow [Get started](../readme.md#get-started). Read
[architecture](../docs/architecture.md) for where code lives.

## Checks

CI ([`ci.yml`](workflows/ci.yml)) runs the full project check on every pull
request into `master`, every push to `master` and manual workflow runs. Run it
before you push:

```bash
mise run check
```

`mise run check` runs the format check, lint, the type check and the tests. The
database tests start a real local D1 database in a temporary directory and apply
the migrations to it, so they need no server and no Docker.

`bun run format` also formats the Markdown in this repository: 80 columns, prose
wrapped (see [`oxfmt.config.ts`](../oxfmt.config.ts)).

`bun run knip` reports unused files, exports and dependencies. CI does not run
it.

Tests are `*.test.ts` files next to the code, run by Vitest. Add one that fails
without your change. Run the app too, and describe what you did in the pull
request.

## Conventions

The rules for server actions, schema changes and generated files are in
[`AGENTS.md`](../AGENTS.md) and apply to every contributor. Besides them:

- Source and identifiers are English. User-facing text is Spanish.
- Import from `src/` with the `@/` alias.
- A server action goes in `src/features/<feature>/actions.ts`, with a Zod schema
  for the input. The sign-in actions are one file each in
  `src/features/auth/actions/`.
- Export a new table from `src/lib/db/schema/index.ts`.
- `src/components/ui/` holds the design system. Check the existing primitive
  before writing a new style; [design](../docs/design.md) describes them.

## Pull requests

Open pull requests against `master`. Keep one change per pull request, and
update the page in [`docs/`](../docs/readme.md) that describes the behavior you
change.
