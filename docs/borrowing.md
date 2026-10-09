# Borrowing

A loan is a row in `borrow_requests`. Its `status` is one of `pending`,
`approved`, `rejected` or `returned`. A reader asks for a title; the loan binds
to one physical copy when it is approved. Copies and their states are described
in [catalogue](catalogue.md).

## Flow

1. A signed-in `user`, `librarian` or `admin` opens a title that is available
   (at least one copy is lendable) and presses the borrow button, optionally
   with a note. This calls `createBorrowRequest` in
   [`features/books/actions.ts`](../src/features/books/actions.ts) and inserts a
   `pending` request with no copy.
2. A librarian or admin opens the [loan desk](#loan-desk) and approves the
   request with `approveRequest` in
   [`features/loans/actions.ts`](../src/features/loans/actions.ts). The action
   takes the request and the chosen copy; the desk offers the lendable copies of
   the title and starts on the lowest-numbered one.
3. On approval the request gets `copyId`, `approvedDate`, a `dueDate` 14 days
   later and the approving librarian's id. A librarian can instead reject it
   with `rejectRequest`, which needs a reason of 1 to 300 characters. The reason
   is stored in `rejection_reason` and shown to the reader in the loan history
   on `/profile`.
4. When the copy comes back, a librarian or admin marks the loan returned with
   `returnLoan`, which sets the status to `returned` and `returnDate`. The loan
   keeps its `copyId` as history. A loan that is not `approved` cannot be
   returned.

Each step above is one guarded statement, so concurrent requests cannot
double-book a copy. A request that loses the race reports that the copy is
unavailable, and the desk refreshes so the librarian can pick another. The
conditions, the indexes behind them and the definition of a lendable copy are in
[Architecture](architecture.md#shared-state).

## Loan desk

`/admin/loans` is staff-only. The staff home page links to it and shows how many
requests are waiting and how many loans are overdue. The header links to it as
**Préstamos**, in the navigation bar from the `md` breakpoint up and in the
account menu on every width. The desk has two views, chosen by
`?view=requests|loans`, and 25 rows per page, chosen by `?page=`. A page past
the last one shows the last page.

- **Requests** (the default) lists `pending` requests oldest first: title and
  code, reader, note, the date requested and a decision. The decision is a
  choice of copy that starts on the lowest-numbered lendable copy, with its
  code, volume and place, plus **Aprobar** and **Rechazar**. Enter on the copy
  choice approves. **Rechazar** asks for the reason in the same row; Escape
  cancels it. A title with no lendable copy offers only **Rechazar**.
- **Loans** lists `approved` loans by due date, so the overdue ones come first.
  An overdue loan says how many days late it is in words. **Devolver** asks for
  confirmation before it returns the loan.

Which copies are offered is decided by `copyIsLendable`, the predicate defined
in [Architecture](architecture.md#shared-state); the desk does not repeat it.
After a decision the page refreshes and focus moves to the list. Dates are shown
in the `America/Lima` time zone. The queries and their plans are in
[database](database.md#loan-desk-queries).

The desk is built for a phone: below the `md` breakpoint each row becomes a
block with its labels beside the values. Every text colour is at least 4.5:1
against its background, the borders of controls at least 3:1, every control has
a visible or screen-reader label, state is never carried by colour alone, and
the motion rules in `globals.css` apply. The buttons in a row name the title and
the reader ("Aprobar X a nombre de R"), so rows can be told apart by a screen
reader. **Rechazar** refuses an empty reason before it calls the action.

## Favorites

`setHeart` adds or removes a row in `user_book_hearts` according to its
`hearted` argument, so pressing twice quickly cannot flip the state back.
`/favorites` lists the signed-in user's favorites.

## Statistics

The dashboard statistics come from
[`features/admin/repository.ts`](../src/features/admin/repository.ts). A book's
popularity score is its borrows times three plus its favorites, and books with a
score of 0 are left out. A borrow is a request that has an `approvedDate`, so
returned loans still count. The activity chart groups requests by the month they
were made, for the current month and the five before it. Its "returns" count
rows that have a `return_date`.
