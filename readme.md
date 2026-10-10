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

- Search the catalogue by title, author or copy code, filter by category and
  availability, and see on the result whether a book is available. Titles
  without a stored image receive a generated typographic cover.
- Favorite books and request a loan with a note. "Mis libros" shows the
  requests, loans and favorites of a reader.
- Work the loan desk as a librarian, mostly from the keyboard: approve a request
  with the copy that goes out (14-day due date), reject it with a reason the
  reader sees, mark a loan returned (with an undo), and see overdue loans first.
- Register titles and their physical copies (each with a code for the spine, a
  place, a donor and a condition), edit them and upload cover images as a
  librarian.
- Complete missing cover matches from Open Library with `bun run covers:fetch`.
- Manage locations and donors as a librarian, and change user roles (which
  includes suspending) as an admin, under Ajustes.
- Sign up and confirm the account with a six-digit code, and reset a password
  with an emailed code. If the email cannot be sent, the signup is not created.

## Documentation

- [Manual](docs/readme.md): database, catalogue, configuration, deployment,
  accounts and roles, borrowing.
- [Architecture](docs/architecture.md): the code map.
- [Design](docs/design.md): the public interface system and cover pipeline.
- [Contributing](.github/contributing.md): setup, checks and conventions.
