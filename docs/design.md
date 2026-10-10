# Interface design

Every screen has one purpose and one primary action. The catalogue answers "is
it available". The book page answers it for one title and offers the request.
"Mis libros" shows what the reader has and what they saved. The loans desk
decides pending requests and registers returns. Intake registers a book. What
serves none of these is not on the screen.

The library is a university's physical collection, so the interface reads like a
well-set book catalogue: warm paper neutrals, a serif for what is printed on a
book, a quiet sans for everything the reader operates, hairline rules instead of
shadows, and one ink-blue accent.

## Tokens

[`globals.css`](../src/app/globals.css) clears Tailwind's default palette, type
sizes, weights, radii, shadows, easings, animations and container widths, and
defines the tokens and custom utilities that replace them. Each value below
names the product it was taken from or the reason it differs.

### Typefaces

| Role  | Face       | Used for                                                                                | Source                                                                                                                               |
| ----- | ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Sans  | Inter      | Every control, list text, metadata                                                      | Linear: Inter with `cv01` (alternate digit 1) and `ss03` (round quotes and commas), at weights 400, 510 and 590.                     |
| Serif | Newsreader | Book titles, page titles, the wordmark, dialog and empty-state titles, generated covers | Linear sets its editorial titles in a serif. Newsreader is an open face with optical sizes from 6 to 72 pt and full Spanish accents. |
| Mono  | Geist Mono | Book and copy codes, ISBN, keycaps                                                      | npmx and GitButler set identifiers in a mono face.                                                                                   |

[`layout.tsx`](../src/app/layout.tsx) loads all three with `next/font/google`.
The files are self-hosted, preloaded and use `font-display: swap` against a
fallback with adjusted metrics (`Inter Fallback` is Arial with `size-adjust` and
ascent and descent overrides), so the swap moves no text. Inter and Newsreader
load their optical-size axis, and `font-optical-sizing: auto` picks the cut for
each size. Inter's axis runs from 14 to 32, so text at 14px and below uses the
14 cut and the 38px title the 32 cut. Newsreader's range covers every step. The
font variables sit on `<html>` because the theme resolves the font stacks there.

### Type scale

Steps of a major second (1.125) from a 15px base, every step up to 19px and
every second step above it. Line heights sit on a 4px grid. Tracking tightens as
the size grows, as Linear's does. The serif keeps a fixed `-0.003em`, because
Newsreader's optical sizes already space each size.

| Step   | Size | Line height | Tracking | Used for                                  |
| ------ | ---- | ----------- | -------- | ----------------------------------------- |
| `xs`   | 12px | 16px        | 0        | Codes, keycaps                            |
| `sm`   | 13px | 20px        | −0.003em | Buttons, badges, metadata, category lines |
| `base` | 15px | 24px        | −0.009em | Body text, fields (16px on touch screens) |
| `md`   | 17px | 28px        | −0.011em | Author on the book page, description      |
| `lg`   | 19px | 24px        | −0.012em | Title in a list row, dialog title         |
| `xl`   | 24px | 32px        | −0.014em | Wordmark, empty-state title               |
| `2xl`  | 30px | 36px        | −0.018em | Page and book title on phones             |
| `3xl`  | 38px | 44px        | −0.02em  | Page and book title from 640px            |

The 15px base and 17px reading size are Linear's. A field on a touch screen uses
16px because iOS Safari zooms into a field whose text is smaller. Headings
balance their lines (`text-wrap: balance`). A title in a list row uses
`text-pretty` instead, which keeps a last word from standing alone without
narrowing every line. The book page title and the title on a generated cover
also hyphenate (`hyphens: auto` under `lang="es"`), because they are set large
in a narrow column.

### Colour

Neutrals are a warm stone grey (hue 88), after npmx's stone neutrals, so the
page reads as paper and not as a blue-grey dashboard. The one accent is an ink
blue used for links, focus and selection. Status colours mark a state or a
danger and never decorate: badges, the copy state dot, request and loan states,
field errors, the danger button and error toasts. Each comes with an icon or a
word, so colour is never the only cue.

