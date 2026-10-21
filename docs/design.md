# Interface design

Every screen has one purpose and one primary action. The catalogue answers "is
it available". The book page answers it for one title and offers the request.
"Mis libros" shows what the reader has and what they saved. The loans desk
decides pending requests and registers returns. Intake registers a book. The
donors page thanks the people who gave books and shows how to give one. What
serves none of these is not on the screen.

216 is a student-run physics library. Its readers scan a long list of titles on
a phone between classes, and its volunteers register books at a desk. The
interface is built for that scanning: one type family, one hue, quiet surfaces,
and a single blue that marks what can be acted on.

## Tokens

[`globals.css`](../src/app/globals.css) is the only file that holds a colour, a
font, a size, a shadow or a curve. It clears Tailwind's default palette, type
sizes, weights, radii, shadows, easings and container widths, so a class that
the file does not define does not exist. Components name a role (`bg-surface`,
`text-muted-foreground`, `shadow-raised`) and never a value.

The lint step enforces this with the `design-tokens/no-raw-values` rule
([`lint/design-tokens.js`](../lint/design-tokens.js)). It reports a string or a
style key in any linted file that holds a colour literal (hex, `rgb()`,
`oklch()` and the rest), a `font-family`, a `box-shadow`, an arbitrary pixel
value, or an arbitrary size, type, radius or curve such as `text-[1.125rem]`. An
arbitrary value may read a variable (`w-[var(--x)]`), and a `grid-cols-[…]` or
`grid-rows-[…]` template may name its track sizes, because a column width is
layout and not a token. The rule reads TypeScript and TSX; the `mdx` pages hold
prose only and are not linted.

### Typeface

One family, Geist, in weights 400 and 600, with Geist Mono for what is read
letter by letter: book and copy codes, the ISBN and keycaps.

- One family, because a catalogue is a list of titles, authors and states, and
  hierarchy there comes from size and weight. A second face for titles adds a
  choice on every row and makes one product look like two.
- Two weights, because a third sits too close to either to be told apart at
  14px, and so adds a level without adding a meaning.
- Geist, because it is drawn for dense interface text, covers Spanish accents
  and ñ, and ships a matching mono, so the spine code in a row and the title
  above it share proportions.

[`layout.tsx`](../src/app/layout.tsx) loads both with `next/font/google`. The
files are self-hosted, preloaded and use `font-display: swap` against a fallback
with adjusted metrics, so the swap moves no text. The font variables sit on
`<html>` because the theme resolves the font stacks there.

### Type scale

Seven steps with line heights on a 4px grid. The three small steps separate
roles under one body size (a code, a label, the text), and the four large ones
separate headings from each other. Tracking tightens from `lg` up, because large
type looks loose at the default.

| Step   | Size | Line height | Tracking | Used for                                         |
| ------ | ---- | ----------- | -------- | ------------------------------------------------ |
| `xs`   | 12px | 16px        | 0        | Codes, keycaps, badge text                       |
| `sm`   | 14px | 20px        | 0        | Metadata, field labels, nav, category lines      |
| `base` | 16px | 24px        | 0        | Body text, buttons, fields, row titles           |
| `lg`   | 20px | 24px        | −0.01em  | Section heading, author on the book page, lead   |
| `xl`   | 24px | 28px        | −0.015em | Headings inside a document                       |
| `2xl`  | 32px | 40px        | −0.02em  | Page title on phones, a figure on the donor page |
| `3xl`  | 40px | 48px        | −0.025em | Page title from 640px                            |

Body text is 16px at every width: it is the reading size, and iOS Safari zooms
into a field whose text is smaller. Headings balance their lines
(`text-wrap: balance`) and paragraphs avoid a lone last word
(`text-wrap: pretty`). The title on the book page and on a generated cover also
hyphenates (`hyphens: auto` under `lang="es"`), because it is set large in a
narrow column. Counts and figures use `tabular-nums`, so they line up in a
column.

### Colour

