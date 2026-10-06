# Deployment

216 deploys to Cloudflare Workers through
[OpenNext](https://opennext.js.org/cloudflare). The Worker is `216`, defined in
[`wrangler.jsonc`](../wrangler.jsonc).

## Before the first deploy

1. Create a PostgreSQL database and a Hyperdrive configuration that points at
   it. Put the Hyperdrive `id` in `wrangler.jsonc` under `hyperdrive`.
2. Create an R2 bucket and put its name in `wrangler.jsonc` under `r2_buckets`.
   Keep the binding name `_216_storage`.
3. Make the bucket's objects readable at a public URL.
4. Set `S3_PUBLIC_URL` to that URL as a Worker variable in the Cloudflare
   dashboard. See [configuration](configuration.md).
5. Create the schema in the new database (see
   [Production database](#production-database)).

`DATABASE_URL` is not needed on Cloudflare when the `HYPERDRIVE` binding exists.

## Deploy

```bash
bun run pages:build
bun run deploy
```

`pages:build` runs `next build` and bundles the Worker into `.open-next/`.
`deploy` uploads it with Wrangler, so you must be logged in to Cloudflare
(`bunx wrangler login`).

After `pages:build`, `bun run preview` serves the built Worker locally with a
Wrangler dev server instead of uploading it.

## Production database

Deploying does not touch the database. Neither `pages:build` nor `deploy` runs
sync or migrations.

To create the schema in a new, empty database, run sync with the production
database as `DATABASE_URL`:

```bash
NODE_ENV=production DATABASE_URL=<production url> bun run db:sync
```

With `NODE_ENV=production` the seed adds the categories and no demo accounts or
books. Create the first admin by signing up and then setting that user's `role`
to `admin` in the `user` table.

Sync drops the `public` schema whenever the schema hash changes, so do not run
it again against a database that holds real data. Apply later schema changes
with `bun run db:push`, which does not update the stored hash: never run
`bun run dev` or `bun run db:sync` against that database afterwards. See
[database](database.md).
