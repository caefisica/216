# Database

216 stores everything in Cloudflare D1, which is SQLite, through Drizzle. The
schema is defined in `src/lib/db/schema/`. The SQL that creates it is in
[`migrations/`](../migrations), and `wrangler` applies those files.

## Migrations

| Command                         | Does                                                           |
| ------------------------------- | -------------------------------------------------------------- |
| `bun run db:migrate`            | Apply pending migrations to the local database.                |
| `bun run db:migrate:production` | Apply pending migrations to the production database.           |
| `bun run db:generate`           | Write a new migration from the difference to the schema files. |
| `bun run db:seed`               | Add the demo accounts and the catalogue to the local database. |
| `bun run db:seed:sql`           | Write the catalogue as `catalogue.sql` for production.         |
| `bun run admin:create`          | Create or promote an admin. `--remote` targets production.     |

`bun run dev` runs `db:migrate` first. The local database lives in
`.wrangler/state`; delete that folder to start over. `bun run deploy` runs
`db:migrate:production` before it uploads the Worker.

Wrangler records applied migrations in the `d1_migrations` table and applies
each file once, in order. A migration that fails is rolled back.

### Changing the schema

1. Edit a file in `src/lib/db/schema/`. Export new tables from
   `schema/index.ts`.
2. Run `bun run db:generate`. Read the new file in `migrations/`: SQLite cannot
   alter every column in place, so drizzle-kit may recreate a table, and a
   recreated table loses rows unless you copy them.
3. Run `bun run db:migrate` and check the app locally.
4. Commit the schema change with the migration. Never edit a migration that has
   been applied in production; add a new one.