Every colour is OKLCH. The neutrals and the accent share one hue (255, a
slightly violet blue) and the neutrals carry a chroma of 0.003 to 0.022, so the
page is one hue family and no grey looks warm or green beside the blue. The
scales keep the step numbers of Radix Colors (1 and 2 are backgrounds, 3 to 5
fill an element, 6 to 8 are edges, 9 and 10 are solid, 11 and 12 are text) and
define only the steps a role reads.

There is one accent. It is the fill of the primary button, the colour of links,
the focus ring, the current item in the header and the number on a step. A
single colour that can be acted on lets a reader find the next step without
reading, and a blue is the colour a university reader already reads as a link.
Status colours (green, amber, red) mark a state and never decorate: badges, the
copy-state dot, request and loan states, field errors, the danger button and
error toasts. Each comes with an icon or a word, so colour is never the only
cue.

| Role               | Light               | Dark                | Step            |
| ------------------ | ------------------- | ------------------- | --------------- |
| `background`       | `oklch(.985 .003)`  | `oklch(.165 .008)`  | neutral 1       |
| `surface`          | `oklch(.972 .005)`  | `oklch(.19 .01)`    | neutral 2       |
| `raised`           | `oklch(.985 .003)`  | `oklch(.27 .015)`   | 1 / 5           |
| `sunken`           | `oklch(.955 .007)`  | `oklch(.22 .012)`   | neutral 3       |
| `pressed`          | `oklch(.925 .01)`   | `oklch(.27 .015)`   | neutral 5       |
| `border`           | `oklch(.905 .012)`  | `oklch(.31 .016)`   | neutral 6       |
| `input`            | `oklch(.64 .02)`    | `oklch(.56 .02)`    | neutral 8       |
| `muted-foreground` | `oklch(.44 .022)`   | `oklch(.79 .018)`   | neutral 11      |
| `foreground`       | `oklch(.22 .022)`   | `oklch(.95 .008)`   | neutral 12      |
| `primary`          | `oklch(.52 .165)`   | `oklch(.54 .17)`    | accent 9        |
| `primary-hover`    | `oklch(.47 .15)`    | `oklch(.48 .15)`    | accent 10       |
| `accent`           | `oklch(.44 .14)`    | `oklch(.8 .09)`     | accent 11       |
| `accent-soft`      | `oklch(.945 .025)`  | `oklch(.25 .06)`    | accent 3        |
| `success`          | `oklch(.42 .1 150)` | `oklch(.8 .14 150)` | text            |
| `warning`          | `oklch(.44 .09 70)` | `oklch(.82 .13 80)` | text            |
| `destructive`      | `oklch(.5 .17 25)`  | `oklch(.78 .13 25)` | text            |
| `scrim`            | 50% dark ink        | same                | Behind a dialog |

`success`, `warning` and `destructive` each have a `-soft` tint for the
background of a badge or an error. Dark mode follows `prefers-color-scheme`.
Dark surfaces get lighter as they rise, which is how a dark interface shows
height.

Every text pair passes WCAG AA in both themes, and a field's edge clears the 3:1
that WCAG asks of a control:

| Pair                                    | Light   | Dark    |
| --------------------------------------- | ------- | ------- |
| `foreground` on `background`            | 16.58:1 | 16.66:1 |
| `muted-foreground` on `sunken`          | 6.81:1  | 8.96:1  |
| `accent` on `surface`                   | 7.25:1  | 9.90:1  |
| `accent` on `accent-soft`               | 6.70:1  | 8.60:1  |
| `primary-foreground` on `primary`       | 5.35:1  | 4.91:1  |
| `primary-foreground` on `primary-hover` | 6.62:1  | 6.33:1  |
| `success` on `success-soft`             | 7.18:1  | 8.35:1  |
| `warning` on `warning-soft`             | 6.97:1  | 8.30:1  |
| `destructive` on `destructive-soft`     | 5.63:1  | 7.28:1  |
| `input` (field edge) on `background`    | 3.22:1  | 4.15:1  |

Generated covers use four bookcloths in the same hue: deep ink, bright ink,
slate and pale ink (`cover-1` to `cover-4`), with `cover-paper` or `cover-ink`
for the lettering. A book is the same object in either theme, so the cloths do
not change with it. The lettering reaches 5.35:1 on `cover-2`, 6.25:1 on
`cover-3` and above 10:1 on the other two.

