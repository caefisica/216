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

The server does not check that the book is still `available`, or that no other
request is pending, when a request is created or approved.

## Favorites

`toggleHeart` adds or removes a row in `user_book_hearts`. `/favorites` lists
the signed-in user's favorites.

## Statistics

The dashboard counts and ranks come from
[`features/admin/repository.ts`](../src/features/admin/repository.ts). A book's
popularity score is its approved borrows times three plus its favorites, and
books with a score of 0 are left out. The activity chart groups requests by the
month they were made, for the current month and the five before it. Its
"returns" count rows that have a `return_date`, which nothing in the app sets.
