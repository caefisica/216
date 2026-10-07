# Database

216 stores everything in PostgreSQL through Drizzle. The schema is defined in
`src/lib/db/schema/` and loaded into the database by
[`sync.ts`](../src/lib/db/sync.ts).

## Sync

`bun run dev` runs `bun run db:sync` and then `next dev`. `db:sync` reads
`.env.local`, so `DATABASE_URL` must be set there. It runs on every start, not
only the first.

Sync hashes every `.ts` file directly in `src/lib/db/schema/` and in
`src/lib/db/seeds/` with SHA-256 and compares the result with the row it stored
in the `schema_integrity` table last time.

| Stored hashes                    | What sync does                              |
| -------------------------------- | ------------------------------------------- |
| Both match                       | Nothing.                                    |
| Schema hash differs or is absent | Pushes the schema, then runs the seeds.     |
| Only the seed hash differs       | Runs the seeds again. Tables and rows stay. |

A schema change is applied in place, in order:

1. `drizzle-kit push` runs without a terminal and without `--force`. It never
   prompts, so it applies no statement that would lose data, such as dropping a
   column or a table.
2. Sync runs `drizzle-kit push` once more and checks that it reports no changes.
   If it does not, sync stops (see below).
3. Both seeds run (see [Seeds](#seeds)).
4. The new hashes are written.

### What this means for your data

- Adding a table or a column is applied and keeps your rows. Seeds only insert
  (see [Seeds](#seeds)).
- A change that would delete data is not applied. Sync prints what drizzle-kit
  says it would lose, seeds nothing, writes no hash and exits with status 1. To
  go on, revert the schema change, or back up what you need and drop the
  database yourself. No command does that for you.
- A database that sync has never run against has no stored hash, so the first
  run pushes the whole schema. It works on an empty database. If the database
  already holds tables the schema does not have, drizzle-kit asks whether each
  new table is a rename of one of them, which it cannot ask without a terminal,
  so sync stops. Use an empty database.
- Tables that the schema does not manage are left alone once the schema exists.
- Any byte change to a file in `src/lib/db/schema/`, including a comment,
  changes the hash and runs a push. A push with nothing to change is harmless.
- Use a local or throwaway database all the same. Never put a production URL in
  `.env.local`.

This is a real run against an empty database, then a second run:

```text
$ DATABASE_URL=postgres://localhost:55432/docs_sample bun src/lib/db/sync.ts
Checking database sync...
Schema changed. Pushing it to the existing database...
Seeding...
Starting seeds...
Seeding categories...
Seeding demo users...
Seeding complete.
Database synchronization complete!

$ DATABASE_URL=postgres://localhost:55432/docs_sample bun src/lib/db/sync.ts
Checking database sync...
Database is up to date (hash matches).
```

And this is a run after `ALTER TABLE "user" ADD COLUMN scratch int` with data in
the column, which the schema does not have. Output between the lines is
shortened:

```text
Checking database sync...
Schema changed. Pushing it to the existing database...
 Warning  Found data-loss statements:
· You're about to delete scratch column in user table with 3 items

THIS ACTION WILL CAUSE DATA LOSS AND CANNOT BE REVERTED
...
The schema was not applied, so nothing was seeded or recorded.
If the change would lose data, back up what you need and drop the database, or revert the schema change.
```

The column and its values are still there afterwards.

## Seeds

[`seeds/index.ts`](../src/lib/db/seeds/index.ts) runs two seeds.

- **Bootstrap** ([`bootstrap.ts`](../src/lib/db/seeds/bootstrap.ts)) inserts
  seven book categories. It always runs.
- **Demo** ([`demo.ts`](../src/lib/db/seeds/demo.ts)) inserts three accounts and
  two books. It is skipped when `NODE_ENV` is `production`.

Every insert uses `ON CONFLICT DO NOTHING`. Re-running a seed does not update
rows that exist. Changing `SEED_PASSWORD` does not change the password of an
account that already exists, and it does not trigger a re-seed on its own.

### Demo data

| Email                    | Role      |
| ------------------------ | --------- |
| `admin@unmsm.edu.pe`     | admin     |
| `librarian@unmsm.edu.pe` | librarian |
| `student@unmsm.edu.pe`   | user      |

All three share one password: `SEED_PASSWORD`, or `password123` when it is
unset. The accounts are created already email-verified. The demo books are
_Principles of Quantum Mechanics_ and _Cosmos_.

## Changing the schema

1. Edit a file in `src/lib/db/schema/`. Export new tables from
   `schema/index.ts`.
2. Run `bun run dev`. Sync pushes the change to your local database and keeps
   its rows. If the change would delete data, sync stops and tells you; see
   [What this means for your data](#what-this-means-for-your-data).

Other scripts:

| Command               | Does                                                                  |
| --------------------- | --------------------------------------------------------------------- |
| `bun run db:sync`     | Sync only, without starting Next.js.                                  |
| `bun run db:push`     | `drizzle-kit push`: apply the schema. Asks before a data-losing step. |
| `bun run db:generate` | `drizzle-kit generate`: write SQL into `src/db/migrations`.           |

`db:push` changes the tables but not the hashes in `schema_integrity`. The next
sync sees the changed schema, finds nothing left to push and records the new
hashes.

`db:push` and `db:generate` read `DATABASE_URL` through
[`drizzle.config.ts`](../drizzle.config.ts). No script applies the generated
migrations.

## Tables

| Table                                                   | Holds                           |
| ------------------------------------------------------- | ------------------------------- |
| `user`, `session`                                       | Accounts and sign-in sessions.  |
| `email_verification_request`, `password_reset_session`  | One-time codes.                 |
| `books`, `categories`, `book_categories`, `book_images` | The catalogue.                  |
| `user_book_hearts`                                      | Favorites.                      |
| `borrow_requests`                                       | Loan requests and their status. |
| `donors`, `donations`                                   | The donors page.                |
| `schema_integrity`                                      | The two hashes sync compares.   |
