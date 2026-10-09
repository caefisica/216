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
2. A librarian or admin sees pending requests in the **requests** tab of the
   dashboard on `/`, each with the lendable copies of its title, and approves or
   rejects each one through `updateBorrowStatus` in
   [`features/admin/actions.ts`](../src/features/admin/actions.ts). The copy
   selector starts on the lowest-numbered lendable copy. A request approved
   without a chosen copy takes that copy too.
3. On approval the request gets `copyId`, `approvedDate`, a `dueDate` 14 days
   later and the approving librarian's id. On rejection only the status and
   librarian are set.
4. When the copy comes back, a librarian or admin presses return on the loan in
   the **active loans** list in the loans (_Préstamos_) tab of the dashboard.
   This calls `returnLoan` in
   [`features/admin/actions.ts`](../src/features/admin/actions.ts), which sets
   the status to `returned` and `returnDate`. The loan keeps its `copyId` as
   history. A loan that is not `approved` cannot be returned.

A copy is lendable when its `status` is `present` and no `approved` loan names
it. Nothing stores "borrowed": returning a loan frees its copy because the loan
is no longer `approved`. A copy a librarian has moved to `maintenance` or
`missing` while it was on loan does not become lendable on return.

A request is refused unless the title has a lendable copy and the user has no
other pending request for it. One insert statement checks the copies and a
unique index checks the duplicate, so both hold even when requests arrive at
once. Approving or rejecting is refused unless the request is still `pending`.
Approving is one statement that only matches while the chosen copy belongs to
the title and is lendable, and a unique index on `copy_id` for `approved` loans
backs it, so two requests cannot be approved onto one copy. A request that loses
the race reports that the copy is unavailable. The full state table is in
[architecture](../architecture.md#shared-state).

## Favorites

`setHeart` adds or removes a row in `user_book_hearts` according to its
`hearted` argument, so pressing twice quickly cannot flip the state back.
`/favorites` lists the signed-in user's favorites.

## Statistics

The dashboard counts and ranks come from
[`features/admin/repository.ts`](../src/features/admin/repository.ts). A book's
popularity score is its borrows times three plus its favorites, and books with a
score of 0 are left out. A borrow is a request that has an `approvedDate`, so
returned loans still count. The activity chart groups requests by the month they
were made, for the current month and the five before it. Its "returns" count
rows that have a `return_date`.
