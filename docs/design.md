# Interface design

The public interface uses a short, consistent scale:

- Type: `0.7rem` for labels, `0.875rem` for metadata, `1rem` for controls,
  `1.875rem` for page headings, and `2.25rem` for a work title.
- Spacing: multiples of `0.25rem`; surfaces use `0.75rem` padding in lists and
  between `1.5rem` and `2.5rem` in detail views.
- Color: the home, catalogue, book page, header, footer, authentication and
  profile pages and [`BookCover`](../src/components/catalogue/book-cover.tsx)
  use only tokens from [`globals.css`](../src/app/globals.css), with light and
  dark values. [`src/app/about`](../src/app/about) and
  [`src/components/ui`](../src/components/ui) still use their own colors.

## Components

[`BookCover`](../src/components/catalogue/book-cover.tsx) keeps a fixed 2:3
ratio. A stored image uses `/media/`; when absent, the component renders a
typographic cover with title, author, category, and a deterministic color
derived from the category. A grid therefore does not depend on a complete image
collection.

The cover uses `loading="lazy"` below the first visible section and fixed
dimensions. The catalogue offers a dense list and a grid. The list keeps the
`/`, arrow, and Enter shortcuts; search updates results without losing focus.
Category and availability filters remain visible.

A book page places the cover and borrow action beside the title, author, code,
category, and copy table. Availability remains owned by the shared
`copyIsLendable` query in
[`src/features/books/sql.ts`](../src/features/books/sql.ts).

## Imported covers

`bun run covers:fetch` queries Open Library one work at a time. It normalizes
the title and first author, requires a close title match, stores the response in
`.cache/covers/open-library.json`, and records misses in
`.cache/covers/misses.json`. It downloads accepted images to the existing
`book-images/` R2 prefix, records `/media/book-images/...` in `books` and
`book_images`, and never stores an Open Library URL.

The database and bucket are Wrangler's local bindings. The command needs no
credentials; `--dry-run` matches and caches results without writing to R2 or the
database.

## Review screenshots

`bun run screenshots` opens a running site, `http://localhost:3000` unless
`SCREENSHOT_BASE_URL` says otherwise, and writes the home page, the catalogue
grid, and a book with a stored cover and one without to `docs/ui/` at 375 and
1280 pixels. It looks for those two books through every catalogue page and only
reads the site; when no book has a stored cover (or none lacks one) it prints a
warning and skips that book's captures. `bun run screenshots -- --dark` writes
the same files with a `-dark` suffix. The command requires Chromium, installed
with `bunx playwright install chromium`.
