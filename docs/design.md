# Interface design

Every screen has one purpose and one primary action. The catalogue answers "is
it available". The book page answers it for one title and offers the request.
"Mis libros" shows what the reader has and what they saved. The loans desk
decides pending requests and registers returns. Intake registers a book. What
serves none of these is not on the screen.

## Tokens

[`globals.css`](../src/app/globals.css) clears Tailwind's default palette, type
sizes and radii, so a class that is not defined there does not exist.

- Colour: semantic names only (`background`, `surface`, `sunken`, `foreground`,
  `muted-foreground`, `border`, `input`, `ring`, `primary`, `link`, `success`,
  `warning`, `destructive`, with `-soft` backgrounds for the status colours),
  each with a light and a dark value. Text is at least 4.5:1 against its
  background and the border of a control (`input`) at least 3:1. Four `cover-*`
  pairs colour generated covers.
- Type: six steps. `xs` is metadata, `sm` the working size of dense lists,
  `base` reading text and touch inputs, `lg` a section or row title, `xl` a page
  title, `2xl` a book title. Inter is the sans face and Source Serif the face of
  page and book titles. Weights are 400, 500 and 600.
- Spacing: Tailwind's `0.25rem` unit. The steps in use are 1, 2, 3, 4, 6, 8
  and 12.
- Shape: radii `sm`, `md` and `full`, one shadow (`shadow-pop`, for popovers and
  toasts) and three container widths: `prose` (40rem), `page` (56rem) and `wide`
  (72rem).
- Control height: `h-control` is 36px, and 44px on touch screens
  (`pointer: coarse`). Every button, field, tab and row link uses it, so a touch
  target is never smaller than 44px. The `pointer-fine:` variant shows hints
  that only make sense with a keyboard.
- Motion: transitions are short, and `prefers-reduced-motion` turns them off.
  Focus is a two-pixel outline in the `ring` colour on every focusable element.

## Primitives

[`src/components/ui`](../src/components/ui) holds what screens are built from:

- `Button` and `buttonVariants` (`primary`, `secondary`, `quiet`, `danger`),
  also applied to links.
- `Field`, `Input`, `Select` and `Textarea`, with the label and the error under
  the field.
- `Kbd`, a keycap for a shortcut hint. It is hidden on touch screens.
- `Empty`, a title, one sentence and at most one action.
- `Page`, the width container.
- `AlertDialog`, `Toast` and `Toaster`, over Radix.
- `ImageDropzone`, the file chooser of the cover manager.

[`Availability`](../src/components/catalogue/availability.tsx) is the one place
that words a title's state: _Disponible_, _2 de 3 disponibles_, _No disponible_
or _Sin ejemplares_. It pairs an icon with the text, so colour never carries the
state alone. [`BookCover`](../src/components/catalogue/book-cover.tsx) keeps a
fixed 2:3 ratio. A stored image uses `/media/`; when absent, the component draws
a typographic cover with title, author and a colour derived from the category,
sized from its own width.

## Patterns

- State lives in the URL. Search, category, availability and the desk's list,
  query and page are search parameters, so back, reload and a shared link return
  to the same screen.
- Typing searches after a short pause. The previous results stay on screen,
  dimmed, until the new ones arrive.
- A decision with a safe reverse has no confirmation. Returning a loan shows a
  toast with _Deshacer_ for eight seconds. Deleting a book or a copy, which
  cannot be reversed, asks first.
- Detail that few readers need sits behind a `<details>`: the copies table, the
  note on a request, the account form, past loans.
- An empty list says why and offers the next step, never more than one.
- Errors stay next to the thing that failed. A toast confirms what happened.

## Admin

The loans desk and intake are built for the keyboard: `/` focuses the search,
Enter on a single match does what the row's main button does, `↑` and `↓` move
between rows and focus returns to the list after an action. Hints appear only
where a keyboard exists. The librarian's last intake category is remembered in
the browser.

## Imported covers

`bun run covers:fetch` queries Open Library one work at a time. It normalizes
the title and first author, requires a close title match, stores the response in
`.cache/covers/open-library.json`, and records misses in
`.cache/covers/misses.json`. It downloads accepted images to the existing
`book-images/` R2 prefix, records `/media/book-images/...` in `books` and
`book_images`, and never stores an Open Library URL.

By default the database and bucket are Wrangler's local bindings and the command
needs no credentials. `--remote` targets production; see
[deployment](deployment.md#load-the-covers). `--dry-run` matches, prints each
cover it would store, and writes nothing: not to R2, the database or the cache
files. It reads the cache files if they exist. After the first remote upload the
script lists the key it wrote and fails the upload if R2 does not show it.