### Space, shape and elevation

- Spacing is Tailwind's 4px unit, and layouts use 4, 8, 12, 16, 24, 32, 48 and
  64px. A page is 32px from the header on phones and 48px from 640px. A list row
  has 16px of padding above and below and at the sides (24px at the sides from
  640px). The content column is 60rem wide (`max-w-page`) with 16px gutters on
  phones and 24px from 640px; the header and footer share it. Reading text is
  held to 40rem (`max-w-measure`), and narrow forms to 24rem (`max-w-sm`).
- Two radii, because every control, card and dialog is the same kind of rounded
  rectangle. `md` is 8px (buttons, fields, cards, lists, dialog, toast, the
  segmented track) and `sm` is 4px for what sits inside one (covers, keycaps,
  skeleton lines, the selected segment). `full` is for badges and dots.
- Elevation has three levels, and each starts with a one-pixel ring in `--edge`
  so a surface has an edge without a border. `shadow-raised` is for cards, lists
  and covers, `shadow-overlay` for a toast and `shadow-dialog` for a dialog. The
  shadow colour is the neutral hue at low lightness, never black, so a shadow
  looks like a darker patch of the page.
- Controls are 40px high (`h-control`) and 44px on touch screens
  (`pointer: coarse`). Fields are 44px at every width. Badges are 24px and sit
  inside a row, not as targets. A row's link stretches over the whole row, so
  the row is the target. The `pointer-fine:` variant shows hints that only make
  sense with a keyboard.
- Focus is a two-pixel `accent` outline two pixels outside every focusable
  element. A row's link draws it inside the row.

### Motion

| Use                          | Duration | Easing                                 |
| ---------------------------- | -------- | -------------------------------------- |
| Colour and background change | 120ms    | `ease-out` `cubic-bezier(.23,1,.32,1)` |
| A button's press             | 120ms    | Same, to `scale(.97)`                  |
| Dialog and toast appear      | 180ms    | Same, from 4px lower and `scale(.97)`  |
| Overlay fade                 | 180ms    | Same                                   |
| Skeleton pulse               | 2s loop  | `ease-in-out`, opacity 0.7 to 0.4      |

Motion confirms a response and never decorates, so nothing moves on its own
except a skeleton. The curve starts fast and settles, which reads as a reply to
a touch. Results dim 150ms after a search starts, so a fast answer never
flickers. `prefers-reduced-motion` turns every animation and transition off.

## Primitives

[`src/components/ui`](../src/components/ui) holds what screens are built from:

- `Button` and `buttonVariants`: `primary` (one per screen), `secondary`
  (bordered), `quiet` (no edge until hover) and `danger`; text or `icon` shape;
  also applied to links. Hover and press change the fill by one step and press
  scales by 3%; disabled is half opacity and ignores the pointer, so it shows no
  hover state.
- `Field`, `Input`, `Select` and `Textarea`, with the label above and the hint
  or error under the field. An invalid field turns its edge `destructive`, and
  its message starts with an alert icon, so the cue is not colour alone.
- `FormError`, a destructive-tint sentence with an alert icon for a refusal that
  belongs to a whole form, such as _Credenciales inválidas_. A refusal of one
  field goes through `Field`.
- `Segmented`, a set of mutually exclusive filters on a sunken track. It is a
  fieldset of native radios, so it is one tab stop and the arrow keys move and
  select. `SegmentedNav` is the same track made of links, for views that are
  their own URL: the current one carries `aria-current="page"`, and each link is
  a tab stop.
- `Disclosure`, a `details` whose summary is as tall as a control, with a
  chevron and an optional count, for detail few readers need. It opens in place
  and needs no script. Every folded section uses it: the book page, the profile,
  the donor list, the copy form and the staff lists of donors and locations.
- `Badge`, a soft-tinted pill in `neutral`, `accent`, `success`, `warning` or
  `destructive`, with an icon before the word.
- `Card`, a raised surface; `CardList` and `CardRow`, a raised list with a rule
  between rows. `rowLink`, the props that make one link cover its whole row so
  the row is one target without nesting other controls in a link.
