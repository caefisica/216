# Borrowing

A loan is a row in `borrow_requests`. Its `status` is one of `pending`,
`approved`, `rejected` or `returned`. A book's own `status` is `available`,
`borrowed` or `maintenance`.

## Flow

1. A signed-in `user`, `librarian` or `admin` opens a book that is `available`
   and presses the borrow button, optionally with a note. This calls
   `createBorrowRequest` in
   [`features/books/actions.ts`](../src/features/books/actions.ts) and inserts a
   `pending` request. The book stays `available`.
2. A librarian or admin sees pending requests in the **requests** tab of the
   dashboard on `/`, and approves or rejects each one through
   `updateBorrowStatus` in
   [`features/admin/actions.ts`](../src/features/admin/actions.ts).
3. On approval the request gets `approvedDate`, a `dueDate` 14 days later and
   the approving librarian's id, and the book becomes `borrowed`. On rejection
   only the status and librarian are set.
4. When the book comes back, a librarian or admin presses return on the loan in
   the **active loans** list in the loans (_Préstamos_) tab of the dashboard.
   This calls `returnLoan` in
   [`features/admin/actions.ts`](../src/features/admin/actions.ts), which sets
   the status to `returned` and `returnDate`, and the book becomes `available`
   again. A book a librarian has since moved to `maintenance` stays there. A
   loan that is not `approved` cannot be returned.

A request is refused unless the book is `available` and the user has no other
pending request for it. One insert statement checks the book and a unique index
checks the duplicate, so both hold even when requests arrive at once. Approving
or rejecting is refused unless the request is still `pending`. Approving changes
the request and the book in one batch that only matches an `available` book, so
two requests for one book cannot both be approved, and a crash cannot leave a
book `borrowed` with its request `pending`. The full state table is in
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
