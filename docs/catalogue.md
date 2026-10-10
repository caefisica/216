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
top-level category includes its subcategories) and availability. Staff also get
_Sin etiqueta_ (`labelled = false`) and _Sin ubicación_ (a copy with no
location). The list is ordered by title and comes in pages of 50 (`page=` in the
URL; a page past the end shows the last one). One query reads the page and a
second counts the matches; availability, the copy count and the reader's
favorite mark are computed inside the page query, never per row from the client.

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
- The availability and unplaced filters are semi-joins on `copies`
  (`book_id IN (SELECT book_id FROM copies WHERE …)`) that use
  `copies_location_idx` and `copies_book_number_unique`. A lendable copy is
  found through the partial index `borrow_requests_active_copy_idx`.
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

`/` is one search field and the list under it
([`catalogue-search.tsx`](../src/features/books/components/catalogue-search.tsx),
[`book-list.tsx`](../src/features/books/components/book-list.tsx)). The field is
the largest control on the page and has focus on `/`.

- One row per title: cover, title, author, category and availability
  (_Disponible_, _2 de 3 disponibles_, _No disponible_ or _Sin ejemplares_).
  Staff also see the code. The whole row links to the title.
- Typing searches after a short pause. Two controls sit under the field: the
  category (top-level categories group their subcategories) and _Solo
  disponibles_. Staff get a third, to review copies without a label or a place,
  with how many there are. Everything is in the URL.
- A count of the matches sits above the list, with _Quitar filtros_ when any
  filter is on. Below it, when there is more than one page, the range
  (`51–100 de 120`) sits between _Anteriores_ and _Siguientes_.
- When nothing matches, the empty state suggests fewer words and offers _Quitar
  filtros_. An empty catalogue says so.
- The list stays on screen, dimmed, while a new search loads.
- `/` focuses the search from anywhere on the page.

### Detail

`/books/<id>` ([`page.tsx`](../src/app/books/[id]/page.tsx)) answers one
question first: is it available.

- Cover, title and author, with the category and its parent as links to the
  filtered list. The back link returns to the last search, filters and page of
  the catalogue in this browser tab, however the reader reached the book. The
  catalogue stores that query in `sessionStorage` as `216:catalogue`.
- Below a rule, the availability, then where to find it (the place of a copy on
  the shelf) or, when all copies are out, _Vuelve hacia el_ the earliest due
  date that is still ahead, or _Prestado, sin fecha de vuelta_ when every due
  date has passed. A copy past its date reads _vencido hace_ the days late, here
  and in the copies table. Then the one action: _Solicitar préstamo_, with a
  note behind _Añadir una nota_. A visitor is asked to sign in and an unverified
  account to verify its email. After a request the action becomes the state of
  the request. That state also shows when no copy is lendable, so a reader who
  holds the last copy reads _Lo tienes prestado hasta_ the due date, or _vencido
  hace_ the days late.
- Readers with a verified account can save the title. Staff see _Editar libro_
  instead of the request.
- The description follows. The copies sit in a closed _Ejemplares_ section: for
  a reader, the state, the place and the edition of each; for staff, open by
  default, with the donor and a select to change the status.

### Intake and edit

`/admin/books/create` and `/admin/books/<id>` are staff-only. Intake uses
[`book-intake-form.tsx`](../src/features/books/components/book-intake-form.tsx);
the existing-title editor uses
[`book-editor.tsx`](../src/features/books/components/book-editor.tsx).

- Intake starts with the title, which has focus. Matching titles are listed with
  _Agregar ejemplar_, which adds a default copy to that title, so a second copy
  does not become a duplicate title.
- Intake asks for the title, author, ISBN, category and number of copies. The
  category chosen last is remembered in the browser. Codes and default copy
  data, including the category's default location when one is unambiguous, are
  generated when the form is saved. Later copies use the category's extra bay
  when one is configured.
- Saving shows the issued copy code in large type, for the librarian to write on
  the spine, with _Registrar otro_ as the focused primary action and a link to
  the editor for the place and photos.
- Edit changes the title fields, adds, edits and deletes copies, manages the
  cover and other images, and deletes the book after a confirmation. The codes
  and copy numbers are read-only.

### Settings

`/admin/settings` is staff-only. Its long lists are closed until opened. It
lists the locations (cabinet, shelf, bay, category), where a location is added
or edited, and the donors, where a donor and their motivation line are added or
edited. For an admin it also lists the people with a role select each.
