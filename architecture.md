# Architecture

216 is a Next.js App Router application. Pages render on the server, and the
browser calls server actions for every mutation. There is no REST API and no
`src/app/api` directory. PostgreSQL holds the data and Cloudflare R2 holds the
images.

```text
browser
  └─ src/app/**                 routes: server pages + client components
       └─ src/features/<f>/actions.ts      "use server": validate, authorize
            └─ service.ts                  rules that span several queries
                 └─ repository.ts          Drizzle queries
                      └─ src/lib/db/index.ts   connection
```

## Layers

Each feature in `src/features/` follows the same shape. Not every feature has
every layer: `donors` has only actions and a repository, and `auth` queries
through `getDb()` in `core/` and has no repository.

| File            | Responsibility                                                   |
| --------------- | ---------------------------------------------------------------- |
| `actions.ts`    | Server actions. Parse input with Zod, check the role, call down. |
| `service.ts`    | Logic that is more than one query, and cache revalidation.       |
| `repository.ts` | Drizzle queries for the feature.                                 |
| `schemas.ts`    | Zod schemas for action input.                                    |
| `types.ts`      | Types shared with components.                                    |
| `components/`   | Client components that belong to the feature.                    |

Role checks happen in actions through `protectedAction` and
`authenticatedAction`
([`protected-action.ts`](src/features/auth/protected-action.ts)). A wrapped
handler runs only after the session, the role and the Zod parse all pass. The
auth actions and `src/features/books/actions/editor.ts` do not use the wrappers.
See [accounts and roles](docs/auth.md).

## Directory map

| Path                        | Owns                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/app/`                  | Routes. `page.tsx` is `/`: the catalogue, or the dashboard for staff.                            |
| `src/app/books/[id]/`       | Book detail page with its own components, hooks and types.                                       |
| `src/app/auth/`             | Sign-in, sign-up, email verification and password reset pages.                                   |
| `src/app/about/`, `donors/` | Static information pages. `privacy` and `terms` are MDX.                                         |
| `src/features/admin/`       | Dashboard counts, pending requests, loan approval, statistics.                                   |
| `src/features/auth/`        | Sessions, password hashing, one-time codes, rate limits. See [accounts and roles](docs/auth.md). |
| `src/features/books/`       | Catalogue queries, book and image editing, favorites, loan requests.                             |
| `src/features/users/`       | Profile updates, role changes, suspension, user activity.                                        |
| `src/features/donors/`      | Read-only donor and donation lists.                                                              |
| `src/components/ui/`        | Radix-based primitives in the shadcn style (`components.json`).                                  |
| `src/components/layout/`    | Header and footer.                                                                               |
| `src/lib/db/schema/`        | Drizzle table definitions. See [database](docs/database.md).                                     |
| `src/lib/db/sync.ts`        | Schema sync and seeding run by `bun run dev`.                                                    |
| `src/lib/db/seeds/`         | Bootstrap and demo seed data.                                                                    |
| `src/lib/db/index.ts`       | `getDb()`: one pooled connection from Hyperdrive or `DATABASE_URL`.                              |
| `src/lib/storage.ts`        | R2 helpers over the `_216_storage` binding.                                                      |
| `src/lib/result.ts`         | `Ok`/`Err` result type for fallible service calls.                                               |
| `src/middleware.ts`         | Session cookie refresh and the same-origin check on non-GET requests.                            |

`@/` resolves to `src/` (`tsconfig.json`).

## Boundaries

- Components never import a repository. They call actions.
- `src/lib/db/index.ts` is the only place a connection is made at runtime.
  [`getDb()`](src/lib/db/index.ts) memoizes one `pg` pool with `max: 1`, which
  suits a Worker instance with Hyperdrive in front.
- `src/lib/db/sync.ts` opens its own pool and never runs inside the app.
- Only `src/lib/storage.ts` touches the R2 binding.
- Password and session code uses Web Crypto and `@oslojs`, not Node-only APIs,
  so it runs on Workers.

## Build and runtime

`next dev` and `next build` are plain Next.js. `opennextjs-cloudflare build`
turns the Next.js output into `.open-next/worker.js`, which `wrangler.jsonc`
names as the Worker entry. See [deployment](docs/deployment.md).

Tooling configuration at the root: `oxfmt.config.ts` (formatter, including
Markdown), `oxlint.config.ts` (linter), `knip.ts` (unused code and
dependencies), `drizzle.config.ts` (schema path for `drizzle-kit`).
