# Borrowing

A loan is a row in `borrow_requests`. Its `status` is one of `pending`,
`approved`, `rejected` or `returned`. A reader asks for a title; the loan binds
to one physical copy when it is approved. Copies and their states are described
in [catalogue](catalogue.md).

## Flow

1. A signed-in reader with a verified email opens a title that is available (at
   least one copy is lendable) and presses **Solicitar préstamo**, optionally
   with a note. This calls `createBorrowRequest` in
   [`features/books/actions.ts`](../src/features/books/actions.ts) and inserts a
   `pending` request with no copy. Staff see **Editar libro** on the title
   instead of the request button.
2. A librarian or admin opens the [loan desk](#loan-desk) and approves the
   request with `approveRequest` in
   [`features/loans/actions.ts`](../src/features/loans/actions.ts). The action
   takes the request and the chosen copy; the desk offers the lendable copies of
   the title and starts on the lowest-numbered one.
3. On approval the request gets `copyId`, `approvedDate`, a `dueDate` 14 days
   later and the approving librarian's id. A librarian can instead reject it
   with `rejectRequest`, which needs a reason of 1 to 300 characters. The reason
   is stored in `rejection_reason` and shown to the reader on `/profile`.
4. When the copy comes back, a librarian or admin marks the loan returned with
   `returnLoan`, which sets the status to `returned` and `returnDate`. The loan
   keeps its `copyId` as history. A loan that is not `approved` cannot be
   returned. A mistaken return is undone with `reopenLoan`, which puts the loan
   back to `approved` unless its copy has been lent again since.

Each step above is one guarded statement, so concurrent requests cannot
double-book a copy. A request that loses the race reports that the copy is
unavailable, and the desk refreshes so the librarian can pick another. The
conditions, the indexes behind them and the definition of a lendable copy are in
[Architecture](architecture.md#shared-state).

## Loan desk

`/admin/loans` is staff-only. The header links to it as **Préstamos** for staff
on every width. It has two lists, **Solicitudes** and **Prestados**, each tab
with its count, chosen by `?view=requests|loans`, and 25 rows per page, chosen
by `?page=`. A page past the last one shows the last page. With no `view`, the
desk opens on the requests when any are pending and on the loans otherwise. When
a loan is overdue, the tabs say how many.

The search field has focus when the desk opens. It narrows the current list by
reader name or email, title, or copy code, and the text is kept in `?q=`.

- **Solicitudes** lists `pending` requests oldest first: title and code, reader,
  note, the date requested and the decision. The decision names the copy to
  fetch, the lowest-numbered lendable one with its code, volume and place. A
  choice appears only when the title has more than one lendable copy.
  **Aprobar** is the main button. **Rechazar** opens a field for the reason,
  which the reader sees; Escape closes it. A title with no lendable copy offers
  only **Rechazar**.
- **Prestados** lists `approved` loans by due date, so the overdue ones come
  first. An overdue loan says how many days late it is in words, with the
  reader's email. **Devolver** returns the loan at once and a toast offers
  **Deshacer** for eight seconds.

Keyboard: `/` focuses the search, Enter in the search presses the main button of
the row when exactly one row matches, and `↑` and `↓` move between the main
buttons of the list. After a decision, focus goes back to the search when it has
text, so the next reader's name can be typed over it, and to the list otherwise.

Which copies are offered is decided by `copyIsLendable`, the predicate defined
in [Architecture](architecture.md#shared-state); the desk does not repeat it.
Dates are shown in the `America/Lima` time zone. The queries and their plans are
in [database](database.md#loan-desk-queries).

Below the `md` breakpoint each row stacks its decision under the text. Every
text colour is at least 4.5:1 against its background, the borders of controls at
least 3:1, every control has a visible or screen-reader label, state is never
carried by colour alone, and the motion rules in `globals.css` apply. The
buttons in a row name the title and the reader, so rows can be told apart by a
screen reader.

## Favorites

`setHeart` adds or removes a row in `user_book_hearts` according to its
`hearted` argument, so pressing twice quickly cannot flip the state back. The
heart is on the title page. The saved titles are listed under **Guardados** on
`/profile`, each with its availability, which is the reason to save one.

## Mis libros

`/profile` is the reader's page. **Ahora** lists the requests that are waiting,
the loans in progress with the date to return them, and a request that was
rejected in the last 14 days with its reason. Each row has one line that says
where it stands. **Guardados** lists the favorites. **Anteriores** (returned
loans and older rejections) and **Cuenta** (the name, the only field a reader
can edit) are closed until opened.
