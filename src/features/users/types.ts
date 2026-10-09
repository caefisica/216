import { user, borrowRequests } from "@/lib/db/schema";
import type { BookSummary, Copy } from "../books/types";

/** A user as the browser may see it: never the password hash. */
export type User = Omit<typeof user.$inferSelect, "passwordHash">;
type BorrowRequestRow = typeof borrowRequests.$inferSelect;

export interface BorrowRequest extends BorrowRequestRow {
  book: BookSummary | null;
  /** The copy a librarian assigned; null while the request is pending or rejected. */
  copy: Pick<Copy, "id" | "code" | "volume"> | null;
  user?: User;
}