| Token              | Light          | Dark      | Role                                  |
| ------------------ | -------------- | --------- | ------------------------------------- |
| `background`       | `#faf9f7`      | `#121110` | Page                                  |
| `surface`          | `#ffffff`      | `#191816` | Cards, list, fields, dialogs          |
| `raised`           | `#ffffff`      | `#2d2b27` | The selected segment, keycaps         |
| `sunken`           | `#f3f2ef`      | `#22201d` | Hover fill, segmented track, skeleton |
| `foreground`       | `#1f1e1b`      | `#edebe7` | Text; `primary` is the same colour    |
| `muted-foreground` | `#686661`      | `#a7a49f` | Secondary text                        |
| `border`           | `#e1dfdc`      | `#2f2e2a` | Hairlines and card edges              |
| `input`            | `#908d88`      | `#6e6c67` | Edge of a field                       |
| `accent`           | `#29599f`      | `#89b3f1` | Links, focus ring, selection          |
| `success`          | `#236e44`      | `#73ce95` | _Disponible_                          |
| `warning`          | `#935a11`      | `#ebb25f` | _No disponible_, a copy on loan       |
| `destructive`      | `#af2b25`      | `#f2897c` | Deleting, errors                      |
| `scrim`            | 45% warm black | same      | Behind a dialog                       |

`accent`, `success`, `warning` and `destructive` each have a `-soft` tint for
badge backgrounds. The values are written in OKLCH in `globals.css`; the hex
here is the sRGB result. Dark mode follows `prefers-color-scheme`. The primary
button is the text colour, as on npmx and Linear, so the accent stays rare
enough to mean "this is a link or has focus".

Every text pair passes WCAG AA in both themes:

| Pair                                 | Light   | Dark    |
| ------------------------------------ | ------- | ------- |
| `foreground` on `background`         | 15.84:1 | 15.84:1 |
| `muted-foreground` on `sunken`       | 5.12:1  | 6.54:1  |
| `accent` on `surface`                | 6.94:1  | 8.26:1  |
| `accent` on `accent-soft`            | 6.10:1  | 7.01:1  |
| `success` on `success-soft`          | 5.61:1  | 7.79:1  |
| `warning` on `warning-soft`          | 5.09:1  | 7.72:1  |
| `destructive` on `destructive-soft`  | 5.81:1  | 6.32:1  |
| `primary-foreground` on `primary`    | 16.67:1 | 15.84:1 |
| `input` (field edge) on `background` | 3.14:1  | 3.60:1  |

The lowest `muted-foreground` pair is on `sunken`; on `background` and `surface`
it is higher. A field's edge clears the 3:1 that WCAG asks of a control.

Generated covers use four bookcloths: bottle green, oxblood and navy with cream
lettering, and ochre with dark ink (`cover-1` to `cover-4`, `cover-light`,
`cover-dark`). The title and author lines use the same ink at full opacity:

| Cloth             | Light  | Dark   |
| ----------------- | ------ | ------ |
| `cover-1` green   | 8.52:1 | 6.88:1 |
| `cover-2` oxblood | 9.53:1 | 7.74:1 |
| `cover-3` navy    | 9.87:1 | 7.73:1 |
| `cover-4` ochre   | 4.96:1 | 5.36:1 |

### Space, shape and elevation

- Spacing is Tailwind's 4px unit. Layouts use 4, 8, 12, 16, 20, 24, 32 and 48px.
  The content column is 60rem wide (`max-w-page`) with 16px gutters on phones
  and 24px from 640px; the header and footer share it. Reading text is held to
  40rem (`max-w-measure`), and narrow forms to 24rem (`max-w-sm`).
- Radii are GitButler's small set: `xs` 2px (covers, skeleton lines, keycaps),
  `sm` 4px (buttons, fields), `md` 6px (cards, the list, the segmented track and
  the 44px search field), `lg` 8px (dialog, toast) and `full` (badges).
- Surfaces are separated by a one-pixel `border`, not by shadow, as on
  GitButler. A shadow means the thing floats or is an object: `shadow-raised`
  for the selected segment, `shadow-cover` for a book cover, `shadow-pop` for a
  toast and `shadow-dialog` for a dialog.
