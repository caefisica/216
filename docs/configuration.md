# Configuration

The app reads no environment variables at runtime. Everything it needs is a
Cloudflare binding, a variable in [`wrangler.jsonc`](../wrangler.jsonc) or a
Worker secret. Local-only settings go in `.env.local`, copied from
[`.env.example`](../.env.example), and local secrets in `.dev.vars`, copied from
[`.dev.vars.example`](../.dev.vars.example).

## Variables and secrets

| Name             | Where                      | Read by                            | Purpose                                                                                                                 |
| ---------------- | -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `MAIL_FROM`      | `vars` in `wrangler.jsonc` | `src/features/auth/core/mailer.ts` | Sender of verification and password reset emails. `onboarding@resend.dev`, which reaches only the Resend account owner. |
| `RESEND_API_KEY` | Worker secret, `.dev.vars` | `src/features/auth/core/mailer.ts` | Resend API key. Optional in development, where codes are logged.                                                        |
| `SEED_PASSWORD`  | environment of `db:seed`   | `src/lib/db/seeds/demo.ts`         | Password of the demo accounts. Default `password123`. Optional.                                                         |
| `NODE_ENV`       | set by Next.js             | cookies, mailer                    | `production` marks cookies `Secure` and makes a missing mail setting an error.                                          |

See [Email](auth.md#email).

## Cloudflare bindings

| Binding                 | Type      | Used for                                                         |
| ----------------------- | --------- | ---------------------------------------------------------------- |
| `DB`                    | D1        | The database. Database `216`, migrations in `migrations/`.       |
| `_216_storage`          | R2 bucket | Book images. Bucket `216-storage`, served by the `/media` route. |
| `ASSETS`                | Assets    | Static files from `.open-next/assets`.                           |
| `WORKER_SELF_REFERENCE` | Service   | The Worker calling itself, used by OpenNext.                     |

The D1 `database_id` and the R2 `bucket_name` in `wrangler.jsonc` belong to the
production Cloudflare account. To run your own copy, replace them with resources
from your account. See [deployment](deployment.md).

`bun run dev` and `bun run preview` simulate all of these locally and keep their
state in `.wrangler/state`. Email is not simulated: without `RESEND_API_KEY` in
`.dev.vars` the mailer logs the message, and with it the mailer calls Resend.
[`src/lib/storage.ts`](../src/lib/storage.ts) and
[`src/lib/db/index.ts`](../src/lib/db/index.ts) read the bindings through
`getCloudflareContext()`.

## Images

Uploads go to R2 under `temp/` or `book-images/`. The database stores the path
`/media/<key>`, and [`src/app/media/`](../src/app/media/%5B...key%5D/route.ts)
serves it from the bucket with the stored content type, a one-year immutable
cache and headers that stop the browser from running an upload as a page.
`images.unoptimized` is set in `next.config.ts`, because the Next.js image
optimizer needs an image binding this app does not configure.

## Runtime version

`compatibility_date` in `wrangler.jsonc` selects the Workers runtime behavior.
It must not be later than the `workerd` release bundled by `wrangler`, or
`wrangler` refuses to start. When you upgrade `wrangler`, move the date forward
to that release date and run `mise run check` and `bun run preview`. The
`nodejs_compat` flag provides the Node.js APIs that Next.js needs.

After you change `wrangler.jsonc`, run `bun run typegen` to regenerate
`worker-configuration.d.ts`. Git ignores that file, so a lint or check run never
changes tracked files, and `mise run check` deletes it as its last step. Run
`bun run typegen` or `bun install` to get it back for your editor.
