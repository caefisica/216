# 216

[![CodeQL](https://github.com/caefisica/216/actions/workflows/codeql.yml/badge.svg)](https://github.com/caefisica/216/actions/workflows/codeql.yml)

Library catalogue and loan tracker for the physics undergrad library at UNMSM's
Faculty of Physical Sciences. It is a Next.js app on PostgreSQL, deployed to
Cloudflare Workers. The interface is in Spanish.

Readers browse and search books, favorite them and request loans. Librarians
approve or reject requests and manage the catalogue. Admins also manage user
roles.

> **`bun run dev` writes to your database.** It runs `src/lib/db/sync.ts` before
> it starts Next.js, which pushes schema changes to `DATABASE_URL` and seeds it.
> It applies no statement that loses data. Point `DATABASE_URL` at a database
> you can lose anyway. See [the database page](docs/database.md).

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

`bun run dev` first syncs the database. It pushes the schema with
`drizzle-kit push` without a terminal, so it never prompts and never applies a
statement that loses data. It seeds only after the push has been applied. If a
schema change would lose data, the sync prints what would be lost, seeds nothing
and exits with an error.

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
- Sign up and confirm the account with a six-digit code, and reset a password
  with an emailed code. If the email cannot be sent, the signup is not created.

## Configuration

| Variable         | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string                            |
| `S3_PUBLIC_URL`  | Public base URL of the image bucket                     |
| `SEED_PASSWORD`  | Password for demo accounts (default: `password123`)     |
| `RESEND_API_KEY` | [Resend](https://resend.com) API key for outgoing email |
| `MAIL_FROM`      | Sender address for outgoing email                       |

Without `RESEND_API_KEY` and `MAIL_FROM`, codes are printed to the server log in
development. In production, sending either email fails until both are set.

On Cloudflare the database comes from the `HYPERDRIVE` binding and images go to
the `_216_storage` R2 binding. See [configuration](docs/configuration.md) and
[deployment](docs/deployment.md).

## Documentation

- [Manual](docs/readme.md): database, configuration, deployment, accounts and
  roles, borrowing.
- [Architecture](architecture.md): the code map.
- [Contributing](contributing.md): setup, checks and conventions.

## Tests

```bash
mise run check   # format, lint, type check and tests
```

The tests create throwaway databases on the Postgres server named by
`TEST_DATABASE_URL`. `mise run check` starts one in Docker on port 55432; stop
it with `mise run test-db-stop`.
