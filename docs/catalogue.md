# Catalogue

The catalogue records which titles the library holds, which physical copies
exist of each, where each copy stands, who gave it and whether it is on loan.
The librarians' register, a workbook with one sheet per category, is the source
of the first load. After that the app is the register.

```
categories (parent_id) ──< books ──< copies >── locations
                             │          │
                             │          └── donors
                             └──< borrow_requests >── copies
```

The tables are defined in
[`src/lib/db/schema/library.ts`](../src/lib/db/schema/library.ts).

## Books and copies

A **book** is a title. A **copy** is one shelf unit: one code, one place, one
state. A title with an original and two photocopies is one `books` row and three
`copies` rows. Loans belong to a copy and hearts to a title: "who borrowed
this?" is about a copy, "who likes this?" is about a title.

`books`: `code` (unique, such as `CAFG.1.05`), `category_id`, `title`, `author`,
`isbn`, `description`, `image_url`, `search` (normalised title and author, see
[Search and filters](#search-and-filters)) and `next_copy`.

`copies`:

| Column                                    | Meaning                                                     |
| ----------------------------------------- | ----------------------------------------------------------- |
| `book_id`, `number`                       | The title and the copy number; unique together              |
| `code`                                    | `books.code` + `.` + `number`; unique; printed on the spine |
| `origin`                                  | `original` or `copy` (photocopy)                            |
| `volume`                                  | Free text such as `1`, `1-2`; null when the title has none  |
| `pieces`                                  | Physical pieces under the code; at least 1                  |
| `edition`, `year`, `country`, `publisher` | The imprint of this copy                                    |
| `location_id`, `donor_id`                 | Where it stands and who gave it; both nullable              |
| `status`                                  | `present`, `maintenance` or `missing`                       |
| `condition`                               | `good`, `fair` or `poor`; null when unknown                 |
| `labelled`                                | Whether the code is physically on the spine                 |
| `notes`                                   | Free text, kept verbatim from the register                  |

- The imprint is on the copy. The register writes edition, year, country and
  publisher next to each code, and two copies of one title often differ. The
  title carries only what is true of every copy.
- A volume set is one copy. A two-volume set under one code is one copy with
  `pieces = 2`, and a loan covers all its pieces. A title that the register
  lists as separate codes per volume stays separate titles.
- Editions are not a table. A new edition of a textbook is a different object on
  the shelf with its own code, so it is a different book. Two copies of one
  edition share a book.
- `pieces` is not a stock count. The laboratory sheet lists uncoded handouts
  with up to 16 pieces. They are one copy with `pieces = 16`, which the loan and
  availability rules treat as one unit.
- Binding words (`anillado`, `horizontal`, `empastado`) stay in `notes`; nothing
  filters on them.
- Cover images stay in `book_images` and `books.image_url`, per title.
- Deleting a book deletes its copies, loans, hearts and images. A copy that any
  loan has named cannot be deleted; mark it `missing` instead.

## Codes

A book code is `CA`, the category code and a number. Categories with
subcategories write the subcategory in: `CAFG.1.05` is general physics,
subcategory 1, item 5. The others do not: `CALB01`. A copy code adds the copy
number: `CAFG.1.05.1`, `CALB01.1`.

A code is never edited and never reused after a delete. New codes come from two
counters, each advanced by one `UPDATE ... RETURNING` statement:

- `categories.next_number` for the next book number in a leaf category;
- `books.next_copy` for the next copy number of a title.

A failed insert leaves a gap. A moved title keeps its code, so the code stays
the label on the spine and the category stays the shelf logic.

## Categories

`categories` has `parent_id` (null for top level), `code` (`FG`, or `FG.1` for a
subcategory), `name` and `next_number`. A book belongs to exactly one category,
and only a category with no subcategories can hold books. The depth is two and
the app enforces it.

The register numbers subcategories but does not name them. The converter
proposes names from the titles under each number; they are the `proposal` rows
of the review file and the librarians confirm or rename them. The proposals are:

| Code | Name                                 |
| ---- | ------------------------------------ |
| FG.0 | Introducción y física recreativa     |
| FG.1 | Mecánica (Física 1)                  |
| FG.2 | Ondas, fluidos y calor (Física 2)    |
| FG.3 | Electricidad y magnetismo (Física 3) |
| FG.4 | Óptica                               |
| FG.5 | Textos completos y problemas         |
| CL.1 | Cálculo diferencial                  |
| CL.2 | Cálculo integral                     |
| CL.3 | Cálculo vectorial                    |
| CL.4 | Análisis matemático y tratados       |

## Locations

`locations` has `cabinet`, `shelf`, `bay`, `category_id` and `holds` (`primary`
or `extra`). `cabinet, shelf, bay` is unique. A row is one bay of one cabinet,
labelled for one category: the `Clasificación` sheet, one row per cell. A shelf
is a level inside a cabinet, not a floor. The cabinets are _Mueble Principal_,
_Estante_, _Mueble marron_ and _Cajonera negra_. Cabinets are text, not a table:
they have no attribute besides a name.

A copy's place is `copies.location_id`. The form fills a default from the grid:
the first copy of a title goes to the `primary` bay of its category (or of its
parent category), and later copies go to the `extra` bay when there is one. When
several bays fit, or none, the field stays empty and staff choose
([`location.ts`](../src/features/books/location.ts)).

## Donors

`donors` keeps `name` (unique) and the optional `motivation` line. It holds no
contact data: a donor row is a credit line. `copies.donor_id` links a copy to
its donor. A donor's gifts are the copies that point at them, and the donors
page lists them.

## Condition and status

Three things are separate:

- `status` is the library's decision: `present`, `maintenance` (not lendable for
  now) or `missing`. The register's `PERDIDOS` blocks load as `missing`.
- `condition` is what the object looks like: `good`, `fair`, `poor` or unknown.
  The converter sets it from a fixed list of Spanish words in `comentarios` and
  lists every hit in the review file. Staff change it by hand afterwards.
- Availability is not stored. It is derived from the loans below.

`sin forrar` (no protective cover) is a to-do, not a condition. It stays in
`notes`.

## Loans

`borrow_requests` has `book_id` and `copy_id`. `copy_id` is null while the
request is `pending` or `rejected` and set when it is approved. See
[borrowing](borrowing.md) for the flow.

- A reader asks for a title, not a copy.
- The librarian who approves picks the copy on the
  [loan desk](borrowing.md#loan-desk), defaulting to the lowest-numbered
  lendable one.
- A `rejected` row carries a `rejection_reason`, and the check
  `borrow_requests_rejection_check` refuses a rejected row whose reason is null,
  empty or only whitespace.
- A check constraint rejects `approved` or `returned` rows without a `copy_id`.
- A composite foreign key `(book_id, copy_id)` to `copies (book_id, id)` stops a
  loan from naming a copy of another title.
- A unique index on `copy_id` where `status = 'approved'` allows one active loan
  per copy. Two approvals of the same copy cannot both succeed.
- A unique index allows one pending request per user and title.

A copy is **lendable** when `status = 'present'` and no approved loan has its
`copy_id`. A title is **available** when it has at least one lendable copy, and
a request is refused when the title has none. Marking a copy `maintenance` or
`missing` while it is on loan does not end the loan; the return still works.

The register's loan remarks (`prestamo hasta diciembre 2023`, `devuelto`) name
no borrower. They load as notes, not as loans.

## Search and filters

The list searches by title, author and copy code, and filters by category (a
top-level category includes its subcategories), cabinet and shelf, donor and
availability. Staff also get _Sin etiqueta_ (`labelled = false`) and _Sin
ubicación_ (a copy with no location). The list is ordered by title, or by code
with `sort=code`, and comes in pages of 50 (`page=` in the URL; a page past the
end shows the last one). One query reads the page and a second counts the
matches; availability, the copy count and the reader's favorite mark are
computed inside the page query, never per row from the client.

- Titles are ordered by `books.title_key`, the normalised title without the
  quotes or `¿` it opens with, then by code. The order is word by word on that
  text, so `ñ` sorts with `n` and not after `z`. The index
  `books_title_key_idx (title_key, code)` serves the order, so a page never
  sorts the table.
- SQLite's `LIKE` is case-insensitive for ASCII only, so `ángel` would not find
  `Ángel`. `books.search` stores the title and author lowercased with accents
  removed, and the query goes through the same function
  ([`search.ts`](../src/features/books/search.ts)) before the `LIKE`. Each word
  of the query must match.
- A query shaped like a code (`cafg.1.05`) matches `books.code` and
  `copies.code` by prefix, so a typed spine label finds its title. Codes are
  stored in upper case (the `categories_code_check` constraint holds the
  category part), and the prefix becomes a range
  (`code >= 'CAFG.1.05' AND code < 'CAFG.1.06'`), which the unique code indexes
  serve; a `LIKE` would not use them.
- Filters are URL search parameters, so a filtered list can be shared.
- Full-text search is not used. The catalogue holds hundreds of titles, and an
  FTS table adds a virtual table and sync triggers for no gain at that size.
- The unlabelled and unplaced filters are for staff. For any other caller the
  service ignores them ([`getBooksService`](../src/features/books/service.ts)).
- Filters on a copy's place, donor or availability are semi-joins on `copies`
  (`book_id IN (SELECT book_id FROM copies WHERE …)`) that use
  `copies_location_idx`, `copies_donor_idx` and `copies_book_number_unique`. A
  lendable copy is found through the partial index
  `borrow_requests_active_copy_idx`.
- Two scans remain, both on purpose. A text search scans `books.search`, because
  `LIKE '%word%'` has a leading wildcard that no B-tree serves; at a few hundred
  titles that is a read of one narrow column. The staff-only _Sin etiqueta_
  filter scans `copies` for `labelled = 0`, a small share of the rows, which an
  index would not make cheaper. The tests in
  [`query-plans.test.ts`](../src/features/books/query-plans.test.ts) fail if any
  other filter starts scanning `copies`, `borrow_requests`, `user_book_hearts`
  or `categories`.

## Entered by hand, derived

| Entered by staff                                 | Derived                                     |
| ------------------------------------------------ | ------------------------------------------- |
| Title, author, category                          | Book code and number                        |
| Per copy: origin, volume, pieces, imprint, notes | Copy number and code                        |
| Donor (picked, or created in place)              | Default location from category and origin   |
| Status and condition changes                     | `search` text                               |
| `labelled`, when the label is stuck              | Availability, from copy status and loans    |
| Location, when the default is empty or wrong     | `labelled = false` for codes the app issued |

## Data load

The librarians' register reaches the database through a normalised file
committed to the repository, not through the workbook, so no host needs the
workbook or Python, and every decision the conversion made is in a file the
librarians can review. How the file is made and loaded, locally and in
production, is in [database](database.md#seeds). Donor names are credit lines;
the file holds no contact data.

## Pages

### List

`/` shows the list
([`book-catalog.tsx`](../src/features/books/components/book-catalog.tsx)).

- One row per title: code, title, author, availability (_Disponible_, with
  lendable and total copies when the title has several, _No disponible_ or _Sin
  ejemplares_), and, at 1536 pixels and wider, category and subcategory. The
  code is monospace in the first column.
- Filters sit in one bar above the list: category, cabinet and shelf, donor,
  availability. The category and donor lists show how many titles or copies each
  has.
- Active filters appear as chips above the list. Each chip removes its filter,
  and _Limpiar todo_ removes all of them.
- A count of the matching titles sits above the list. Below it, when there is
  more than one page, a pager shows the range (`51–100 de 120`), _Anterior_,
  _Siguiente_ and the page number.
- When a search returns nothing, the empty state names the query and the filters
  and offers _Limpiar filtros_. An empty catalogue says so and, for staff,
  offers _Registrar el primer libro_.
- At 1024 pixels and wider, list view has a detail pane on the right. Selecting
  a row keeps the list, its scroll position and filters, and shows the title's
  cover, header, borrow action and copies in the pane, with each copy as label
  and value rows. The previous title stays in the pane, dimmed, until the next
  one loads. The URL's `book` parameter stores the selection, so a reload or a
  shared link opens the same pane; when that title is not on the current page,
  the pane shows it and no row is highlighted. Below 1024 pixels, selecting a
  row opens `/books/<id>`.
- The list and detail pane share each title's favorite state and heart count
  while the catalogue is open.
- Grid view has no pane: its cards link to the book page, and switching to the
  grid closes the pane.
- Keys: `/` focuses the search, `↑` and `↓` move the highlighted row, `←` and
  `→` change page, `Enter` opens the full page, and `Esc` clears the search when
  it is focused or closes the detail pane otherwise. In list view at 1024 pixels
  and wider, `↑` and `↓` also show the highlighted title in the pane. A footer
  line names the keys.
- The page keeps the ids of the titles on screen in `sessionStorage`, so the
  detail page's previous and next titles follow the current page.

### Detail

`/books/<id>` shows the title page
([`book-client.tsx`](../src/app/books/[id]/book-client.tsx)).

- Header: category and subcategory as links to the filtered list, the book code,
  title and author.
- `↑` and `↓` open the previous and next title of the list the reader came from.
- A copies table: code, origin, volume and pieces, imprint, place (cabinet,
  shelf, bay), donor, status and condition. Staff change status and condition
  from selects that save on change; readers see a copy on loan as _Prestado_.
- Readers can request the title when it is available. The pending request shows
  the lendable copies to staff on the [loan desk](borrowing.md#loan-desk), who
  pick one when they approve it.

### Intake and edit

`/admin/books/create` and `/admin/books/<id>` are staff-only. Intake uses
[`book-intake-form.tsx`](../src/features/books/components/book-intake-form.tsx);
the existing-title editor uses
[`book-editor.tsx`](../src/features/books/components/book-editor.tsx).

- Intake starts with the title. Matching titles are listed with _Agregar un
  ejemplar_, which adds a default copy to that title, so a second copy does not
  become a duplicate title.
- Intake asks for the title, author, ISBN, category and number of copies. It
  shows a generated cover, because a new title has no stored cover. Codes and
  default copy data, including the category's default location when one is
  unambiguous, are generated when the form is saved. Later copies use the
  category's extra bay when one is configured.
- Saving shows the issued copy code in large type, for the librarian to write on
  the spine and offers _Agregar otro_.
- Edit changes the title fields, adds, edits and deletes copies, manages the
  cover and other images, and deletes the book after a confirmation. The codes
  and copy numbers are read-only.

## References

The layout follows two codebases read for how they lay out dense data screens.

From the Huly platform: the no-results state with a clear action, filter chips
with a clear-all, and the previous and next record on a detail page.

From Orca: dense one-line rows with small monochrome type, keyboard-first
navigation with a key-hint footer, and errors that stay on the page while toasts
confirm.

Not built: saved filters, a command palette and virtual scrolling. A small
library needs none of them.
