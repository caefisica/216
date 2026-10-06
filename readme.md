# 216

[![CodeQL](https://github.com/caefisica/216/actions/workflows/codeql.yml/badge.svg)](https://github.com/caefisica/216/actions/workflows/codeql.yml)

Library catalogue and loan tracker for the physics undergrad library at UNMSM's
Faculty of Physical Sciences. It is a Next.js app on PostgreSQL, deployed to
Cloudflare Workers. The interface is in Spanish.

Readers browse and search books, favorite them and request loans. Librarians
approve or reject requests and manage the catalogue. Admins also manage user
roles.

> **`bun run dev` can erase your database.** It runs `src/lib/db/sync.ts` before
> it starts Next.js. When the hash of `src/lib/db/schema/*.ts` differs from the
> one stored in the database, sync runs `DROP SCHEMA public CASCADE` against
> `DATABASE_URL`. A database that sync has never touched always differs, so the
> first run wipes every table in `public`. Point `DATABASE_URL` at a database
> you can lose. See [the database page](docs/database.md).

## Get started

You need [Bun](https://bun.sh) 1.4.2 (`mise install` reads it from `mise.toml`)
and an empty PostgreSQL database.

```bash
bun install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`, then start the dev server:

```bash
bun run dev
```

```text
Checking database sync...
Schema changed. Wiping and regenerating...
...
Seeding demo users...
Seeding complete.
Database synchronization complete!
```

Open <http://localhost:3000> and sign in as `admin@unmsm.edu.pe` with the
password `password123`. Demo accounts are listed in
[the database page](docs/database.md#demo-data).

## What you can do

- Search the catalogue by title, author or description, and filter by category
  and status.
- Favorite books and request a loan with a note.
- Approve or reject loan requests as a librarian. An approved request sets a
  14-day due date.
- Create, edit and delete books and upload cover images as a librarian.
- Change user roles and suspend users as an admin.
- Read the activity dashboard: popular books, active users, monthly borrows.
- Sign up and confirm the account with a six-digit code. The server writes the
  code to its log; the app sends no email.

## Configuration

| Variable        | Description                                         |
| --------------- | --------------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string                        |
| `S3_PUBLIC_URL` | Public base URL of the image bucket                 |
| `SEED_PASSWORD` | Password for demo accounts (default: `password123`) |

On Cloudflare the database comes from the `HYPERDRIVE` binding and images go to
the `_216_storage` R2 binding. See [configuration](docs/configuration.md) and
[deployment](docs/deployment.md).

## Documentation

- [Manual](docs/readme.md): database, configuration, deployment, accounts and
  roles, borrowing.
- [Architecture](architecture.md): the code map.
- [Contributing](contributing.md): setup, checks and conventions.
