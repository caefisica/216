# Deployment

216 deploys to Cloudflare Workers through
[OpenNext](https://opennext.js.org/cloudflare). The Worker is `216`, defined in
[`wrangler.jsonc`](../wrangler.jsonc). Production is
<https://216.caefisica.workers.dev>.

## Deploy

Log in once with `bunx wrangler login`, then:

```bash
bun run deploy
```

It applies pending migrations to the production D1 database, builds the Worker
into `.open-next/` and uploads it. Migrations run first, so a migration that
fails stops the deploy before any new code is live. Write migrations that work
with the previous version of the code as well, because the two run side by side
for a moment.

`bun run pages:build` builds without uploading. After it, `bun run preview`
serves the built Worker locally, with local D1 and R2.

## Before the first deploy in a new account

1. Create the database: `bunx wrangler d1 create 216`. Put the returned
   `database_id` in `wrangler.jsonc` under `d1_databases`.
2. Create the bucket: `bunx wrangler r2 bucket create 216-storage`. Keep the
   binding name `_216_storage`.
3. Run `bun run deploy`. Migrations create the tables and the book categories.

There are no secrets to set. The images need no public bucket URL, because the
Worker serves them.

## Email

Verification and password reset emails go through the `EMAIL` binding
([Cloudflare Email Service](https://developers.cloudflare.com/email-service/)).
It sends only from a domain that is on Cloudflare DNS and onboarded for sending.
Until one is set up, `MAIL_FROM` stays empty and sign-up and password reset fail
in production with a clear error, and the sign-up leaves no account behind.

To enable email:

1. Add a domain to Cloudflare, or use one already there.
2. Onboard a sending subdomain for it in the dashboard under Email Service, or
   with `cf email-sending subdomains create`.
3. Set `MAIL_FROM` in `wrangler.jsonc`, such as
   `216 <no-reply@mail.example.com>`, and deploy again.

Without email nobody can sign up, so create the first admin by hand (see below).

## First admin

Sign up once email works, then promote that account:

```bash
bunx wrangler d1 execute DB --remote \
  --command "UPDATE user SET role = 'admin' WHERE email = 'you@example.com'"
```

## Production database

Deploying applies migrations and nothing else. The demo seed never runs in
production. To look at the data:

```bash
bunx wrangler d1 execute DB --remote --command "SELECT count(*) FROM books"
```

D1 Time Travel restores the database to any minute of the last 7 days (30 on the
paid plan) with
`bunx wrangler d1 time-travel restore DB --timestamp=<unix time>`. Export a copy
before a migration that recreates a table:

```bash
bunx wrangler d1 export DB --remote --output backup.sql
```

See [database](database.md) for how to write a migration.
