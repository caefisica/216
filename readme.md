# 216

[![CodeQL](https://github.com/caefisica/216/actions/workflows/codeql.yml/badge.svg)](https://github.com/caefisica/216/actions/workflows/codeql.yml)

Library catalogue and loan tracker for the physics undergrad library at UNMSM's
Faculty of Physical Sciences. It is a Next.js app on Cloudflare Workers with a
D1 database and R2 image storage. The interface is in Spanish.

Readers browse and search books, favorite them and request loans. Librarians
approve or reject requests and manage the catalogue. Admins also manage user
roles.

## Get started

You need [Bun](https://bun.sh) 1.4.2 (`mise install` reads it from `mise.toml`).
There is no database to install: local development runs D1 and R2 in the Workers
runtime simulator, and keeps their state in `.wrangler/state`.

```bash
bun install
bun run dev
bun run db:seed
```

`bun run dev` applies the migrations in [`migrations/`](migrations) to the local
database, then starts Next.js. `bun run db:seed` adds three demo accounts and
the librarians' catalogue to that database, and is safe to repeat.

Open <http://localhost:3000> and sign in as `admin@unmsm.edu.pe` with the
password `password123`. Demo accounts are listed in
[the database page](docs/database.md#demo-data). To start over, delete
`.wrangler/state`.

## What you can do

- Search the catalogue by title, author or copy code, and filter by category,
  cabinet, donor and availability.
- Favorite books and request a loan with a note.
- Work the loan desk as a librarian: approve a request by choosing the copy that
  goes out (14-day due date), reject it with a reason the reader sees, mark a
  loan returned, and see overdue loans first.
- Register titles and their physical copies (each with a code for the spine, a
  place, a donor and a condition), edit them and upload cover images as a
  librarian.
- Change user roles and suspend users as an admin.
- Read the activity dashboard: popular books, active users, monthly borrows.
- Sign up and confirm the account with a six-digit code, and reset a password
  with an emailed code. If the email cannot be sent, the signup is not created.

## Configuration

| Name             | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `SEED_PASSWORD`  | Password for demo accounts (default: `password123`)    |
| `MAIL_FROM`      | Sender address for outgoing email, in `wrangler.jsonc` |
| `RESEND_API_KEY` | Resend API key, a Worker secret (`.dev.vars` locally)  |

On Cloudflare the database is the `DB` D1 binding, images are in the
`_216_storage` R2 binding and email goes through the Resend API. The sender is
`onboarding@resend.dev`, which delivers only to the Resend account owner.
Without a key, codes are printed to the server log in development. In
production, sending either email fails until `RESEND_API_KEY` is set. See
[configuration](docs/configuration.md) and [deployment](docs/deployment.md).

## Documentation

- [Manual](docs/readme.md): database, catalogue, configuration, deployment,
  accounts and roles, borrowing.
- [Architecture](docs/architecture.md): the code map.
- [Contributing](contributing.md): setup, checks and conventions.

## Tests

```bash
mise run check   # format, lint, type check and tests
```

The database tests run against a real local D1 database in a temporary
directory. They need no Docker and no server.
