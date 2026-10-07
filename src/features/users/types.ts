import { user, borrowRequests } from "@/lib/db/schema";
import type { BookDetailed } from "../books/types";

/** A user as the browser may see it: never the password hash. */
export type User = Omit<typeof user.$inferSelect, "passwordHash">;
type BorrowRequestRow = typeof borrowRequests.$inferSelect;

export interface BorrowRequest extends BorrowRequestRow {
  book: BookDetailed | null;
  user?: User;
}