- `Skeleton`, a pulsing block for a loading layout.
- `Empty`, a title, one sentence and at most one action. When it is the whole
  page, as for an error or a missing page, its title is the `h1`.
- `Page`, the width container, with `PageTitle` and `SectionTitle` for the
  headings in it.
- `Kbd`, a keycap for a shortcut hint. It is hidden on touch screens.
- `AlertDialog`, `Toast` and `Toaster`, over Radix.
- `ImageDropzone`, the file chooser of the cover manager.

[`Availability`](../src/components/catalogue/availability.tsx) is the one place
that words a title's state, as a badge: _Disponible_ or _2 de 3 disponibles_
(success, check), _No disponible_ (warning, clock) or _Sin ejemplares_ (neutral,
dash). The icon and the word carry the state, so colour never carries it alone.
[`BookCover`](../src/components/catalogue/book-cover.tsx) keeps a fixed 2:3
ratio (`aspect-cover`) with the 4px radius and `shadow-raised`. A stored image
uses `/media/`. Without one it draws a cloth binding: a colour picked from the
category, a darker band at the left edge for the spine, the title, a short rule
and the author at the foot. In a list row it shows only the title's first
letter.

## Patterns

- State lives in the URL. Search, category, availability and the desk's list,
  query and page are search parameters, so back, reload and a shared link return
  to the same screen.
- Typing searches after a short pause. The previous results stay on screen,
  dimmed, until the new ones arrive. The first load of a page shows a skeleton
  in the shape of what is coming: list rows on the catalogue, the cover, title
  and availability card on a book, and the same shape on each of "Mis libros",
  the loans desk, intake and the about page.
- A decision with a safe reverse has no confirmation. Returning a loan shows a
  toast with _Deshacer_ for eight seconds. Deleting a book or a copy, which
  cannot be reversed, asks first.
- Detail that few readers need sits one step away: the copies behind
  _Ejemplares_, the note on a request behind _Añadir una nota_, the account
  form, past loans, the books behind each donor.
- An empty list says why and offers the next step, never more than one.
- Errors stay next to the thing that failed. A toast confirms what happened. A
  refused name, reason, book, copy, donor, location, photo, role or return shows
  as a `FormError` under its field or above its button, in the row it belongs
  to, and what the person typed stays in place. The one exception is the undo of
  a return, whose row is already gone. A page that fails to load shows an
  `Empty` with _Reintentar_.
- A request or loan shows its state as a badge with the sentence for the next
  step under it: _Esperando respuesta_ (warning, clock), _Aprobado_ (success,
  check), _No aprobado_ and a loan's days overdue (destructive, X or alert).

## Donors page

A reader lands on the donors page from the footer or from the about page, and a
person who might give a book lands there to see whether giving is worth it. The
page therefore does three things in order, and the list of names is the last and
calmest of them.

1. It thanks. The title is a sentence, and the lead says how many people gave
   how many copies and what share of the collection that is. Under it, a row of
   figures shows copies, titles and, once a donated copy has been lent, how many
   times donated copies were borrowed. Every number is counted from the
   database.
2. It shows how to give: a card with three steps. Donors hold a name and an
   optional line and no contact data, so the steps are to bring the books to the
   ambiente 216, have the team register them, and be added to the list.
3. It lists the donors, most copies first. Each donor is one row with the name,
   and a count. A row is a `Disclosure` that opens in place to their line, if
   they left one, and the titles they gave, each a link to its book page. All
   names are visible, and the list stays short because the titles are folded.

With no donor the lead says that the first one will appear here, the figures are
not shown, and the list is an `Empty` that explains when names appear. The page
stays a single prose column, so the long state is the same layout with more
rows.

## Admin

The loans desk is built for the keyboard; its shortcuts are in
[borrowing](borrowing.md#loan-desk). Its two lists are a `SegmentedNav`, and a
destructive badge beside it counts the overdue loans. Keyboard hints appear only
where a keyboard exists. On a phone the five staff destinations sit on a second
row under the logo, because they do not fit beside it. Intake remembers the
librarian's last category in the browser. After a book is saved, a card shows
the spine code and puts focus on _Registrar otro_.

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
