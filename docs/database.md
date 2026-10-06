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

| Stored hashes                    | What sync does                                |
| -------------------------------- | --------------------------------------------- |
| Both match                       | Nothing.                                      |
| Schema hash differs or is absent | **Drops the `public` schema**, then rebuilds. |
| Only the seed hash differs       | Runs the seeds again. Data stays.             |

A schema rebuild is, in order:

1. `DROP SCHEMA public CASCADE`, `CREATE SCHEMA public`.
2. `drizzle-kit push` creates the tables.
3. Both seeds run (see [Seeds](#seeds)).
4. The new hashes are written.

### What this means for your data

- Sync destroys every table, row and view in `public` of the database that
  `DATABASE_URL` names. Nothing is backed up first.
- A database that sync has never run against has no stored hash, so the first
  run wipes it, whatever it held.
- Any byte change to a file in `src/lib/db/schema/`, including a comment,
  changes the hash and wipes the database on the next `bun run dev`.
- Use a local or throwaway database. Never put a production URL in `.env.local`.

This is a real run against a database that held one table, `precious`:

```text
$ DATABASE_URL=postgres://127.0.0.1:54329/t bun src/lib/db/sync.ts
Checking database sync...
Schema changed. Wiping and regenerating...
...
[✓] Changes applied
Starting seeds...
Seeding categories...
Seeding demo users...
Seeding complete.
Database synchronization complete!

$ psql -d t -c "select count(*) from precious"
ERROR:  relation "precious" does not exist

$ DATABASE_URL=postgres://127.0.0.1:54329/t bun src/lib/db/sync.ts
Checking database sync...
Database is up to date (hash matches).
```

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
2. Run `bun run dev`. Sync wipes the local database and rebuilds it.

Other scripts:

| Command               | Does                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| `bun run db:sync`     | Sync only, without starting Next.js.                                             |
| `bun run db:push`     | `drizzle-kit push`: apply the schema without wiping. Leaves the stored hash old. |
| `bun run db:generate` | `drizzle-kit generate`: write SQL into `src/db/migrations`.                      |

`db:push` changes the tables but not the hash in `schema_integrity`. After you
edit a schema file and push it, the stored hash still describes the old schema,
so the next `bun run dev` or `bun run db:sync` against that database sees a
changed schema and drops `public`. Use `db:push` only on a database you never
run sync against, such as production.

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