Migrations change structure. The categories and the rest of the catalogue come
from the seed below; production gets them as
[a SQL file](deployment.md#load-the-catalogue).

## Seeds

[`seed.ts`](../src/lib/db/seed.ts) is the entry point of `bun run db:seed`. It
runs two seeds and only ever writes to the local database. Every insert does
nothing when the row exists, so the seed is safe to repeat and never overwrites
an edit.

- [`seeds/demo.ts`](../src/lib/db/seeds/demo.ts) inserts three accounts.
  Changing `SEED_PASSWORD` does not change the password of an account that
  already exists.
- [`seeds/catalogue.ts`](../src/lib/db/seeds/catalogue.ts) inserts the
  librarians' register: 36 categories, 28 locations, 40 donors, 524 titles and
  579 copies. Ids are version 5 UUIDs derived from codes and names
  ([`seeds/ids.ts`](../src/lib/db/seeds/ids.ts)), so every host gets the same
  rows. D1 allows 100 bound parameters per statement, so the inserts are chunked
  to stay under it.

The catalogue seed reads
[`seeds/catalogue.json`](../src/lib/db/seeds/catalogue.json), a normalised copy
of the register, so no host needs the workbook or Python. Regenerate it, and
read the review file, when the librarians change the register:

```bash
python3 -I scripts/convert-register.py "<path to the register>.xlsx"
```

[`convert-register.py`](../scripts/convert-register.py) uses the Python standard
library and writes `catalogue.json` and
[`catalogue.review.csv`](../src/lib/db/seeds/catalogue.review.csv). The
converter:

- reads each sheet's header row, so column order does not matter, and each block
  (`COPIAS`, `PERDIDOS`, `metadata`) separately;
- skips the superseded `Matemática Básica` and `Matemática Básica 1` sheets;
- trims text and repairs the spellings it knows (`tipo`, donors, accents);
- drops blank rows, placeholder codes (`CALB00.1`), repeated rows and rows with
  no title, and gives uncoded rows a new code from the category counter;
- repairs codes whose subcategory disagrees with the subcategory column;
- applies a small table of per-row overrides for what a rule cannot fix (title
  and author swapped, a publisher in the donor column).

The review file has one row per decision: `kind`, `sheet`, `row`, `code`, `what`
and `detail`. The kinds are `skipped sheet`, `dropped`, `repaired`, `merged`,
`guess`, `condition`, `proposal` and `check`. The librarians read it to confirm
the guesses and the subcategory names.

### Seeding production

`bun run db:seed:sql` writes the catalogue seed, and only that, to the
git-ignored `catalogue.sql` ([`seed-sql.ts`](../src/lib/db/seed-sql.ts)). It
builds the statements with the same code as `db:seed` and writes their values
into the SQL, because `wrangler d1 execute --file` takes no bound parameters. A
test applies the file to an empty database with Wrangler and checks that it
holds the same rows as `db:seed`. The commands to apply it are in
[deployment](deployment.md#load-the-catalogue).

### Demo data

| Email                    | Role      |
| ------------------------ | --------- |
| `admin@unmsm.edu.pe`     | admin     |
| `librarian@unmsm.edu.pe` | librarian |
| `student@unmsm.edu.pe`   | user      |

All three share one password: `SEED_PASSWORD`, or `password123` when it is
unset. The accounts are created already email-verified.

## Types and defaults

- Ids are text UUIDs, generated by the app when the row is inserted.
- Timestamps are integers in milliseconds, which Drizzle reads as `Date`.
  Columns the app does not set default to the current time in SQL.
- Booleans are `0` or `1`, which Drizzle reads as `boolean`.
- Copy and loan statuses, a copy's origin and condition, and a location's
  `holds` are text with a `CHECK` constraint.
- Search runs `LIKE` on `books.search`, the title and author lowercased with
  accents removed, because `LIKE` ignores case for ASCII letters only.
  `books.title_key` is the normalised title the list orders by. The app sets
  both columns on every write
  ([`derivedTitleColumns`](../src/features/books/search.ts)).
- D1 allows 100 bound parameters per statement. Code that selects rows "in a
  list of ids" uses a subquery or a join, not `IN (?, ?, …)`.
- A subquery that counts rows for the outer table must name the outer column
  with `outer()` from [`qualified.ts`](../src/lib/db/qualified.ts). Drizzle
  drops the table name in a single-table query, and an unqualified `id` inside
  the subquery refers to the subquery's own table.

## Tables

| Table                                                  | Holds                                       |
| ------------------------------------------------------ | ------------------------------------------- |
| `user`, `session`                                      | Accounts and sign-in sessions.              |
| `email_verification_request`, `password_reset_session` | One-time codes.                             |
| `categories`                                           | Categories, two levels deep.                |
| `books`, `book_images`                                 | Titles and their images.                    |
| `copies`                                               | Physical copies of a title.                 |
| `locations`                                            | Bays of cabinets, where copies stand.       |
| `donors`                                               | Credit lines for the people who gave books. |
| `user_book_hearts`                                     | Favorites.                                  |
| `borrow_requests`                                      | Loan requests and their status.             |
| `rate_limit`                                           | Counters behind rate limits.                |

The columns and the reasons for the catalogue tables are in
[catalogue](catalogue.md).

Unique indexes enforce rules that concurrent requests could otherwise break: one
`pending` request per user and book (`borrow_requests_pending_idx`), one
`approved` loan per copy (`borrow_requests_active_copy_idx`), one image row per
stored object (`book_images_image_url_idx`) and one favorite per user and book
(`user_book_hearts_user_book_idx`). Code that writes these tables inserts and
handles the conflict instead of checking first.

Plain indexes serve the reads that run on every page:
`books_title_key_idx (title_key, code)` for the list order, `books_code_unique`,
`copies_code_unique` and `copies_book_number_unique (book_id, number)` for code
lookups and the per-title copy reads, `copies_location_idx`, `copies_donor_idx`
and `copies_status_idx` for the place, donor and collection availability reads,
`copies_book_status_idx (book_id, status)` for the lendable copies of one title,
`borrow_requests_user_idx (user_id, request_date)`, `borrow_requests_book_idx`
and `borrow_requests_date_idx` for the loan lists and the activity report, and
`book_images_book_idx` and `user_book_hearts_book_idx` for the per-title images
and favorite counts. A foreign key column without an index is a scan on every
cascade delete, so each one that a screen or a delete reads has one.

Two partial indexes serve the loan desk:
`borrow_requests_queue_idx (request_date, id)` where `status = 'pending'` and
`borrow_requests_due_idx (due_date, id)` where `status = 'approved'`. A query
that binds the status, as the desk queries do, uses them.

The rule for `rejection_reason` is in [catalogue](catalogue.md#loans).

## Reader collection counts

The home page and the about page read title, copy and currently available counts
from `getLibraryCounts` in
[`src/features/readers/repository.ts`](../src/features/readers/repository.ts).
The query uses three scalar subqueries in one statement. Available copies are
defined in [Architecture](architecture.md#shared-state). The status index
narrows the copy read, and `borrow_requests_active_copy_idx` checks each
candidate loan.

On the seeded local database, `EXPLAIN QUERY PLAN` reports:

| Read              | Plan                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Titles            | `SCAN books USING COVERING INDEX books_category_idx`                                      |
| Copies            | `SCAN copies USING COVERING INDEX copies_status_idx`                                      |
| Available copies  | `SEARCH copies USING INDEX copies_status_idx (status=?)`                                  |
| Active loan check | `SEARCH borrow_requests USING COVERING INDEX borrow_requests_active_copy_idx (copy_id=?)` |

The donors page uses one grouped read that inner-joins `donors`, `copies` and
`books`, so a donor without copies is not listed. It orders donors by their
total copies and groups the returned rows in memory to show each donor's titles.
The profile page ("Mis libros") uses two authenticated reads. One joins each
loan to its title and assigned copy, including its due date and, for a rejected
request, the reason. The other lists the favorites with their availability.

## Loan desk queries

The [loan desk](borrowing.md#loan-desk) runs two statements per page, whatever
the page size, in
[`features/loans/repository.ts`](../src/features/loans/repository.ts):

- `getLoanCounts` returns the size of every view as three scalar subqueries:
  pending requests, approved loans and overdue loans.
- `listPendingRequests` or `listActiveLoans` returns one page of the chosen
  view, `LIMIT 25 OFFSET (page - 1) * 25`. Each pending request carries the
  lendable copies of its title as a JSON array built by a correlated subquery
  over `copyIsLendable`, ordered by copy number, so no row triggers a further
  query.

A search (`?q=`) adds a third statement, `countLoanView`, because the count of a
filtered view is not one of the three scalar counts. The search is a `LIKE` over
the normalised title and author, the reader's name and email, and the copy code;
the desk holds only the loans in progress, so it scans a small set.

`EXPLAIN QUERY PLAN` on a migrated database reports:

| Statement       | Plan                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| Requests page   | `SCAN borrow_requests USING INDEX borrow_requests_queue_idx`                              |
| per request row | `SEARCH books USING INDEX sqlite_autoindex_books_1 (id=?)`                                |
|                 | `SEARCH user USING INDEX sqlite_autoindex_user_1 (id=?)`                                  |
|                 | `USE TEMP B-TREE FOR json_group_array(ORDER BY)`                                          |
|                 | `SEARCH copies USING INDEX copies_book_status_idx (book_id=? AND status=?)`               |
|                 | `SEARCH borrow_requests USING COVERING INDEX borrow_requests_active_copy_idx (copy_id=?)` |
|                 | `SEARCH locations USING INDEX sqlite_autoindex_locations_1 (id=?) LEFT-JOIN`              |
| Loans page      | `SCAN borrow_requests USING INDEX borrow_requests_due_idx`                                |
| per loan row    | `SEARCH books`, `SEARCH copies` and `SEARCH user`, each by primary key                    |
| Pending count   | `SCAN borrow_requests USING COVERING INDEX borrow_requests_queue_idx`                     |
| Approved count  | `SCAN borrow_requests USING COVERING INDEX borrow_requests_active_copy_idx`               |
| Overdue count   | `SEARCH borrow_requests USING COVERING INDEX borrow_requests_due_idx (due_date<?)`        |

Both partial indexes already hold the rows in display order, so neither page
sorts its rows: `due_date` ascending puts overdue loans first, and the oldest
request is first in the queue. The only temporary B-tree is the one SQLite
builds for `json_group_array(... ORDER BY copies.number)`, which sorts the
lendable copies of a single title. A test in
[`desk.test.ts`](../src/features/loans/desk.test.ts) asserts these plans and the
two-statement count.