- Controls are 36px high (`h-control`) and 44px on touch screens
  (`pointer: coarse`). The catalogue search is 44px everywhere because it is the
  page's main control. Badges are 24px and sit inside a row, not as targets.
  Links inside a line of text add `pointer-coarse:min-h-control` when they stand
  alone; links inside a sentence keep the height of their line. The
  `pointer-fine:` variant shows hints that only make sense with a keyboard.
- Focus is a two-pixel `accent` outline two pixels outside every focusable
  element. A row's link draws it inside the row.

### Motion

| Use                          | Duration | Easing                                     | Source    |
| ---------------------------- | -------- | ------------------------------------------ | --------- |
| Colour and background change | 100ms    | `ease-out` `cubic-bezier(.25,.46,.45,.94)` | Linear    |
| Dialog and toast appear      | 150ms    | `ease-pop` `cubic-bezier(.45,1,0,1)`       | GitButler |
| Overlay fade                 | 150ms    | `ease-out`                                 | Linear    |
| Skeleton pulse               | 2s loop  | `ease-in-out`, opacity 0.7 to 0.4          | npmx      |

Results dim 150ms after a search starts, so a fast answer never flickers.
`prefers-reduced-motion` turns every animation and transition off.

## Primitives

[`src/components/ui`](../src/components/ui) holds what screens are built from:

- `Button` and `buttonVariants`: `primary` (one per screen), `secondary`
  (bordered), `quiet` (no edge until hover) and `danger`; text or `icon` shape;
  also applied to links. Hover and press darken or fill by one step; disabled is
  half opacity and ignores the pointer, so it shows no hover state.
- `Field`, `Input`, `Select` and `Textarea`, with the label above and the hint
  or error under the field. An invalid field turns its edge `destructive`.
- `Segmented`, a set of mutually exclusive filters on a sunken track. It is a
  fieldset of native radios, so it is one tab stop and the arrow keys move and
  select.
- `Badge`, a soft-tinted pill in `neutral`, `accent`, `success`, `warning` or
  `destructive`, with an icon before the word.
- `Card`, a bordered surface; `CardList` and `CardRow`, a bordered list with a
  rule between rows. `rowLink`, the props that make one link cover its whole row
  so the row is one target without nesting other controls in a link.
- `Skeleton`, a pulsing block for a loading layout.
- `Empty`, a serif title, one sentence and at most one action.
- `Page`, the width container.
- `Kbd`, a keycap for a shortcut hint. It is hidden on touch screens.
- `AlertDialog`, `Toast` and `Toaster`, over Radix.
- `ImageDropzone`, the file chooser of the cover manager.

[`Availability`](../src/components/catalogue/availability.tsx) is the one place
that words a title's state, as a badge: _Disponible_ or _2 de 3 disponibles_
(success, check), _No disponible_ (warning, clock) or _Sin ejemplares_ (neutral,
dash). The icon and the word carry the state, so colour never carries it alone.
[`BookCover`](../src/components/catalogue/book-cover.tsx) keeps a fixed 2:3
ratio with a 2px radius, a hairline edge and a soft drop shadow. A stored image
uses `/media/`. Without one it draws a cloth binding: a colour picked from the
category, a shaded spine at the left edge, the title in the serif, a short rule
and the author at the foot, all sized from the cover's own width. In a list row
it shows only the title's first letter.

## Patterns

- State lives in the URL. Search, category, availability and the desk's list,
  query and page are search parameters, so back, reload and a shared link return
  to the same screen.
- Typing searches after a short pause. The previous results stay on screen,
  dimmed, until the new ones arrive. The first load of a page shows a skeleton
  in the shape of what is coming: list rows on the catalogue, the cover, title
  and availability card on a book.
- A decision with a safe reverse has no confirmation. Returning a loan shows a
  toast with _Deshacer_ for eight seconds. Deleting a book or a copy, which
  cannot be reversed, asks first.
- Detail that few readers need sits one step away: the copies behind
  _Ejemplares_, the note on a request behind _Añadir una nota_, the account
  form, past loans.
- An empty list says why and offers the next step, never more than one.
- Errors stay next to the thing that failed. A toast confirms what happened.

## Admin

The loans desk is built for the keyboard; its shortcuts are in
[borrowing](borrowing.md#loan-desk). Keyboard hints appear only where a keyboard
exists. Intake remembers the librarian's last category in the browser.

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
