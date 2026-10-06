# Configuration

Local settings live in `.env.local`, copied from
[`.env.example`](../.env.example). Cloudflare settings live in
[`wrangler.jsonc`](../wrangler.jsonc) and the dashboard.

## Environment variables

| Variable        | Required   | Read by                                               | Purpose                                                        |
| --------------- | ---------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`  | locally    | `src/lib/db/index.ts`, `sync.ts`, `drizzle.config.ts` | PostgreSQL connection string. Fallback when no Hyperdrive.     |
| `S3_PUBLIC_URL` | for images | `src/features/books/service.ts`, `actions/editor.ts`  | Public base URL of the image bucket, without a trailing slash. |
| `SEED_PASSWORD` | no         | `src/lib/db/seeds/demo.ts`                            | Password of the demo accounts. Default `password123`.          |
| `NODE_ENV`      | no         | seeds, cookies                                        | `production` skips the demo seed and marks cookies `Secure`.   |

`S3_PUBLIC_URL` is prepended to the object key to form the stored image URL:
uploading `book-images/<uuid>-cover.jpg` stores
`<S3_PUBLIC_URL>/book-images/<uuid>-cover.jpg`. If it is unset, the stored URL
starts with the literal text `undefined`. `wrangler.jsonc` defines no `vars`, so
on Cloudflare set `S3_PUBLIC_URL` as a Worker variable in the dashboard.

## Database connection

[`src/lib/db/index.ts`](../src/lib/db/index.ts) picks the connection string in
this order:

1. The `HYPERDRIVE` binding's `connectionString`, when the code runs on
   Cloudflare.
2. `DATABASE_URL`.

When neither exists it throws. In production set up the `HYPERDRIVE` binding;
`DATABASE_URL` is the local and script fallback. `sync.ts` and `drizzle-kit`
always use `DATABASE_URL`, never Hyperdrive.

## Cloudflare bindings

| Binding                 | Type       | Used for                                              |
| ----------------------- | ---------- | ----------------------------------------------------- |
| `HYPERDRIVE`            | Hyperdrive | Database connections from the Worker.                 |
| `_216_storage`          | R2 bucket  | Book image uploads and deletes. Bucket `216-storage`. |
| `ASSETS`                | Assets     | Static files from `.open-next/assets`.                |
| `WORKER_SELF_REFERENCE` | Service    | The Worker calling itself, used by OpenNext.          |

The Hyperdrive `id` and the R2 `bucket_name` in `wrangler.jsonc` belong to the
production Cloudflare account. To run your own copy, replace them with resources
from your account.

[`src/lib/storage.ts`](../src/lib/storage.ts) reads `_216_storage` through
`getCloudflareContext()`. `next.config.ts` does not initialize the Cloudflare
context for `next dev`, so image upload and delete throw there. After
`bun run pages:build`, `bun run preview` runs the built app in the Workers
runtime, where the bindings are defined.

After you change `wrangler.jsonc`, run `bun run typegen` to regenerate
`worker-configuration.d.ts`.
